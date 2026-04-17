// Azure OpenAI text-to-speech via the /api/tts proxy.
// Key is never in the bundle — the Function forwards the request.

import { logger } from '../util/logger.js';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
const ENDPOINT = `${API_BASE}/tts`;
const DEFAULT_VOICE = 'alloy';

export class TTSManager {
  constructor() {
    this.supported = true;
    this.muted = false;
    this.activeAudio = new Map();
  }

  isReady() { return this.supported; }

  setMuted(m) {
    this.muted = m;
    if (m) this.stopAll();
  }

  async speak({ text, voice, characterId, onStart, onEnd }) {
    const endOnce = () => { onEnd?.(); };
    if (!text) return endOnce();

    this._stop(characterId);

    if (this.muted) {
      onStart?.();
      setTimeout(endOnce, Math.min(2200, text.length * 45));
      return;
    }

    const ac = new AbortController();
    const t0 = performance.now();
    const chosenVoice = voice || DEFAULT_VOICE;
    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, voice: chosenVoice, format: 'mp3' }),
        signal: ac.signal,
      });
    } catch (err) {
      if (err?.name !== 'AbortError') logger.error('tts', 'network error', err);
      return endOnce();
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error('tts', `tts proxy HTTP ${response.status}`, { body, voice: chosenVoice });
      return endOnce();
    }

    const buf = await response.arrayBuffer();
    const blob = new Blob([buf], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    const audio = new Audio(blobUrl);
    audio.preload = 'auto';

    const cleanup = () => {
      if (this.activeAudio.get(characterId)?.audio === audio) {
        this.activeAudio.delete(characterId);
      }
      URL.revokeObjectURL(blobUrl);
    };
    audio.addEventListener('play', () => onStart?.(), { once: true });
    audio.addEventListener('ended', () => { cleanup(); endOnce(); });
    audio.addEventListener('error', () => {
      logger.warn('tts', 'audio element error', { characterId });
      cleanup();
      endOnce();
    });

    this.activeAudio.set(characterId, { audio, blobUrl, abortController: ac });
    logger.info('tts', `playing ${characterId} (${Math.round(performance.now() - t0)}ms)`);
    try {
      await audio.play();
    } catch (err) {
      logger.warn('tts', 'audio.play() rejected', { error: err?.message });
      cleanup();
      endOnce();
    }
  }

  _stop(characterId) {
    const entry = this.activeAudio.get(characterId);
    if (!entry) return;
    try {
      entry.abortController?.abort();
      entry.audio.pause();
      entry.audio.src = '';
    } catch {}
    URL.revokeObjectURL(entry.blobUrl);
    this.activeAudio.delete(characterId);
  }

  stopAll() {
    for (const id of [...this.activeAudio.keys()]) this._stop(id);
  }
}
