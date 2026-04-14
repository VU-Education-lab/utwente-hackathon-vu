// ConversationManager
// -------------------
// Drives N independent 1-on-1 chats between the user and each character.
//
// Design:
//  * No autonomous loop. Characters never speak unless the user speaks first.
//  * Each character has its OWN private chat history with the user. Characters
//    do not see each other's conversations and never address each other.
//  * The user "talks to" a character by looking at them in 3D and pressing
//    send. Routing happens in main.js via Scene.getLookedAtCharacter(); this
//    module just receives a character id and a message via talkTo().
//
// All callbacks are optional. The manager is dumb about UI; it just emits
// events.

import { logger } from '../util/logger.js';

export class ConversationManager {
  constructor({ client, scenario, callbacks = {} }) {
    this.client = client;
    this.scenario = scenario;
    this.callbacks = callbacks; // { onLine, onThinkingStart, onThinkingEnd, onError }

    // characterId -> Array<{role: 'user'|'assistant', content: string}>
    this.histories = new Map();
    for (const c of scenario.characters) this.histories.set(c.id, []);

    // We refuse to fire a second LLM call for the same character while one
    // is in flight. Different characters can be queried in parallel, but the
    // common case is one at a time.
    this._inflight = new Set();
  }

  // ---------- lifecycle (kept for main.js parity, mostly no-ops) ----------
  start() {
    logger.info('convo', 'start (1-on-1 mode)', {
      scenario: this.scenario.id,
      characters: this.scenario.characters.map((c) => `${c.id} (${c.name})`),
    });
  }
  stop() {}
  setPaused() {}

  /**
   * Wipe a character's chat history. If no id is given, wipes everyone.
   * Returns the number of message pairs removed across all affected histories.
   */
  rewindSeconds(_seconds, characterId = null) {
    let removed = 0;
    const ids = characterId ? [characterId] : [...this.histories.keys()];
    for (const id of ids) {
      const h = this.histories.get(id);
      if (h) {
        removed += h.length;
        this.histories.set(id, []);
      }
    }
    return removed;
  }

  /**
   * The user typed a message addressed to a specific character. Append it to
   * that character's private history, ask the LLM for a reply, and emit it.
   */
  async talkTo(characterId, text) {
    const t = (text || '').trim();
    if (!t) return;

    const character = this.scenario.characters.find((c) => c.id === characterId);
    if (!character) {
      logger.warn('convo', 'talkTo unknown character', { characterId });
      return;
    }
    if (this._inflight.has(characterId)) {
      logger.warn('convo', 'talkTo ignored — character already responding', { characterId });
      return;
    }

    const history = this.histories.get(characterId) || [];
    history.push({ role: 'user', content: t });
    this.histories.set(characterId, history);

    logger.info('convo', `user → ${character.name}`, { text: t, historyLen: history.length });

    this._inflight.add(characterId);
    this.callbacks.onThinkingStart?.(character);
    const t0 = performance.now();
    try {
      const messages = this._buildMessages(character, history);
      const raw = await this.client.chat(messages, {
        temperature: 0.9,
        maxTokens: 250,
        tag: character.name,
      });
      const cleaned = sanitize(raw, character.name);
      if (!cleaned) {
        logger.warn('speaker', `sanitize stripped everything for ${character.name}`, { raw });
        return;
      }

      history.push({ role: 'assistant', content: cleaned });
      // Cap history so prompts don't grow without bound.
      const MAX_TURNS = 24;
      if (history.length > MAX_TURNS) {
        history.splice(0, history.length - MAX_TURNS);
      }

      const entry = {
        speakerId: character.id,
        name: character.name,
        text: cleaned,
        ts: Date.now(),
      };
      logger.info('speaker', `${character.name} → ${cleaned}`, {
        ms: Math.round(performance.now() - t0),
      });
      this.callbacks.onLine?.(entry);
    } catch (err) {
      logger.error('speaker', `${character.name} failed`, err);
      this.callbacks.onError?.(err);
    } finally {
      this._inflight.delete(characterId);
      this.callbacks.onThinkingEnd?.(character);
    }
  }

