// Top-level controller. Owns the lifecycle of:
//   * the Three.js scene
//   * the conversation manager
//   * the TTS manager
//   * the UI / DOM
//   * the progress tracker
//
// Client calls the /api/* proxy (Azure Static Web Apps Function) instead of
// talking to Azure OpenAI / ElevenLabs directly. Keys live in Application
// Settings on the Function and never reach the browser bundle. See
// ./ai/AzureOpenAIClient.js and ../SECURITY.md.

import { Scene3D } from './scene/Scene.js';
import { AzureOpenAIClient } from './ai/AzureOpenAIClient.js';
import { ConversationManager } from './ai/ConversationManager.js';
import { TTSManager } from './audio/TTSManager.js';
import { STTManager } from './audio/STTManager.js';
import { Progress } from './state/Progress.js';
import { UI } from './ui/UI.js';
import { getScenario } from './scenarios/scenarios.js';
import { logger } from './util/logger.js';

const env = import.meta.env;
const appTitle = env.VITE_APP_TITLE || 'Social Sim';
const appUrl = env.VITE_APP_URL || 'http://localhost:5173';

logger.info('boot', 'social-sim starting', {
  apiBase: env.VITE_API_BASE || '/api',
  appTitle,
  appUrl,
});

const client = new AzureOpenAIClient({
  // Optional: if set, sent as `model` in the body; otherwise the proxy's
  // server-side default AZURE_OPENAI_DEPLOYMENT is used.
  deployment: env.VITE_AZURE_OPENAI_DEPLOYMENT || '',
});
const tts = new TTSManager();
const stt = new STTManager();
const progress = new Progress();
const ui = new UI({ progress });

const scene = new Scene3D(document.getElementById('three-canvas'));
scene.start();

let convo = null;
let currentScenario = null;
let sessionStartedAt = 0;
let frameLoopHandle = null;
// Bumped on every user send and every new character line; in-flight tips
// requests check this so a stale fetch can't overwrite fresher tips.
let tipsGeneration = 0;

// Tell the user if they're missing a key.
if (!client.isReady()) {
  ui.showApiWarning();
}

// ---------- UI events ----------
ui.on('startScenario', (id) => startScenario(id));
ui.on('sendMessage', (text) => deliverUserMessage(text));

// ---------- voice input (push-to-talk via mic button) ----------
let micBusy = false;
ui.on('toggleMic', async () => {
  if (!convo || micBusy) return;
  if (!stt.isReady()) {
    ui.showHint('Voice input is not available in this browser.');
    ui.setMicState('unavailable');
    return;
  }

  if (stt.isRecording()) {
    // ---- Stop & transcribe ----
    micBusy = true;
    ui.setMicState('transcribing');
    try {
      const transcript = await stt.stop();
      if (transcript) {
        deliverUserMessage(transcript);
      } else {
        ui.showHint("I didn't catch that — try again, a bit louder or longer.");
      }
    } catch (err) {
      logger.error('lifecycle', 'STT failed', err);
      ui.showHint('Voice input failed. You can still type.');
    } finally {
      ui.setMicState('idle');
      micBusy = false;
    }
    return;
  }

  // ---- Start recording ----
  try {
    await stt.start();
    ui.setMicState('recording');
  } catch (err) {
    logger.warn('lifecycle', 'mic start failed', { error: err?.message });
    ui.showHint('Microphone permission was blocked. Allow mic access to talk.');
    ui.setMicState('idle');
  }
});

/**
 * Deliver a final user message (whether typed or spoken) into the world.
 * Routes via gaze: messages go to whichever character the player is
 * currently aiming at, or get discarded with a hint if no one is in focus.
 */
function deliverUserMessage(text) {
  if (!convo) return;
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  const target = scene.getLookedAtCharacter();
  if (!target) {
    ui.showHint('Look at someone to talk to them.');
    return;
  }
  logger.info('user', 'sent message', { text: trimmed, to: target.id });
  // Echo the user's line in the transcript and let other characters notice
  // the user has the floor (purely a gaze/animation cue).
  ui.pushLine({
    speakerId: 'user',
    name: 'You',
    text: trimmed,
    ts: Date.now(),
    isUser: true,
  });
  ui.showSpeechLabel({ characterId: 'user', name: 'You', text: trimmed, isUser: true });
  scene.setCurrentSpeaker('user');
  setTimeout(() => {
    if (scene.currentSpeakerId === 'user') scene.setCurrentSpeaker(null);
  }, 2000);
  // Wipe stale tips while the character composes a reply. The new tips
  // arrive automatically when their reply finishes via requestTipsFor().
  tipsGeneration++;
  ui.clearTips('Waiting for a reply…');
  convo.talkTo(target.id, trimmed);
}
ui.on('requestHint', async () => {
  if (!convo) return;
  if (!client.isReady()) {
    ui.showHint("Try a small, low-stakes opener — say hi, or ask a one-word follow-up like 'really?' or 'how come?'");
    return;
  }
  const target = scene.getLookedAtCharacter();
  ui.showHint('Thinking…');
  try {
    const hint = await convo.getHint(target?.id || null);
    ui.showHint(hint);
  } catch (e) {
    ui.showHint('Try something tiny: a smile, a one-word reaction, or just say hi.');
  }
});
ui.on('togglePause', () => togglePause());
ui.on('rewind', () => doRewind());
ui.on('toggleMute', () => {
  ui.setMuted(!ui.muted);
  tts.setMuted(ui.muted);
});
// Quitting from gameplay (back button or pause-overlay "Leave scene") finishes
// the session and shows the debrief. The debrief screen has its own button
// for actually returning to the title.
ui.on('quit', () => endScenario({ showDebrief: true }));
ui.on('leaveToTitle', () => returnToTitle());
ui.on('debriefAgain', () => {
  if (!currentScenario) return;
  const id = currentScenario.id;
  returnToTitle();
  startScenario(id);
});

