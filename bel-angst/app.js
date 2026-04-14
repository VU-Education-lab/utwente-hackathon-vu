// ── app.js ─────────────────────────────────────────────────────────────────
// Applicatielogica voor Bel-oefening.
// Importeert CONFIG en SCENARIOS; beheert alle state en UI-interacties.

import CONFIG, { OPENAI, AZURE, getProvider } from './config.js';
import { SCENARIOS, DIFFICULTY, buildInstruction } from './scenarios.js';

// ── STATE ──────────────────────────────────────────────────────────────────
const state = {
  scenario: null,
  difficulty: 'easy',
  pc: null,          // RTCPeerConnection
  dc: null,          // RTCDataChannel
  audioEl: null,     // HTMLAudioElement (AI stem)
  audioTrack: null,  // MediaStreamTrack (microfoon)
  callStartTime: null,
  turnCount: 0,
  liveAiEl: null,    // DOM-element voor lopende AI-beurt
  pendingUserEl: null,
  transcriptData: [],
  pttActive: false,
  transcriptVisible: false,
  ringtoneInterval: null,
  breathTimeout: null,
};

// ── INIT ───────────────────────────────────────────────────────────────────
export function init() {
  // Altijd het provider-keuzescherm tonen — vorige keuze pre-selecteren
  const saved = localStorage.getItem('bel_provider') || 'openai';
  document.querySelectorAll('.provider-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.provider === saved)
  );
  showScreen('screenProvider');
}

export function selectProvider(name) {
  CONFIG.switchProvider(name);
  // Update UI knoppen
  document.querySelectorAll('.provider-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.provider === name)
  );
  if (name === 'azure') {
    showBriefing();
  } else if (CONFIG.OPENAI_KEY) {
    showBriefing();
  } else {
    showScreen('screenSetup');
  }
}

// ── SCREENS ────────────────────────────────────────────────────────────────
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── SETUP ──────────────────────────────────────────────────────────────────
export function onKeyInput() {
  const val = document.getElementById('apiKey').value;
  document.getElementById('clearBtn').classList.toggle('visible', val.length > 0);
}

export function clearKey() {
  document.getElementById('apiKey').value = '';
  document.getElementById('clearBtn').classList.remove('visible');
}

export function forgetKey() {
  CONFIG.forgetKey();
  document.getElementById('apiKey').value = '';
  document.getElementById('forgetBtn').style.display = 'none';
  showScreen('screenProvider');
}

export function startSession() {
  const val = document.getElementById('apiKey').value.trim();
  if (!val.startsWith('sk-')) {
    document.getElementById('errorMsg').textContent = 'Voer een geldige API-sleutel in (begint met sk-)';
    return;
  }
  CONFIG.saveKey(val);
  document.getElementById('errorMsg').textContent = '';
  document.getElementById('forgetBtn').style.display = 'block';
  showBriefing();
}

// ── BRIEFING ───────────────────────────────────────────────────────────────
export function showBriefing() {
  state.scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  state.difficulty = 'easy';

  document.getElementById('briefEmoji').textContent = state.scenario.emoji;
  document.getElementById('briefName').textContent = state.scenario.name;
  document.getElementById('briefDesc').textContent = state.scenario.desc;
  document.getElementById('briefTip').innerHTML = state.scenario.tip;
  document.getElementById('briefTitle').textContent = 'Je belt zo naar…';

  document.querySelectorAll('.diff-btn').forEach((b, i) => b.classList.toggle('selected', i === 0));
  document.getElementById('breathBox').style.display = '';
  startBreathing();
  showScreen('screenBriefing');
}

