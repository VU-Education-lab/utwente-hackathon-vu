// Drives viseme-based lip-sync and idle eye-blink on a GLTF avatar.
//
// Expects meshes from a Ready Player Me (or TalkingHead-compatible) avatar
// with Oculus viseme blend shapes (viseme_sil, viseme_PP, ...) and optionally
// ARKit blend shapes (eyeBlinkLeft, eyeBlinkRight) for blinking.
//
// When talking, cycles through weighted random visemes at ~10 per second with
// smooth lerping between morph target influences.

const VISEME_NAMES = [
  'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
  'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
  'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
];

// Vowels weighted more heavily for natural-looking speech.
const VISEME_WEIGHTS = {
  viseme_sil: 0.3,
  viseme_PP: 1, viseme_FF: 1, viseme_TH: 0.8, viseme_DD: 1,
  viseme_kk: 1, viseme_CH: 0.8, viseme_SS: 1, viseme_nn: 1, viseme_RR: 0.8,
  viseme_aa: 2, viseme_E: 2, viseme_I: 2, viseme_O: 2, viseme_U: 2,
};

const LERP_SPEED = 14;
const VISEMES_PER_SEC_MIN = 8;
const VISEMES_PER_SEC_MAX = 12;

export class VisemeAnimator {
  constructor(morphMeshes) {
    this.morphMeshes = morphMeshes;
    this.isTalking = false;

    // Current influence values for each viseme (0-1).
    this.influences = {};
    for (const name of VISEME_NAMES) this.influences[name] = 0;

    // Which viseme is currently the target (full influence).
    this.targetViseme = 'viseme_sil';
    this.visemeTimer = 0;

    // Build a weighted bucket array for random picking.
    this._weightedBucket = [];
    for (const name of VISEME_NAMES) {
      const w = VISEME_WEIGHTS[name] || 1;
      const count = Math.round(w * 10);
      for (let i = 0; i < count; i++) this._weightedBucket.push(name);
    }

    // Eye blink state.
    this.blinkTimer = 2 + Math.random() * 3;
    this.blinkPhase = -1; // <0 means not blinking
    this.blinkValue = 0;
    this.hasBlinkTargets = this._hasBlendShape('eyeBlinkLeft');
  }

  setTalking(value) {
    this.isTalking = value;
    if (value) {
      // Immediately pick a first viseme.
      this._pickNextViseme();
    }
  }

  update(dt) {
    this._updateVisemes(dt);
    this._updateBlink(dt);
  }

  // ---------- viseme animation ----------
  _updateVisemes(dt) {
    if (this.isTalking) {
      this.visemeTimer -= dt;
      if (this.visemeTimer <= 0) {
        this._pickNextViseme();
      }
    }

    // Lerp all influences toward targets.
    let anyActive = false;
    for (const name of VISEME_NAMES) {
      const target = (this.isTalking && name === this.targetViseme) ? 0.85 : 0;
      const cur = this.influences[name];
      const diff = target - cur;
      if (Math.abs(diff) < 0.001) {
        this.influences[name] = target;
      } else {
        this.influences[name] = cur + diff * Math.min(1, dt * LERP_SPEED);
        anyActive = true;
      }
    }

    // Apply to all morph meshes.
    if (anyActive || this.isTalking) {
      for (const mesh of this.morphMeshes) {
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;
        for (const name of VISEME_NAMES) {
          if (name in dict) {
            infl[dict[name]] = this.influences[name];
          }
        }
      }
    }
  }

  _pickNextViseme() {
    // Avoid picking the same viseme twice in a row.
    let next = this.targetViseme;
    let tries = 0;
    while (next === this.targetViseme && tries < 5) {
      next = this._weightedBucket[Math.floor(Math.random() * this._weightedBucket.length)];
      tries++;
    }
    this.targetViseme = next;
    const rate = VISEMES_PER_SEC_MIN + Math.random() * (VISEMES_PER_SEC_MAX - VISEMES_PER_SEC_MIN);
    this.visemeTimer = 1 / rate;
  }

  // ---------- blink animation ----------
  _updateBlink(dt) {
    if (!this.hasBlinkTargets) return;

    if (this.blinkPhase < 0) {
      // Not blinking — count down to next blink.
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkPhase = 0;
        this.blinkValue = 0;
      }
    } else {
      // Blinking in progress.
      this.blinkPhase += dt;
      if (this.blinkPhase < 0.06) {
        // Closing
        this.blinkValue = this.blinkPhase / 0.06;
      } else if (this.blinkPhase < 0.11) {
        // Closed
        this.blinkValue = 1;
      } else if (this.blinkPhase < 0.21) {
        // Opening
        this.blinkValue = 1 - (this.blinkPhase - 0.11) / 0.1;
      } else {
        // Done
        this.blinkValue = 0;
        this.blinkPhase = -1;
        this.blinkTimer = 2 + Math.random() * 3;
      }

      for (const mesh of this.morphMeshes) {
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;
        if ('eyeBlinkLeft' in dict) infl[dict['eyeBlinkLeft']] = this.blinkValue;
        if ('eyeBlinkRight' in dict) infl[dict['eyeBlinkRight']] = this.blinkValue;
      }
    }
  }

  // ---------- helpers ----------
  _hasBlendShape(name) {
    for (const mesh of this.morphMeshes) {
      if (mesh.morphTargetDictionary && name in mesh.morphTargetDictionary) return true;
    }
    return false;
  }

  static findMorphMeshes(root) {
    const meshes = [];
    root.traverse((child) => {
      if (
        child.isMesh &&
        child.morphTargetInfluences &&
        child.morphTargetInfluences.length > 0 &&
        child.morphTargetDictionary
      ) {
        meshes.push(child);
      }
    });
    return meshes;
  }
}
