// All DOM wiring for the title screen, the in-game HUD, the transcript,
// the tips panel, the hint bubble, and the overlays.
//
// This module owns nothing about Three.js or AI — it just emits events when
// the user clicks buttons, and exposes setters the controller can call.

import { SCENARIOS } from '../scenarios/scenarios.js';

export class UI {
  constructor({ progress }) {
    this.progress = progress;
    this.callbacks = {};

    // Cache DOM
    this.titleScreen = document.getElementById('title-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.scenarioGrid = document.getElementById('scenario-grid');
    this.sceneName = document.getElementById('scene-name');
    this.sceneSub = document.getElementById('scene-sub');
    this.tipsPanel = document.getElementById('tips-panel');
    this.tipsList = document.getElementById('tips-list');
    this.tipsAdvice = document.getElementById('tips-advice');
    this.tipsLinesSection = document.getElementById('tips-lines-section');
    this.tipsAdviceSection = document.getElementById('tips-advice-section');
    this.tipsEmpty = document.getElementById('tips-empty');
    this.btnTipsToggle = document.getElementById('btn-tips-toggle');
    this.tipsCollapsed = false;
    this.transcriptList = document.getElementById('transcript-list');
    this.hintBubble = document.getElementById('hint-bubble');
    this.hintBody = document.getElementById('hint-body');
    this.input = document.getElementById('message-input');
    this.btnSend = document.getElementById('btn-send');
    this.btnHint = document.getElementById('btn-hint');
    this.btnMic = document.getElementById('btn-mic');
    this.approachStatus = document.getElementById('approach-status');
    this.btnPause = document.getElementById('btn-pause');
    this.btnRewind = document.getElementById('btn-rewind');
    this.btnMute = document.getElementById('btn-mute');
    this.btnBack = document.getElementById('btn-back');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.btnResume = document.getElementById('btn-resume');
    this.btnRewindOverlay = document.getElementById('btn-rewind-overlay');
    this.btnQuit = document.getElementById('btn-quit');
    this.debriefOverlay = document.getElementById('debrief-overlay');
    this.debriefStats = document.getElementById('debrief-stats');
    this.debriefFeedback = document.getElementById('debrief-feedback');
    this.btnDebriefAgain = document.getElementById('btn-debrief-again');
    this.btnDebriefHome = document.getElementById('btn-debrief-home');
    this.apiWarning = document.getElementById('api-warning');
    this.btnDismissWarning = document.getElementById('btn-dismiss-warning');

    // Floating speech labels in 3D space
    this.speechLabels = new Map(); // characterId -> {el, text}
    this.nameTags = new Map(); // characterId -> el

    this.muted = false;
    this.paused = false;

    this._renderScenarioGrid();
    this._bindButtons();
  }

  on(event, fn) {
    this.callbacks[event] = fn;
  }
  _emit(event, ...args) {
    this.callbacks[event]?.(...args);
  }

  // ---------- screens ----------
  showTitle() {
    this.titleScreen.classList.add('visible');
    this.gameScreen.classList.remove('visible');
    // Re-render grid in case progress changed
    this._renderScenarioGrid();
  }

  showGame(scenario) {
    this.titleScreen.classList.remove('visible');
    this.gameScreen.classList.add('visible');
    this.sceneName.textContent = scenario.name;
    this.sceneSub.textContent = scenario.sub;
    this.clearTranscript();
    this._clearSpeechLabels();
    this._clearNameTags();
    this.hideHint();
    this.input.value = '';
    this.input.focus();
  }

  showApiWarning() {
    this.apiWarning.classList.remove('hidden');
  }

  // ---------- tips ----------
  // The tips panel shows two sections:
  //
  //   1. Things you could say — clickable. Click drops the line into the
  //      message input, ready to edit or send.
  //   2. General tips — coaching observations about the moment, NOT lines
  //      to say verbatim. Read-only.
  //
  // Both sections are refreshed in lockstep each time the character the
  // user is talking to finishes a line.

  /**
   * Replace both tip sections. Accepts either:
   *   { lines: string[], advice: string[] }   (preferred shape)
   *   string[]                                (legacy — treated as `lines`)
   */
  setTips(tips) {
    if (!this.tipsList) return;
    const lines = Array.isArray(tips)
      ? tips.filter(Boolean)
      : Array.isArray(tips?.lines)
        ? tips.lines.filter(Boolean)
        : [];
    const advice = Array.isArray(tips?.advice) ? tips.advice.filter(Boolean) : [];

    // Clickable lines section.
    this.tipsList.innerHTML = '';
    if (lines.length) {
      for (const tip of lines) {
        const li = document.createElement('li');
        li.textContent = tip;
        li.title = 'Click to use this line';
        li.addEventListener('click', () => {
          this.input.value = tip;
          this.input.focus();
        });
        this.tipsList.appendChild(li);
      }
    }
    this.tipsLinesSection.hidden = lines.length === 0;

    // Read-only advice section.
    this.tipsAdvice.innerHTML = '';
    if (advice.length) {
      for (const tip of advice) {
        const li = document.createElement('li');
        li.textContent = tip;
        this.tipsAdvice.appendChild(li);
      }
    }
    this.tipsAdviceSection.hidden = advice.length === 0;

    // Hide the empty-state if we have anything to show.
    const hasContent = lines.length > 0 || advice.length > 0;
    this.tipsEmpty.style.display = hasContent ? 'none' : '';
  }

  /** Show a transient "thinking" placeholder while a tips request is in flight. */
  showTipsLoading() {
    if (!this.tipsList) return;
    this.tipsEmpty.style.display = 'none';
    this.tipsAdviceSection.hidden = true;
    this.tipsLinesSection.hidden = false;
    this.tipsList.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'tips-loading';
    li.textContent = 'Thinking of a few things you could say…';
    this.tipsList.appendChild(li);
  }

  /** Wipe both tip sections back to the empty placeholder. */
  clearTips(message) {
    if (!this.tipsList) return;
    this.tipsList.innerHTML = '';
    this.tipsAdvice.innerHTML = '';
    this.tipsLinesSection.hidden = true;
    this.tipsAdviceSection.hidden = true;
    if (this.tipsEmpty) {
      if (message) this.tipsEmpty.textContent = message;
      this.tipsEmpty.style.display = '';
    }
  }

  /** Toggle the tips panel between expanded and collapsed states. */
  setTipsCollapsed(collapsed) {
    this.tipsCollapsed = Boolean(collapsed);
    if (!this.tipsPanel) return;
    this.tipsPanel.classList.toggle('collapsed', this.tipsCollapsed);
    if (this.btnTipsToggle) {
      this.btnTipsToggle.setAttribute('aria-expanded', this.tipsCollapsed ? 'false' : 'true');
      this.btnTipsToggle.title = this.tipsCollapsed ? 'Show tips' : 'Hide tips';
    }
  }

  // ---------- approach status ----------
  setApproachStatus(text, inRange, { force = false } = {}) {
    // If a thinking indicator is currently showing, don't overwrite it,
    // unless `force` is set (for permanent halt messages).
    if (this._thinkingText && !force) return;
    if (force) this._thinkingText = null;
    this.approachStatus.textContent = text;
    this.approachStatus.classList.toggle('in-range', inRange);
  }

  setThinking(speakerName) {
    if (speakerName) {
      this._thinkingText = `${speakerName} is thinking…`;
      this.approachStatus.textContent = this._thinkingText;
      this.approachStatus.classList.add('in-range');
    } else {
      this._thinkingText = null;
    }
  }

  // ---------- transcript ----------
  pushLine(entry) {
    const line = document.createElement('div');
    line.className = 'line ' + (entry.isUser ? 'user' : entry.isSystem ? 'system' : 'npc') + ' recent';
    line.innerHTML = `<div class="who">${escapeHtml(entry.name)}</div><div class="text">${escapeHtml(entry.text)}</div>`;
    this.transcriptList.appendChild(line);
    this.transcriptList.scrollTop = this.transcriptList.scrollHeight;
    setTimeout(() => line.classList.remove('recent'), 1500);

    // Trim — keep last 30
    while (this.transcriptList.children.length > 30) {
      this.transcriptList.removeChild(this.transcriptList.firstChild);
    }
  }

  clearTranscript() {
    this.transcriptList.innerHTML = '';
  }

  // ---------- speech labels ----------
  showSpeechLabel({ characterId, name, text, isUser }) {
    let entry = this.speechLabels.get(characterId);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'speech-label' + (isUser ? ' user-line' : '');
      this.gameScreen.appendChild(el);
      entry = { el };
      this.speechLabels.set(characterId, entry);
    }
    entry.el.innerHTML = `<div class="who-mini">${escapeHtml(name)}</div>${escapeHtml(text)}`;
    entry.expiresAt = Date.now() + Math.max(2200, text.length * 60);
  }