export function setDifficulty(level, btn) {
  state.difficulty = level;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ── CALL ───────────────────────────────────────────────────────────────────
export function goToCall() {
  stopBreathing();

  document.getElementById('callerName').textContent = state.scenario.name;
  document.getElementById('callerSub').textContent = 'Klik om te bellen…';
  document.getElementById('callerEmoji').textContent = state.scenario.emoji;
  document.getElementById('avatarWrapper').className = 'avatar-wrapper dialing';
  document.getElementById('btnAnswer').disabled = false;
  document.getElementById('btnAnswer').style.display = 'flex';
  document.getElementById('pttWrap').classList.remove('visible');
  document.getElementById('btnStop').classList.remove('visible');
  document.getElementById('callErrorMsg').textContent = '';

  state.turnCount = 0;
  state.liveAiEl = null;
  state.pendingUserEl = null;
  state.transcriptData = [];

  showScreen('screenCall');
}

export async function answerCall() {
  startRingtone();
  document.getElementById('btnAnswer').disabled = true;
  document.getElementById('callerSub').textContent = 'Verbinden…';

  // Minimaal laten bellen voordat verbinding opgezet wordt
  await new Promise(r => setTimeout(r, CONFIG.RINGTONE_INTERVAL_MS * CONFIG.RINGTONE_MIN_RINGS));

  try {
    const instruction = buildInstruction(state.scenario, state.difficulty);

    // 1. Ephemeral token ophalen
    const tokenRes = await fetch(CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: CONFIG.tokenHeaders(CONFIG.OPENAI_KEY),
      body: JSON.stringify(CONFIG.tokenBody(CONFIG.REALTIME_MODEL, state.scenario.voice, instruction)),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      let msg = `API fout ${tokenRes.status}`;
      try { msg = JSON.parse(errText).error?.message || msg; } catch (_) {}
      throw new Error(msg);
    }

    const tokenData = await tokenRes.json();
    const ephemeralToken = CONFIG.extractToken(tokenData);
    if (!ephemeralToken) throw new Error('Geen token ontvangen — controleer je sleutel of Azure-configuratie');

    // 2. WebRTC opbouwen
    state.pc = new RTCPeerConnection();
    state.audioEl = document.createElement('audio');
    state.audioEl.autoplay = true;
    state.pc.ontrack = e => { state.audioEl.srcObject = e.streams[0]; };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: CONFIG.AUDIO_CONSTRAINTS });
    state.audioTrack = stream.getAudioTracks()[0];
    state.audioTrack.enabled = false;
    state.pc.addTrack(state.audioTrack, stream);

    // 3. DataChannel
    state.dc = state.pc.createDataChannel('oai-events');
    state.dc.onopen = () => {
      state.dc.send(JSON.stringify({
        type: 'session.update',
        session: {
          turn_detection: null,
          input_audio_transcription: { model: CONFIG.PROVIDER_NAME === 'azure' ? 'whisper' : 'whisper-1', language: CONFIG.TRANSCRIPTION_LANGUAGE },
        },
      }));
      state.dc.send(JSON.stringify({ type: 'response.create' }));
    };
    state.dc.onmessage = e => handleEvent(JSON.parse(e.data));

    // 4. SDP exchange
    const offer = await state.pc.createOffer();
    await state.pc.setLocalDescription(offer);

    const sdpRes = await fetch(CONFIG.SDP_URL(CONFIG.REALTIME_MODEL), {
      method: 'POST',
      headers: CONFIG.sdpHeaders(ephemeralToken),
      body: offer.sdp,
    });
    if (!sdpRes.ok) throw new Error(`SDP fout ${sdpRes.status}`);
    await state.pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });

    // 5. UI bijwerken
    stopRingtone();
    document.getElementById('btnAnswer').style.display = 'none';
    document.getElementById('pttWrap').classList.add('visible');
    document.getElementById('btnStop').classList.add('visible');
    document.getElementById('callerSub').textContent = state.scenario.sub;
    state.callStartTime = Date.now();

    // Toon live slider direct met neutrale startpositie
    const liveSection = document.getElementById('liveScoreSection');
    const liveThumb = document.getElementById('liveScoreThumb');
    const liveFill = document.getElementById('liveScoreFill');
    if (liveSection) {
      liveSection.style.display = 'flex';
      liveThumb.style.setProperty('transition', 'none');
      liveThumb.style.setProperty('left', '50%');
      liveFill.style.setProperty('width', '50%');
      liveThumb.textContent = '😐';
    }

  } catch (err) {
    stopRingtone();
    document.getElementById('btnAnswer').disabled = false;
    document.getElementById('callerSub').textContent = 'Klik om te bellen…';
    document.getElementById('callErrorMsg').textContent = err.message;
  }
}