// ---------- scenario lifecycle ----------
async function startScenario(id) {
  const scenario = getScenario(id);
  if (!scenario) return;
  logger.info('lifecycle', 'startScenario', {
    id,
    name: scenario.name,
    difficulty: scenario.difficulty,
  });
  currentScenario = scenario;
  sessionStartedAt = Date.now();
  ui.showGame(scenario);
  ui.setApproachStatus('Loading avatars…', false);

  try {
    await scene.loadScenario(scenario);
  } catch (err) {
    logger.error('lifecycle', 'Failed to load avatar models', { error: err.message });
    ui.setApproachStatus('Failed to load character models. Check console.', false);
    return;
  }
  // Spawn name tags up front so people know who's who
  for (const c of scenario.characters) ui.ensureNameTag(c.id, c.name);

  // Mic button visibility — only enable if an ElevenLabs key is configured.
  ui.setMicState(stt.isReady() ? 'idle' : 'unavailable');

  // Reset the tips panel — every new scene starts empty.
  ui.clearTips('Walk up to someone and look at them. Tips will show up here after they speak.');

  if (client.isReady()) {
    convo = new ConversationManager({
      client,
      scenario,
      callbacks: {
        onLine: handleNewLine,
        onThinkingStart: (speaker) => ui.setThinking(speaker.name),
        onThinkingEnd: () => ui.setThinking(null),
        onError: (err) => {
          logger.warn('lifecycle', 'OpenRouter error surfaced to UI', {
            message: err?.message || String(err),
            status: err?.status,
          });
          ui.setThinking(null);
          // For fatal-looking auth/quota errors, surface a friendly note in
          // the transcript so the user understands why nothing happened.
          const status = err?.status;
          if (status === 401 || status === 402 || status === 429) {
            const friendly = friendlyHaltMessage(err);
            ui.pushLine({
              speakerId: 'system',
              name: 'system',
              text: friendly,
              isSystem: true,
              ts: Date.now(),
            });
          }
        },
      },
    });
    convo.start();
  } else {
    logger.warn('lifecycle', 'no API key — characters will be silent');
    convo = null;
  }

  startFrameLoop();
}

function endScenario({ showDebrief = true } = {}) {
  if (!currentScenario) return;

  const durationSec = Math.round((Date.now() - sessionStartedAt) / 1000);
  progress.recordSession(currentScenario.id);

  // Kick off feedback generation before tearing down the conversation manager.
  // The promise is handed to the UI so the debrief can show a loading state
  // and render feedback when it arrives.
  let feedbackPromise = null;
  if (convo && client.isReady()) {
    const transcript = convo.getAllHistory();
    if (transcript) {
      feedbackPromise = convo.getFeedback().catch((err) => {
        logger.warn('lifecycle', 'feedback generation failed', { error: err?.message });
        return null;
      });
    }
  }

  // Stop conversation + audio + HUD updates. The Three.js render loop keeps
  // running so the scene doesn't flicker behind the debrief overlay.
  if (convo) {
    convo.stop();
    convo = null;
  }
  tts.stopAll();
  // Drop the mic stream so the OS-level "recording" indicator goes away.
  stt.release();
  ui.setMicState('idle');
  stopFrameLoop();

  if (showDebrief) {
    ui.showDebrief({
      scenario: currentScenario,
      durationSec,
      feedbackPromise,
    });
    // Keep currentScenario set — debriefAgain needs the id.
  } else {
    returnToTitle();
  }
}

function returnToTitle() {
  ui.hideDebrief();
  ui.showTitle();
  currentScenario = null;
}