  /**
   * Get a hint for what the user could say next to a specific character.
   * Falls back to a generic suggestion if no character is in focus.
   * Returns a single short string.
   */
  async getHint(characterId) {
    const { lines } = await this.getTips(characterId, { lineCount: 1, adviceCount: 0 });
    return lines[0] || '';
  }

  /**
   * Get coaching tips for what the user could say next, tailored to the
   * specific character they're talking to. Returns BOTH:
   *
   *   {
   *     lines:  ['...', '...', '...'],   // literal things the user could say,
   *                                      //   clickable in the UI
   *     advice: ['...', '...']           // general coaching observations,
   *                                      //   not lines to say verbatim
   *   }
   *
   * Both come from a single LLM call to keep latency low. Used by the in-game
   * tips panel — fired automatically each time a character finishes speaking
   * so the user always has both concrete options and a little coaching
   * context on screen.
   */
  async getTips(characterId, { lineCount = 3, adviceCount = 2 } = {}) {
    const character = characterId
      ? this.scenario.characters.find((c) => c.id === characterId)
      : null;

    const history = character ? this.histories.get(character.id) || [] : [];
    const recent = history
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'You' : character.name}: ${m.content}`)
      .join('\n');

    const charBlock = character
      ? `You're coaching the user through a one-on-one with ${character.name} (${character.role}).\n${character.name}'s personality: ${character.personality}`
      : `The user hasn't picked anyone to talk to yet.`;

    const wantLines = lineCount > 0;
    const wantAdvice = adviceCount > 0;

    const formatBlock = wantLines && wantAdvice
      ? `OUTPUT FORMAT: return ONE raw JSON object and NOTHING else. No prose, no preamble, no markdown, no code fences. The object must look exactly like:
{
  "lines": [${lineCount} short strings],
  "advice": [${adviceCount} short strings]
}`
      : wantLines
        ? `OUTPUT FORMAT: return ONE raw JSON object and NOTHING else. No prose, no preamble, no markdown, no code fences. The object must look exactly like: { "lines": [${lineCount} short strings], "advice": [] }`
        : `OUTPUT FORMAT: return ONE raw JSON object and NOTHING else. No prose, no preamble, no markdown, no code fences. The object must look exactly like: { "lines": [], "advice": [${adviceCount} short strings] }`;

    const linesGuidance = wantLines
      ? `"lines" — ${lineCount} short things the user could literally say next. ` +
        'Mix it up: at least one question they could ask, at least one direct ' +
        'answer to whatever the other person just said, and one small low-stakes ' +
        'reaction. Each must sound like something a normal person actually says ' +
        'out loud (yeah, oh nice, wait really, etc). NEVER therapist-speak, ' +
        "NEVER \"interesting question\" energy, NEVER more than 16 words each."
      : '';
    const adviceGuidance = wantAdvice
      ? `"advice" — ${adviceCount} short pieces of GENERAL coaching for this moment. ` +
        'NOT lines to say. Things like: a behavioural observation about the other ' +
        'person ("Marcus is short and precise — match his rhythm"), permission to ' +
        'pause ("It\'s ok to let a beat of silence sit"), a topic hook from what ' +
        'they just said ("They mentioned their dog — that\'s a safe follow-up"), ' +
        'or a body-language nudge ("A small nod is enough, you don\'t have to ' +
        'fill the silence"). Each under 18 words. Be specific to what just ' +
        'happened, not generic.'
      : '';