// ── PTT ────────────────────────────────────────────────────────────────────
export function pttStart(e) {
  if (e) e.preventDefault();
  if (!state.audioTrack || state.pttActive) return;
  state.pttActive = true;
  state.audioTrack.enabled = true;
  if (state.dc?.readyState === 'open') {
    state.dc.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
  }
  document.getElementById('btnPtt').classList.add('pressed');
  document.getElementById('pttLabel').textContent = 'Loslaten als je klaar bent';
  document.getElementById('pttHint').textContent = '🔴 Luistert…';
  document.getElementById('pttHint').classList.add('active');
  document.getElementById('avatarWrapper').className = 'avatar-wrapper ptt-active';
}

export function pttStop(e) {
  if (e) e.preventDefault();
  if (!state.audioTrack || !state.pttActive) return;
  state.pttActive = false;
  state.audioTrack.enabled = false;

  if (state.dc?.readyState === 'open') {
    state.dc.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    state.dc.send(JSON.stringify({ type: 'response.create' }));
  }

  state.pendingUserEl = makeMsgEl('user', '…');
  state.transcriptData.push(state.pendingUserEl);

  document.getElementById('btnPtt').classList.remove('pressed');
  document.getElementById('pttLabel').textContent = 'Houd vast om te spreken';
  document.getElementById('pttHint').textContent = 'Wacht even — aan het woord…';
  document.getElementById('pttHint').classList.remove('active');
  document.getElementById('avatarWrapper').className = 'avatar-wrapper idle';
}

// ── EVENTS ─────────────────────────────────────────────────────────────────
function handleEvent(ev) {
  if (ev.type === 'response.audio.delta') {
    document.getElementById('avatarWrapper').className = 'avatar-wrapper speaking';
  }
  if (ev.type === 'response.audio.done') {
    document.getElementById('avatarWrapper').className = 'avatar-wrapper idle';
    document.getElementById('pttHint').textContent = 'Houd ingedrukt om te spreken';
  }
  // ── AI transcript (OpenAI: audio_transcript.delta/done | Azure: output_audio_transcript.done) ──
  if (ev.type === 'response.audio_transcript.delta' || ev.type === 'response.output_audio_transcript.delta') {
    if (!state.liveAiEl) {
      state.liveAiEl = makeMsgEl('ai', ev.delta || '');
      state.transcriptData.push(state.liveAiEl);
    } else {
      const el = state.liveAiEl.querySelector('.text');
      el.textContent = (el.textContent || '') + (ev.delta || '');
    }
  }
  if (ev.type === 'response.audio_transcript.done' || ev.type === 'response.output_audio_transcript.done') {
    const transcript = ev.transcript || ev.text || '';
    if (!state.liveAiEl && transcript) {
      state.liveAiEl = makeMsgEl('ai', transcript);
      state.transcriptData.push(state.liveAiEl);
    } else if (state.liveAiEl && transcript) {
      state.liveAiEl.querySelector('.text').textContent = transcript;
    }
    state.liveAiEl = null;
    state.turnCount++;
    if (state.turnCount >= 2) updateLiveScore();
  }
  // ── Gebruiker transcript (OpenAI: transcription.completed | Azure: conversation.item.added met complete status) ──
  if (ev.type === 'conversation.item.input_audio_transcription.completed') {
    const text = ev.transcript?.trim();
    if (text) {
      if (state.pendingUserEl) {
        state.pendingUserEl.querySelector('.text').textContent = text;
        state.pendingUserEl = null;
      } else {
        state.transcriptData.push(makeMsgEl('user', text));
      }
    }
    state.turnCount++;
    if (state.turnCount >= 2) updateLiveScore();
  }
  // Gebruikerstranscriptie — OpenAI en Azure
  if (ev.type === 'conversation.item.input_audio_transcription.delta') {
    if (state.pendingUserEl) {
      const el = state.pendingUserEl.querySelector('.text');
      if (el.textContent === '…') el.textContent = '';
      el.textContent += ev.delta || '';
    }
  }
  if (ev.type === 'conversation.item.input_audio_transcription.completed') {
    const text = ev.transcript?.trim();
    if (text && state.pendingUserEl) {
      state.pendingUserEl.querySelector('.text').textContent = text;
      state.pendingUserEl = null;
      state.turnCount++;
      if (state.turnCount >= 2) updateLiveScore();
    }
  }
  // Azure fallback: transcript zit soms in conversation.item.added content
  if (ev.type === 'conversation.item.added' && ev.item?.role === 'user') {
    const text = ev.item?.content?.find(c => c.transcript)?.transcript?.trim();
    if (text && state.pendingUserEl) {
      state.pendingUserEl.querySelector('.text').textContent = text;
      state.pendingUserEl = null;
      state.turnCount++;
      if (state.turnCount >= 2) updateLiveScore();
    }
  }
}

