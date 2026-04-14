// Persists per-scenario progress to localStorage so users can see they're
// improving over time. Stores:
//  * sessions completed per scenario
//  * total scenarios attempted

const KEY = 'social-sim-claude::progress::v1';

const DEFAULT = {
  sessions: {},        // scenarioId -> { count, lastAt }
  totalSessions: 0,
};

export class Progress {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULT), ...parsed };
    } catch {
      return structuredClone(DEFAULT);
    }
  }

  _save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Storage might be full or unavailable; nothing to do.
    }
  }

  recordSession(scenarioId) {
    const s = this.data.sessions[scenarioId] || { count: 0, lastAt: 0 };
    s.count += 1;
    s.lastAt = Date.now();
    this.data.sessions[scenarioId] = s;
    this.data.totalSessions += 1;
    this._save();
  }

  getStats(scenarioId) {
    return this.data.sessions[scenarioId] || { count: 0, lastAt: 0 };
  }

  getOverall() {
    return {
      totalSessions: this.data.totalSessions,
    };
  }
}