    const messages = [
      {
        role: 'system',
        content:
          'You are a kind, low-pressure social coach for someone with social anxiety. ' +
          'You see a real-time one-on-one conversation and produce two things at once: ' +
          'specific lines the user could literally say, AND general coaching advice ' +
          'about the moment.\n\n' +
          [linesGuidance, adviceGuidance].filter(Boolean).join('\n\n') +
          '\n\n' +
          formatBlock,
      },
      {
        role: 'user',
        content:
          `Scene: ${this.scenario.name}. ${this.scenario.blurb}\n` +
          `${charBlock}\n\n` +
          (recent
            ? `Recent exchange (most recent at bottom):\n${recent}\n\n`
            : '(no exchange yet — they would be starting fresh)\n\n') +
          `Return the JSON object now.`,
      },
    ];
    logger.info('tips', 'requesting tips', { characterId, lineCount, adviceCount });
    const raw = await this.client.chat(messages, {
      temperature: 0.85,
      maxTokens: 600,
      tag: 'tips',
    });
    return parseTipsObject(raw, lineCount, adviceCount);
  }

  /**
   * Return all conversation histories merged into a single readable transcript.
   * Returns empty string if no messages exist.
   */
  getAllHistory() {
    const lines = [];
    for (const c of this.scenario.characters) {
      const history = this.histories.get(c.id) || [];
      if (history.length === 0) continue;
      lines.push(`--- Conversation with ${c.name} (${c.role}) ---`);
      for (const m of history) {
        lines.push(`${m.role === 'user' ? 'You' : c.name}: ${m.content}`);
      }
      lines.push('');
    }
    return lines.join('\n').trim();
  }

  /**
   * Generate post-session feedback on the user's conversations.
   * Returns { strengths: string[], improvements: string[] }.
   * Each item is a short bullet that may quote the user's words.
   */
  async getFeedback() {
    const transcript = this.getAllHistory();
    if (!transcript) return { strengths: [], improvements: [] };

    const messages = [
      {
        role: 'system',
        content:
          'You are a kind, encouraging social coach reviewing a practice conversation that someone with social anxiety just had in a safe simulation. ' +
          'Give brief, specific feedback.\n\n' +
          '"strengths" — 2–3 things the user did well. Be specific: quote short fragments of what they actually said (use quotation marks). ' +
          'Examples: initiating conversation, asking follow-up questions, showing interest, using humor, being direct. Each under 20 words.\n\n' +
          '"improvements" — 2–3 gentle suggestions for next time. Frame positively ("try..." not "you failed to..."). ' +
          'You can quote what they said to illustrate, but keep it kind. Each under 20 words.\n\n' +
          'OUTPUT FORMAT: return ONE raw JSON object and NOTHING else. No prose, no markdown, no code fences. ' +
          'The object must look exactly like:\n' +
          '{ "strengths": [2-3 short strings], "improvements": [2-3 short strings] }',
      },
      {
        role: 'user',
        content:
          `Scene: ${this.scenario.name}. ${this.scenario.blurb}\n\n` +
          `Full conversation transcript:\n${transcript}\n\n` +
          'Return the JSON object now.',
      },
    ];

    const raw = await this.client.chat(messages, {
      temperature: 0.8,
      maxTokens: 800,
      tag: 'feedback',
    });
    return parseFeedbackObject(raw);
  }

  // ---------- helpers ----------
  _buildMessages(character, history) {
    const system = `
You are ${character.name}, ${character.role}.
Personality: ${character.personality}

You are in this scene: ${this.scenario.name}. ${this.scenario.blurb}

You are having a one-on-one conversation with ONE person (the user). No one
else is part of this conversation. Do not mention or speak for any other
character. Stay in character at all times.

OUTPUT RULES — read carefully:
- Output ONLY the words you literally say out loud, going straight into a
  text-to-speech engine.
- Reply in 1–2 short conversational sentences. Real speech, with natural
  filler words like "yeah", "I mean", "honestly" when it fits.
- NEVER include stage directions, body language, or tone notes. No (laughs),
  no *grins*, no [smiles], no "— she nods —".
- NEVER use markdown of any kind. No asterisks, underscores, backticks, or
  brackets.
- NEVER wrap your reply in quotes.
- NEVER prefix your reply with "${character.name}:" or any other name.
- NEVER break the fourth wall or mention being an AI.
- The first word of your reply must be the first word ${character.name} literally says.
`.trim();

    return [
      { role: 'system', content: system },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];
  }
}