function makeMsgEl(role, text) {
  const d = document.createElement('div');
  d.className = `t-msg ${role}`;
  const name = role === 'ai' ? (state.scenario.sub.split(' — ')[0]) : 'Jij';
  d.innerHTML = `<span class="who">${name}</span><span class="text">${text}</span>`;
  return d;
}

// ── END CALL ───────────────────────────────────────────────────────────────
export function endCall() {
  const elapsed = state.callStartTime ? Math.floor((Date.now() - state.callStartTime) / 1000) : 0;
  cleanup();
  showReflection(elapsed);
}

function cleanup() {
  stopRingtone();
  clearTimeout(liveScoreDebounce);
  if (state.pc) { state.pc.close(); state.pc = null; }
  if (state.audioEl) { state.audioEl.srcObject = null; }
  if (state.audioTrack) { state.audioTrack.enabled = false; state.audioTrack = null; }
  state.liveAiEl = null;
  state.pendingUserEl = null;
  state.pttActive = false;
  // Verberg live slider
  const ls = document.getElementById('liveScoreSection');
  if (ls) ls.style.display = 'none';
  const lr = document.getElementById('liveScoreReden');
  if (lr) { lr.textContent = ''; lr.style.opacity = '0'; }
}

// ── REFLECTION ─────────────────────────────────────────────────────────────
function showReflection(elapsed) {
  document.getElementById('statDuur').textContent = formatTime(elapsed);
  document.getElementById('statBeurten').textContent = Math.ceil(state.turnCount / 2) || '—';

  const msgs = document.getElementById('transcriptMsgs');
  msgs.innerHTML = '';
  state.transcriptData.forEach(el => msgs.appendChild(el));
  state.transcriptData = [];

  state.transcriptVisible = false;
  document.getElementById('transcriptBox').classList.remove('visible');
  document.getElementById('transcriptToggleIcon').textContent = '▶';

  document.getElementById('feedbackBox').classList.remove('visible');
  document.getElementById('feedbackBox').innerHTML = '<div class="feedback-loading">Even geduld…</div>';
  const fb = document.getElementById('feedbackBtn');
  fb.disabled = false;
  fb.textContent = '🤖 AI-feedback op mijn gesprek';

  const fs = document.getElementById('feelSection');
  if (fs) {
    fs.style.display = 'none';
    const t = document.getElementById('feelThumb');
    const f = document.getElementById('feelFill');
    if (t) { t.style.transition = 'none'; t.style.left = '0%'; t.textContent = '😐'; }
    if (f) { f.style.transition = 'none'; f.style.width = '0%'; }
  }

  showScreen('screenReflection');
}

