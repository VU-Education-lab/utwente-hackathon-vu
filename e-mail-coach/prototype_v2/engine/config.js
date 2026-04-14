// Gedeelde state met localStorage-persistentie.
// Modules die willen reageren op wijzigingen gebruiken config.subscribe().

const STORAGE_KEY = 'toonstories_config';

const defaults = {
  mode: 'rules',                          // 'rules' | 'ml' | 'hybrid'
  debounceMs: 800,
  softmaxTemperature: 50,                 // ML scherpte — zie ml.js
  modelName: 'Xenova/multilingual-e5-small',
  activeScenarioKey: 'herkansing',        // welke casus gekozen is vanaf home
  activeVariant: 'herkansing-formeel'     // welke variant van die casus
};

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage vol of niet beschikbaar — negeer
  }
}

const state = load();
const listeners = new Set();

export const config = {
  get(key) {
    return state[key];
  },
  set(key, value) {
    state[key] = value;
    save(state);
    listeners.forEach(fn => fn(key, value));
  },
  getAll() {
    return { ...state };
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