// Strip everything that isn't dialogue: stage directions, markdown, name
// prefixes, wrapping quotes. We're aggressive on purpose — the cost of
// accidentally dropping a legitimate aside is far lower than the cost of
// the TTS engine reading "stumbles over words" out loud in a sad robot voice.
function sanitize(text, speakerName) {
  let t = String(text || '').trim();

  // 1. Remove "Name:" prefix the model sometimes adds.
  const namePrefix = new RegExp(`^\\s*${escapeRegExp(speakerName)}\\s*:\\s*`, 'i');
  t = t.replace(namePrefix, '');
  // Generic "Word:" prefix at the very start (but not mid-sentence colons).
  t = t.replace(/^[A-Z][a-zA-Z]{1,15}\s*:\s*/, '');

  // 2. Remove ALL parenthetical content anywhere in the line.
  t = t.replace(/\s*\([^)]*\)\s*/g, ' ');

  // 3. Remove ALL square-bracket content (e.g. "[laughs]", "[smiles]").
  t = t.replace(/\s*\[[^\]]*\]\s*/g, ' ');

  // 4. Remove markdown emphasis and any text between markers (almost always
  //    a stage direction like *grins* or *sighs*).
  t = t.replace(/\*\*[^*]*\*\*/g, ' ');
  t = t.replace(/\*[^*\n]+\*/g, ' ');
  t = t.replace(/__[^_]*__/g, ' ');
  t = t.replace(/_[^_\n]+_/g, ' ');
  t = t.replace(/~~[^~]+~~/g, ' ');
  t = t.replace(/[*_~`]/g, '');

  // 5. Remove em-dash stage directions like "— she nods —".
  t = t.replace(/\s[—–-]\s*[a-z][a-z ,'-]{1,30}\s*[—–-]\s/g, ' ');

  // 6. Remove leading/trailing wrapping quotes.
  t = t.replace(/^[\s"'`“”‘’]+/, '').replace(/[\s"'`“”‘’]+$/, '');
  if (/^["'`“‘].*["'`”’]$/.test(t)) {
    t = t.slice(1, -1).trim();
  }

  // 7. Strip meta preambles from instruction-tuned models.
  const metaPreambles = [
    /^(?:here(?:'s|\s+is|\s+are))\b[^.!?\n]{0,120}?[:\-—]\s*/i,
    /^(?:sure|okay|alright|got it|understood)[,.\s]*here[^.!?\n]{0,120}?[:\-—]\s*/i,
    /^following\s+(?:all\s+)?the\s+rules[^.!?\n]{0,80}?[:\-—]\s*/i,
    /^[A-Z][a-zA-Z]{1,15}\s+(?:says|replies|responds|answers)[,:]?\s*/i,
    /^as\s+[A-Z][a-zA-Z]{1,15}[,:]\s*/i,
  ];
  for (const r of metaPreambles) t = t.replace(r, '');
  t = t.replace(/[\s,]*following\s+(?:all\s+)?the\s+rules[\s.!?]*$/i, '');

  // 8. Collapse whitespace.
  t = t.replace(/\s{2,}/g, ' ').trim();

  // 9. Refuse meta-references that escaped the prompt.
  if (/\b(as an ai|i am an ai|language model|the prompt|stage direction)\b/i.test(t)) {
    return '';
  }

  // 10. Cap length.
  if (t.length > 280) t = t.slice(0, 277).trimEnd() + '…';
  return t;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse the LLM's tips response into { lines, advice }. The model is asked
 * for a JSON object, but instruction-tuned models routinely produce slightly
 * broken JSON. This walks the following ladder:
 *
 *   1. Strict JSON.parse on the first {...} block
 *   2. Repaired JSON.parse — fixes the common LLM malformations:
 *        bare keys missing the opening quote (`lines": [` → `"lines": [`)
 *        trailing commas before } or ]
 *        smart quotes
 *   3. Fall back to a bare array (legacy shape), parsed and repaired the same way
 *   4. Extract every double-quoted string and use those as lines (last resort,
 *      handles arbitrarily mangled JSON as long as the strings themselves
 *      are intact)
 *
 * This is robust enough that even responses like
 *   `{\nlines": [\n"Actually I was stuck...",\n"Could you explain..."`
 * (missing opening quote on the key, missing closing brackets) recover the
 * actual content instead of leaking JSON syntax into the UI.
 */
function parseTipsObject(raw, lineCount, adviceCount) {
  let text = String(raw || '').trim();

  // Strip code fences if present.
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // ---- Step 1 & 2: try to parse a JSON object (strict, then repaired) ----
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const obj = tryParseJson(objMatch[0]);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return {
        lines: cleanList(obj.lines, lineCount),
        advice: cleanList(obj.advice, adviceCount),
      };
    }
  }

  // ---- Step 3: maybe the model returned a bare array of lines ----
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const arr = tryParseJson(arrMatch[0]);
    if (Array.isArray(arr)) {
      return { lines: cleanList(arr, lineCount), advice: [] };
    }
  }

  // ---- Step 4: last resort — pull every double-quoted string out of the
  // raw response. This handles arbitrarily mangled JSON as long as the
  // string contents themselves are intact. We then drop anything that looks
  // like a JSON key (e.g. "lines", "advice"), structural noise, or is too
  // short to be a real tip.
  const quoted = extractQuotedStrings(text)
    .map(stripWrappingQuotes)
    .filter((s) => s && !looksLikeJsonNoise(s));
  if (quoted.length) {
    return { lines: quoted.slice(0, lineCount), advice: [] };
  }

  // Truly nothing usable. Return empty rather than leak garbage.
  return { lines: [], advice: [] };
}