  /** Position speech labels at their character's head each frame. */
  positionSpeechLabel(characterId, screenPos) {
    const entry = this.speechLabels.get(characterId);
    if (!entry) return;
    if (!screenPos || !screenPos.visible) {
      entry.el.style.display = 'none';
      return;
    }
    entry.el.style.display = 'block';
    entry.el.style.left = `${screenPos.x}px`;
    entry.el.style.top = `${screenPos.y - 12}px`;
  }

  cullExpiredSpeechLabels() {
    const now = Date.now();
    for (const [id, entry] of this.speechLabels) {
      if (entry.expiresAt && now > entry.expiresAt) {
        entry.el.remove();
        this.speechLabels.delete(id);
      }
    }
  }

  _clearSpeechLabels() {
    for (const { el } of this.speechLabels.values()) el.remove();
    this.speechLabels.clear();
  }

  // ---------- name tags ----------
  ensureNameTag(characterId, name) {
    if (this.nameTags.has(characterId)) return;
    const el = document.createElement('div');
    el.className = 'name-tag';
    el.textContent = name;
    this.gameScreen.appendChild(el);
    this.nameTags.set(characterId, el);
  }
  positionNameTag(characterId, screenPos, inRange) {
    const el = this.nameTags.get(characterId);
    if (!el) return;
    if (!screenPos || !screenPos.visible) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.left = `${screenPos.x}px`;
    el.style.top = `${screenPos.y - 70}px`;
    el.classList.toggle('in-range', inRange);
  }
  _clearNameTags() {
    for (const el of this.nameTags.values()) el.remove();
    this.nameTags.clear();
  }