// ---------- per-frame UI loop ----------
function startFrameLoop() {
  stopFrameLoop();
  const tick = () => {
    updateHud();
    frameLoopHandle = requestAnimationFrame(tick);
  };
  frameLoopHandle = requestAnimationFrame(tick);
}
function stopFrameLoop() {
  if (frameLoopHandle) cancelAnimationFrame(frameLoopHandle);
  frameLoopHandle = null;
}

function updateHud() {
  if (!currentScenario) return;
  // The status bar reflects the conversational target — i.e. whoever
  // the user is currently aiming at. Sending a message routes to this person.
  const lookAt = scene.getLookedAtCharacter();
  if (lookAt) {
    ui.setApproachStatus(`Talking to: ${lookAt.name}`, true);
  } else {
    ui.setApproachStatus('Look at someone to talk to them.', false);
  }

  // Position floating labels
  for (const c of scene.characters.values()) {
    const head = c.getHeadWorldPosition();
    const screen = scene.worldToScreen(head);
    ui.positionNameTag(c.id, screen, c.isInRange);
    ui.positionSpeechLabel(c.id, screen);
  }
  ui.cullExpiredSpeechLabels();
}

// ---------- new line of dialogue ----------
// Only character lines flow through here — user lines are echoed inline by
// the sendMessage handler before the LLM call even fires.
function handleNewLine(entry) {
  ui.pushLine(entry);

  if (entry.isSystem || entry.isUser) return;

  // It's a character speaking
  const char = scene.characters.get(entry.speakerId);
  const scenarioChar = currentScenario.characters.find((c) => c.id === entry.speakerId);
  if (!char || !scenarioChar) return;

  ui.showSpeechLabel({
    characterId: entry.speakerId,
    name: entry.name,
    text: entry.text,
  });

  // Tell the scene who's speaking so the other characters turn toward them.
  scene.setCurrentSpeaker(entry.speakerId);

  // Animate + voice
  char.setTalking(true);
  tts.speak({
    text: entry.text,
    elevenVoiceId: scenarioChar.elevenVoiceId,
    characterId: entry.speakerId,
    onStart: () => {},
    onEnd: () => {
      char.setTalking(false);
      // Release the "current speaker" lock so idle gaze rotation can resume,
      // unless someone else has taken over in the meantime.
      if (scene.currentSpeakerId === entry.speakerId) {
        scene.setCurrentSpeaker(null);
      }
      // Now that the character has stopped talking, fetch fresh tips for
      // what the user could say next. We refresh the panel even if the user
      // has it collapsed — they may expand it to peek without paying a
      // re-fetch cost.
      requestTipsFor(entry.speakerId);
    },
  });
}

// ---------- tips ----------
// `tipsGeneration` is declared at module top. We bump it every time the
// user sends a message OR a new line arrives, so an in-flight tips request
// that completes against a stale conversation gets thrown away instead of
// overwriting fresher tips.
async function requestTipsFor(characterId) {
  if (!convo) return;
  const myGen = ++tipsGeneration;
  ui.showTipsLoading();
  try {
    const tips = await convo.getTips(characterId, { lineCount: 3, adviceCount: 2 });
    if (myGen !== tipsGeneration) return; // stale, drop
    const hasAny = (tips?.lines?.length || 0) + (tips?.advice?.length || 0) > 0;
    if (!hasAny) {
      ui.clearTips('No suggestions right now — try saying whatever comes to mind.');
    } else {
      ui.setTips(tips);
    }
  } catch (err) {
    if (myGen !== tipsGeneration) return;
    logger.warn('lifecycle', 'tips request failed', { error: err?.message });
    ui.clearTips('Could not load suggestions. Just type whatever feels natural.');
  }
}

// ---------- pause / rewind ----------
function togglePause() {
  const next = !ui.paused;
  ui.setPaused(next);
  scene.setMovementEnabled(!next);
  if (convo) convo.setPaused(next);
  if (next) tts.stopAll();
}

function friendlyHaltMessage(err) {
  const status = err?.status;
  if (status === 429) {
    return (
      'Azure OpenAI rate limit hit. The room will stay quiet for a moment — either ' +
      'wait for the quota window to reset, or check your deployment\'s tokens-per-minute ' +
      'limit in the Azure portal.'
    );
  }
  if (status === 401 || status === 403) {
    return 'The chat proxy rejected the request. An admin should check the Azure OpenAI keys on the Static Web App.';
  }
  return `AI conversation halted: ${err?.message || err}`;
}

function doRewind() {
  if (!convo) return;
  // With per-character private histories there's no shared timeline to walk
  // back, so rewind wipes every character's memory and clears the on-screen
  // transcript. The user effectively gets a clean slate to try again.
  const removed = convo.rewindSeconds(30);
  ui.clearTranscript();
  ui.showHint(
    removed > 0
      ? 'Conversation cleared. Try a different opener.'
      : 'Nothing to rewind yet — start a conversation first.'
  );
  if (ui.paused) togglePause();
}