/** Try strict JSON.parse, then a repaired version. Returns null on failure. */
function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {}
  try {
    return JSON.parse(repairJson(text));
  } catch {}
  return null;
}

/**
 * Patch up the LLM JSON malformations we see in the wild. Conservative —
 * only fixes things that make sense for the shape we're expecting.
 */
function repairJson(text) {
  let t = text;
  // 1. Smart quotes → straight quotes.
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // 2. Bare object keys missing the opening quote: `\n  lines": [`
  //    → `\n  "lines": [`. We require at least one whitespace/{/, before
  //    the key so we don't touch strings that legitimately end with `":`.
  t = t.replace(/([\{,\n]\s*)([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1"$2":');
  // 3. Trailing commas before } or ].
  t = t.replace(/,(\s*[}\]])/g, '$1');
  return t;
}

/** Extract every double-quoted string from a blob of (possibly broken) JSON. */
function extractQuotedStrings(text) {
  const out = [];
  // Match "..." with backslash-escapes allowed inside. Non-greedy.
  const re = /"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * True if a string is JSON structural noise that shouldn't end up as a tip:
 * the field-name keys we asked for, lone braces/brackets, or anything too
 * short to be a real spoken line.
 */
function looksLikeJsonNoise(s) {
  const t = s.trim().toLowerCase();
  if (!t) return true;
  if (t.length < 3) return true;
  if (t === 'lines' || t === 'advice') return true;
  if (/^[\{\}\[\],:]+$/.test(t)) return true;
  return false;
}

function cleanList(value, max) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || '').trim())
    .map(stripWrappingQuotes)
    .filter(Boolean)
    .slice(0, max);
}

function stripWrappingQuotes(s) {
  return String(s).replace(/^[“’`””’’]+|[“’`””’’]+$/g, '').trim();
}

/**
 * Parse the LLM's feedback response into { strengths, improvements }.
 * Uses the same recovery ladder as parseTipsObject.
 */
function parseFeedbackObject(raw) {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const obj = tryParseJson(objMatch[0]);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return {
        strengths: cleanList(obj.strengths, 3),
        improvements: cleanList(obj.improvements, 3),
      };
    }
  }

  // Last resort: extract quoted strings, split evenly
  const quoted = extractQuotedStrings(text)
    .map(stripWrappingQuotes)
    .filter((s) => s && !looksLikeJsonNoise(s) && s !== 'strengths' && s !== 'improvements');
  if (quoted.length) {
    const mid = Math.ceil(quoted.length / 2);
    return {
      strengths: quoted.slice(0, mid).slice(0, 3),
      improvements: quoted.slice(mid).slice(0, 3),
    };
  }

  return { strengths: [], improvements: [] };
}