  // ---------- hint ----------
  showHint(text) {
    this.hintBody.textContent = text;
    this.hintBubble.classList.remove('hidden');
  }
  hideHint() {
    this.hintBubble.classList.add('hidden');
  }

  // ---------- pause ----------
  setPaused(p) {
    this.paused = p;
    this.btnPause.textContent = p ? '▶' : '⏸';
    this.pauseOverlay.classList.toggle('hidden', !p);
  }

  // ---------- mute ----------
  setMuted(m) {
    this.muted = m;
    this.btnMute.textContent = m ? '🔇' : '🔊';
  }

  // ---------- mic ----------
  // state: 'idle' | 'recording' | 'transcribing' | 'unavailable'
  setMicState(state) {
    if (!this.btnMic) return;
    this.btnMic.classList.toggle('recording', state === 'recording');
    this.btnMic.classList.toggle('transcribing', state === 'transcribing');
    if (state === 'recording') {
      this.btnMic.textContent = '⏹';
      this.btnMic.title = 'Click to stop recording and send';
    } else if (state === 'transcribing') {
      this.btnMic.textContent = '…';
      this.btnMic.title = 'Transcribing…';
      this.btnMic.disabled = true;
    } else if (state === 'unavailable') {
      this.btnMic.textContent = '🎤';
      this.btnMic.title = 'Voice input unavailable — set VITE_ELEVENLABS_API_KEY in .env';
      this.btnMic.disabled = true;
    } else {
      this.btnMic.textContent = '🎤';
      this.btnMic.title = 'Click to start recording';
      this.btnMic.disabled = false;
    }
  }