export function toggleTranscript() {
  state.transcriptVisible = !state.transcriptVisible;
  document.getElementById('transcriptBox').classList.toggle('visible', state.transcriptVisible);
  document.getElementById('transcriptToggleIcon').textContent = state.transcriptVisible ? '▼' : '▶';
}

export function nextRound() {
  showBriefing();
}

// ── AI FEEDBACK ────────────────────────────────────────────────────────────
export async function requestFeedback() {
  const btn = document.getElementById('feedbackBtn');
  const box = document.getElementById('feedbackBox');

  const msgs = document.getElementById('transcriptMsgs');
  const lines = Array.from(msgs.querySelectorAll('.t-msg')).map(el => {
    const who = el.querySelector('.who')?.textContent || '';
    const text = el.querySelector('.text')?.textContent || '';
    return `${who}: ${text}`;
  });

  if (lines.length < 2) {
    box.classList.add('visible');
    box.innerHTML = '<div class="feedback-loading">Geen transcript beschikbaar — het gesprek was te kort.</div>';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Feedback laden…';
  box.classList.add('visible');

  const prompt = `Je bent een coach die studenten helpt hun bel-angst te overwinnen. Analyseer het onderstaande telefoongesprek vanuit het perspectief van de student (rol "Jij").

Scenario: ${state.scenario.name} (${state.scenario.sub})
Moeilijkheidsgraad: ${DIFFICULTY[state.difficulty].label}

Transcript:
${lines.join('\n')}

Geef warme, eerlijke en concrete feedback. Focus UITSLUITEND op deze aspecten:
- **Spreektempo**: praatte de student te snel, te aarzelend, of juist goed?
- **Register**: gebruikte de student de juiste taal voor deze situatie? (formeel/informeel, vakjargon, woordkeuze)
- **Toon**: klonk de student beleefd, neutraal, of onbedoeld kortaf/ongemakkelijk?
- **Ongemak en schaamte**: waren er momenten van zichtbare onzekerheid, stiltes, onnodige excuses, of aarzelend taalgebruik?
- **Beleefdheid**: was de student gepast beleefd zonder overdreven te zijn?
- **Wat goed ging**: 2-3 concrete positieve punten als korte labels

Schrijf in het Nederlands. Wees direct maar aanmoedigend. Geen algemene opmerkingen — alleen wat écht in dit gesprek zat.

Antwoord ALLEEN in dit JSON-formaat (geen markdown, geen backticks):
{"score":0.7,"goed":["label1","label2"],"overkwam":"1-2 zinnen over toon en hoe de student overkwam","ongemak":"beschrijf concrete ongemakkelijke momenten, of null als er geen waren","tip":"één zeer concrete tip gericht op register, toon of tempo"}

score is 0.0 (heel slecht gesprek) tot 1.0 (uitstekend gesprek).`;

  try {
    const res = await fetch(CONFIG.FEEDBACK_URL, {
      method: 'POST',
      headers: CONFIG.feedbackHeaders(CONFIG.OPENAI_KEY),
      body: JSON.stringify({
        model: CONFIG.FEEDBACK_MODEL,
        max_tokens: CONFIG.FEEDBACK_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`API fout ${res.status}`);
    const data = await res.json();
    const fb = JSON.parse(data.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}');

    if (typeof fb.score === 'number') setSliderValue(fb.score);

    const goedPills = (fb.goed || []).map(g => `<span class="feedback-pill good">✓ ${g}</span>`).join('');
    const ongemakHTML = (!fb.ongemak || fb.ongemak === 'null')
      ? `<div class="feedback-text" style="color:var(--sage-dim)">Geen opvallende ongemakkelijke momenten.</div>`
      : `<div class="feedback-text">${fb.ongemak}</div>`;

    box.innerHTML = `
      <div class="feedback-block">
        <div class="feedback-label">✅ Wat goed ging</div>
        <div class="feedback-pill-row">${goedPills || '<span style="color:var(--muted);font-size:13px">—</span>'}</div>
      </div>
      <div class="feedback-block">
        <div class="feedback-label">🗣️ Hoe je overkwam</div>
        <div class="feedback-text">${fb.overkwam || '—'}</div>
      </div>
      <div class="feedback-block">
        <div class="feedback-label">⚠️ Ongemakkelijke momenten</div>
        ${ongemakHTML}
      </div>
      <div class="feedback-block">
        <div class="feedback-label">💡 Tip voor de volgende keer</div>
        <div class="feedback-pill-row"><span class="feedback-pill tip">${fb.tip || '—'}</span></div>
      </div>`;

    btn.textContent = '🔄 Opnieuw laden';
    btn.disabled = false;

    // Publieke callback voor integratie in omvattend systeem
    if (typeof window.BelOefening?.onComplete === 'function') {
      window.BelOefening.onComplete({
        scenario: state.scenario.id,
        difficulty: state.difficulty,
        score: fb.score,
        feedback: fb,
        duration: parseInt(document.getElementById('statDuur').textContent.replace(':', '')) || 0,
        turns: parseInt(document.getElementById('statBeurten').textContent) || 0,
        transcript: lines,
      });
    }

  } catch (err) {
    box.innerHTML = `<div class="feedback-loading" style="color:var(--red)">Kon feedback niet laden: ${err.message}</div>`;
    btn.textContent = '🤖 Opnieuw proberen';
    btn.disabled = false;
  }
}

// ── LIVE SCORE (tijdens gesprek) ───────────────────────────────────────────
let liveScoreDebounce = null;

async function updateLiveScore() {
  // Debounce: wacht 1s zodat niet elke letter een call triggert
  clearTimeout(liveScoreDebounce);
  liveScoreDebounce = setTimeout(async () => {
    const lines = state.transcriptData.map(el => {
      const who = el.querySelector('.who')?.textContent || '';
      const text = el.querySelector('.text')?.textContent || '';
      return `${who}: ${text}`;
    }).filter(l => !l.endsWith(': …'));

    if (lines.length < 2) return;

    const prompt = `Beoordeel kort dit telefoongesprek van een student. Let op: spreektempo (zichtbaar in tekst), register (formeel/informeel), toon, beleefdheid, ongemak en aarzelend taalgebruik.

Scenario: ${state.scenario.name}
Transcript tot nu toe:
${lines.join('\n')}

Geef ALLEEN een JSON object terug: {"score": 0.0, "reden": "3-5 woorden"}
score is 0.0 (heel slecht) tot 1.0 (uitstekend).
reden is een korte Nederlandse omschrijving van de doorslag gevende factor, bijvoorbeeld: "aarzelend taalgebruik", "duidelijk en direct", "te veel excuses", "goed register", "onduidelijk geformuleerd", "goede opbouw", "te formeel", "te informeel", "nerveus taalgebruik". Geen andere tekst.`;

    try {
      const res = await fetch(CONFIG.FEEDBACK_URL, {
        method: 'POST',
        headers: CONFIG.feedbackHeaders(CONFIG.OPENAI_KEY),
        body: JSON.stringify({
          model: CONFIG.FEEDBACK_MODEL,
          max_tokens: 20,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}');
      if (typeof parsed.score === 'number') {
        setSliderValue(parsed.score, true);
      }
      if (parsed.reden) {
        const el = document.getElementById('liveScoreReden');
        if (el) {
          el.style.opacity = '0';
          setTimeout(() => {
            el.textContent = parsed.reden;
            el.style.opacity = '1';
          }, 300);
        }
      }
    } catch (_) { /* stil falen — live score is niet kritiek */ }
  }, 1000);
}

// ── SCORE SLIDER ───────────────────────────────────────────────────────────
const FEEL_EMOJIS = ['😰', '😟', '😐', '🙂', '😊'];

export function setSliderValue(v, liveUpdate = false) {
  const val = Math.max(0, Math.min(1, v));
  const pct = val * 100;
  const emojiIdx = Math.min(4, Math.floor(val * 5));

  // Reflectiescherm slider
  const thumb = document.getElementById('feelThumb');
  const fill = document.getElementById('feelFill');
  const section = document.getElementById('feelSection');
  if (thumb) {
    if (!liveUpdate) {
      // Finale feedback: toon sectie, reset naar links, animeer naar score
      section.style.display = 'flex';
      thumb.style.transition = 'none';
      fill.style.transition = 'none';
      thumb.style.left = '0%';
      fill.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        thumb.style.transition = 'left 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)';
        fill.style.transition = 'width 0.9s ease';
        thumb.style.left = `${pct}%`;
        fill.style.width = `${pct}%`;
        thumb.textContent = FEEL_EMOJIS[emojiIdx];
      }));
    } else {
      // Live update: gewoon soepel naar nieuwe positie
      thumb.style.transition = 'left 1.2s ease';
      fill.style.transition = 'width 1.2s ease';
      thumb.style.left = `${pct}%`;
      fill.style.width = `${pct}%`;
      thumb.textContent = FEEL_EMOJIS[emojiIdx];
    }
  }

  // Live call-scherm slider
  const liveThumb = document.getElementById('liveScoreThumb');
  const liveFill = document.getElementById('liveScoreFill');
  const liveSection = document.getElementById('liveScoreSection');
  if (liveThumb) {
    liveSection.style.display = 'flex';
    liveThumb.style.setProperty('transition', 'left 1.2s ease');
    liveFill.style.setProperty('transition', 'width 1.2s ease');
    liveThumb.style.setProperty('left', `${pct}%`);
    liveFill.style.setProperty('width', `${pct}%`);
    liveThumb.textContent = FEEL_EMOJIS[emojiIdx];
  }
}

// ── RINGTONE ───────────────────────────────────────────────────────────────
function startRingtone() {
  stopRingtone();
  function playRing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const vol = ctx.createGain();
      vol.gain.value = CONFIG.RINGTONE_VOLUME;
      vol.connect(ctx.destination);
      CONFIG.RINGTONE_TONES.forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(vol);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      });
      setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1500);
    } catch (_) {}
  }
  playRing();
  state.ringtoneInterval = setInterval(playRing, CONFIG.RINGTONE_INTERVAL_MS);
}

