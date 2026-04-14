// ElevenLabs speech-to-text (Scribe) via the /api/stt proxy.
// Multipart upload is passed through as-is; the Function adds the xi-api-key.

import { logger } from '../util/logger.js';

const MODEL_ID = 'scribe_v1';
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
const ENDPOINT = `${API_BASE}/stt`;

export class STTManager {
  constructor() {
    this.supported =
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined';

    this._stream = null;
    this._recorder = null;
    this._chunks = [];
    this._mimeType = pickMimeType();
  }

  isReady() { return this.supported; }
  isRecording() { return this._recorder?.state === 'recording'; }

  async start() {
    if (!this.supported) throw new Error('Speech-to-text is not available in this browser.');
    if (this.isRecording()) return;

    if (!this._stream) {
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        logger.warn('stt', 'mic permission denied or unavailable', { error: err?.message });
        throw err;
      }
    }

    this._chunks = [];
    this._recorder = new MediaRecorder(
      this._stream,
      this._mimeType ? { mimeType: this._mimeType } : undefined
    );
    this._recorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data);
    });
    this._recorder.start();
    logger.info('stt', 'recording started', { mimeType: this._mimeType || '(default)' });
  }

  async stop() {
    if (!this._recorder) return '';

    const recorder = this._recorder;
    const stopped = new Promise((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
    });
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;

    this._recorder = null;
    const chunks = this._chunks;
    this._chunks = [];

    if (!chunks.length) {
      logger.warn('stt', 'recorder produced no chunks');
      return '';
    }

    const blob = new Blob(chunks, { type: this._mimeType || 'audio/webm' });
    if (blob.size < 600) {
      logger.info('stt', 'discarding tiny recording', { bytes: blob.size });
      return '';
    }

    const ext = (this._mimeType || '').includes('mp4') ? 'm4a'
      : (this._mimeType || '').includes('ogg') ? 'ogg'
      : 'webm';

    const form = new FormData();
    form.append('model_id', MODEL_ID);
    form.append('file', blob, `recording.${ext}`);
    form.append('language_code', 'eng');
    form.append('tag_audio_events', 'false');
    form.append('diarize', 'false');

    const t0 = performance.now();
    let response;
    try {
      response = await fetch(ENDPOINT, { method: 'POST', body: form });
    } catch (err) {
      logger.error('stt', 'network error', err);
      throw err;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error('stt', `stt proxy HTTP ${response.status}`, { body });
      throw new Error(`Speech-to-text failed (${response.status}).`);
    }

    const data = await response.json();
    const text = (data?.text || '').trim();
    logger.info('stt', `transcribed in ${Math.round(performance.now() - t0)}ms`, {
      text,
      audioBytes: blob.size,
      lang: data?.language_code,
    });
    return text;
  }

  cancel() {
    if (!this._recorder) return;
    try { if (this._recorder.state !== 'inactive') this._recorder.stop(); } catch {}
    this._recorder = null;
    this._chunks = [];
  }

  release() {
    this.cancel();
    if (this._stream) {
      for (const track of this._stream.getTracks()) track.stop();
      this._stream = null;
    }
  }
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return null;
}