  // ---------- debrief ----------
  showDebrief({ scenario, durationSec, feedbackPromise = null }) {
    const stats = this.progress.getStats(scenario.id);
    const overall = this.progress.getOverall();
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    this.debriefStats.innerHTML = `
      <div class="stat"><div class="label">Time in scene</div><div class="value">${minutes}m ${seconds}s</div></div>
      <div class="stat"><div class="label">Visits to this scene</div><div class="value">${stats.count}</div></div>
      <div class="stat"><div class="label">Total sessions</div><div class="value">${overall.totalSessions}</div></div>
    `;
    this.debriefOverlay.classList.remove('hidden');

    // Feedback section — show loading, then render when ready
    if (feedbackPromise) {
      this.debriefFeedback.innerHTML = '<div class="feedback-loading">Reviewing your conversation...</div>';
      feedbackPromise.then((feedback) => {
        if (!feedback) {
          this.debriefFeedback.innerHTML = '';
          return;
        }
        const hasStrengths = feedback.strengths?.length > 0;
        const hasImprovements = feedback.improvements?.length > 0;
        if (!hasStrengths && !hasImprovements) {
          this.debriefFeedback.innerHTML = '';
          return;
        }
        let html = '<div class="feedback-sections">';
        if (hasStrengths) {
          html += '<div class="feedback-section"><div class="feedback-section-title">Things you did well</div><ul class="feedback-list strengths">';
          for (const s of feedback.strengths) html += `<li>${escapeHtml(s)}</li>`;
          html += '</ul></div>';
        }
        if (hasImprovements) {
          html += '<div class="feedback-section"><div class="feedback-section-title">Things to try next time</div><ul class="feedback-list improvements">';
          for (const s of feedback.improvements) html += `<li>${escapeHtml(s)}</li>`;
          html += '</ul></div>';
        }
        html += '</div>';
        this.debriefFeedback.innerHTML = html;
      });
    } else {
      this.debriefFeedback.innerHTML = '';
    }
  }
  hideDebrief() {
    this.debriefOverlay.classList.add('hidden');
  }

  // ---------- title screen grid ----------
  _renderScenarioGrid() {
    this.scenarioGrid.innerHTML = '';
    for (const s of SCENARIOS) {
      const stats = this.progress.getStats(s.id);
      const card = document.createElement('button');
      card.className = 'scenario-card';
      card.innerHTML = `
        <div class="difficulty">
          ${[1, 2, 3]
            .map((i) => `<span class="pip${i <= s.difficulty ? ' on' : ''}"></span>`)
            .join('')}
          Difficulty ${s.difficulty}/3
        </div>
        <h3>${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.blurb)}</p>
        <div class="meta">
          <span>${stats.count} ${stats.count === 1 ? 'visit' : 'visits'}</span>
        </div>
      `;
      card.addEventListener('click', () => this._emit('startScenario', s.id));
      this.scenarioGrid.appendChild(card);
    }
  }

  // ---------- input ----------
  _bindButtons() {
    const sendIfReady = () => {
      const v = this.input.value.trim();
      if (!v) return;
      this.input.value = '';
      this.hideHint();
      this._emit('sendMessage', v);
    };
    this.btnSend.addEventListener('click', sendIfReady);
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendIfReady();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this._emit('requestHint');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this._emit('togglePause');
      }
    });
    this.btnHint.addEventListener('click', () => this._emit('requestHint'));

    // Mic — click toggles between recording and stopping. Main.js owns the
    // actual STT lifecycle; UI just emits the toggle and renders the state
    // it gets back via setMicState().
    this.btnMic.addEventListener('click', () => this._emit('toggleMic'));

    // Tips collapse/expand — purely visual, owned entirely by UI.
    this.btnTipsToggle?.addEventListener('click', () => {
      this.setTipsCollapsed(!this.tipsCollapsed);
    });
    this.btnPause.addEventListener('click', () => this._emit('togglePause'));
    this.btnRewind.addEventListener('click', () => this._emit('rewind'));
    this.btnMute.addEventListener('click', () => this._emit('toggleMute'));
    this.btnBack.addEventListener('click', () => this._emit('quit'));
    this.btnResume.addEventListener('click', () => this._emit('togglePause'));
    this.btnRewindOverlay.addEventListener('click', () => this._emit('rewind'));
    this.btnQuit.addEventListener('click', () => this._emit('quit'));
    this.btnDebriefAgain.addEventListener('click', () => this._emit('debriefAgain'));
    // Debrief "pick another scenario" exits straight to the title — the scene
    // has already been recorded and torn down when the debrief opened.
    this.btnDebriefHome.addEventListener('click', () => this._emit('leaveToTitle'));
    this.btnDismissWarning.addEventListener('click', () => this.apiWarning.classList.add('hidden'));

    // Global Esc to pause
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.gameScreen.classList.contains('visible')) {
        if (document.activeElement === this.input) return;
        this._emit('togglePause');
      }
    });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