function stopRingtone() {
  if (state.ringtoneInterval) { clearInterval(state.ringtoneInterval); state.ringtoneInterval = null; }
}

// ── BREATHING ──────────────────────────────────────────────────────────────
function startBreathing() { runBreathPhase('expand'); }

function runBreathPhase(phase) {
  const circle = document.getElementById('breathCircle');
  const sub = document.getElementById('breathSub');
  const phases = {
    expand:   { text: 'Inademen',   next: 'hold' },
    hold:     { text: 'Vasthouden', next: 'contract' },
    contract: { text: 'Uitademen',  next: 'expand' },
  };
  circle.textContent = phases[phase].text;
  sub.textContent = '4 seconden';
  circle.className = `breath-circle ${phase}`;
  state.breathTimeout = setTimeout(() => runBreathPhase(phases[phase].next), CONFIG.BREATH_PHASE_DURATION_MS);
}

function stopBreathing() {
  if (state.breathTimeout) { clearTimeout(state.breathTimeout); state.breathTimeout = null; }
}

export function skipBreath() {
  stopBreathing();
  document.getElementById('breathBox').style.display = 'none';
}

// ── KEYBOARD ───────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat && document.getElementById('screenCall').classList.contains('active')) {
    e.preventDefault();
    pttStart();
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space') pttStop();
});

// ── HELPERS ────────────────────────────────────────────────────────────────
function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── PUBLIEKE API (voor integratie in omvattend systeem) ────────────────────
window.BelOefening = window.BelOefening || {};
window.BelOefening.init = init;
window.BelOefening.setScenario = (id) => {
  const s = SCENARIOS.find(s => s.id === id);
  if (s) state.scenario = s;
};
window.BelOefening.setDifficulty = (level) => {
  if (DIFFICULTY[level]) state.difficulty = level;
};
