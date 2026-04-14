import * as THREE from 'three';
import { buildEnvironment } from './Environment.js';
import { Character3D } from './Character.js';

// Owns the Three.js renderer, the camera, and the scene graph.
//
// We use a third-person-ish floating "head" perspective: the camera is the
// user's avatar. There's no visible body. WASD/arrow keys move you around
// on the floor plane; you don't have to fight a fancy controller.
//
// The camera also exposes its world position so the conversation manager
// can decide which characters are "in earshot".

const MOVE_SPEED = 3.4;
const SLOW_MULT = 0.45;
const EARSHOT_RADIUS = 4.0;
// Gaze cone for "the user is looking at this character". 0.92 ≈ 23° half-angle —
// loose enough that you don't have to pixel-perfect aim, tight enough that
// glancing across the room doesn't snap onto someone.
const LOOKAT_DOT = 0.92;
const LOOKAT_MAX_DIST = 12.0;

export class Scene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8dfd4);
    this.scene.fog = new THREE.Fog(0xe8dfd4, 14, 32);

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );
    this.camera.position.set(0, 1.65, 4.0);
    this.camera.lookAt(0, 1.5, 0);

    this.envRoot = null;
    this.characters = new Map(); // id -> Character3D

    // The id of whichever character is currently speaking (or 'user', or null).
    // Set externally via setCurrentSpeaker(); used by _update() to make every
    // listener turn toward the speaker.
    this.currentSpeakerId = null;

    this.keys = new Set();
    this.movementEnabled = true;
    this._bindInput();

    this._lastFrame = performance.now();
    this._raf = null;
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    // Mouse-look (yaw only)
    this.yaw = 0;
    this.pitch = 0;
    this._pointerLocked = false;
    this._bindMouseLook();
  }

  // ---------- public API ----------
  async loadScenario(scenario) {
    this._clearScene();
    this.envRoot = buildEnvironment(this.scene, scenario.environment);

    // Load all avatar models in parallel.
    const chars = await Promise.all(
      scenario.characters.map((c) =>
        Character3D.create({
          id: c.id,
          name: c.name,
          position: c.position,
          avatarFile: c.avatarFile,
        })
      )
    );
    for (const char of chars) {
      this.scene.add(char.group);
      this.characters.set(char.id, char);
    }
    // Drop the user a few steps from the group
    this.camera.position.set(0, 1.65, 4.0);
    this.yaw = 0;
    this.pitch = 0;
    this.camera.rotation.set(0, 0, 0);
    this.currentSpeakerId = null;
    // Initial gaze: every character looks at one of their peers, NOT the user.
    // The user just walked in; they're not part of any conversation yet.
    this._initIdleGazes();
  }

  /**
   * Tell the scene who is currently speaking. The scene then updates every
   * character's gazeTargetId so listeners face the speaker. Pass `null` when
   * the line ends, so the scene can resume idle gaze rotation.
   *
   * @param {string|'user'|null} speakerId
   */
  setCurrentSpeaker(speakerId) {
    this.currentSpeakerId = speakerId;
    if (!speakerId) return;

    const now = performance.now();

    // Listeners turn toward the speaker.
    for (const [id, char] of this.characters) {
      if (id === speakerId) continue;
      char.gazeTargetId = speakerId === 'user' ? 'user' : speakerId;
      // Don't reroll their gaze for a few seconds while the line plays.
      char.nextGazeRollAt = now + 4000;
    }

    // The speaker turns toward someone — the user if they're in earshot of
    // the speaker, otherwise a random listener.
    if (speakerId !== 'user') {
      const speaker = this.characters.get(speakerId);
      if (speaker) {
        const userClose = this._userIsCloseTo(speaker);
        if (userClose) {
          speaker.gazeTargetId = 'user';
        } else {
          const others = [...this.characters.keys()].filter((k) => k !== speakerId);
          speaker.gazeTargetId = others[Math.floor(Math.random() * others.length)] || null;
        }
        speaker.nextGazeRollAt = now + 4000;
      }
    }
  }

  start() {
    if (this._raf) return;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - this._lastFrame) / 1000);
      this._lastFrame = now;
      this._update(dt, now / 1000);
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(tick);
    };
    this._lastFrame = performance.now();
    this._raf = requestAnimationFrame(tick);
  }

  setMovementEnabled(enabled) {
    this.movementEnabled = enabled;
    if (!enabled) this.keys.clear();
  }

  /** Returns characters within earshot of the user, sorted by distance. */
  getCharactersInEarshot() {
    const cam = this.camera.position;
    const out = [];
    for (const c of this.characters.values()) {
      const dx = c.group.position.x - cam.x;
      const dz = c.group.position.z - cam.z;
      const dist = Math.hypot(dx, dz);
      const inRange = dist <= EARSHOT_RADIUS;
      c.isInRange = inRange;
      if (inRange) out.push({ char: c, dist });
    }
    out.sort((a, b) => a.dist - b.dist);
    return out;
  }

  /**
   * Returns the character the user is currently aiming at, or null. Uses a
   * dot-product cone test against the camera's forward vector — no real
   * raycasting needed since avatars are point-ish targets, not geometry.
   *
   * Returns the {@link Character3D} instance, not just an id.
   */
  getLookedAtCharacter() {
    // Camera forward in world space. The camera looks down -Z in its local
    // space, so transform (0,0,-1) by the camera's quaternion.
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .normalize();

    const camPos = this.camera.position;
    let best = null;
    let bestDot = LOOKAT_DOT;

    for (const c of this.characters.values()) {
      const head = c.getHeadWorldPosition();
      const dir = new THREE.Vector3().subVectors(head, camPos);
      const dist = dir.length();
      if (dist > LOOKAT_MAX_DIST || dist < 0.1) continue;
      dir.divideScalar(dist); // normalize without re-allocating
      const dot = dir.dot(forward);
      if (dot > bestDot) {
        bestDot = dot;
        best = c;
      }
    }
    return best;
  }

  /** Project a 3D world position to a 2D screen pixel position. */
  worldToScreen(worldPos) {
    const v = worldPos.clone().project(this.camera);
    if (v.z < -1 || v.z > 1) return null;
    return {
      x: (v.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth,
      y: (-v.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight,
      visible: v.z >= -1 && v.z <= 1,
    };
  }

  // ---------- internal ----------
  _clearScene() {
    if (this.envRoot) {
      this.scene.remove(this.envRoot);
      this._disposeObject(this.envRoot);
      this.envRoot = null;
    }
    for (const c of this.characters.values()) {
      this.scene.remove(c.group);
      this._disposeObject(c.group);
    }
    this.characters.clear();
  }

  _disposeObject(obj) {
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          for (const key of Object.keys(m)) {
            if (m[key] && m[key].isTexture) m[key].dispose();
          }
          m.dispose();
        }
      }
    });
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      // Don't capture keys when typing in an input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  _bindMouseLook() {
    this.canvas.addEventListener('click', () => {
      if (!this._pointerLocked && this.movementEnabled) {
        this.canvas.requestPointerLock?.();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement === this.canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this._pointerLocked) return;
      this.yaw -= e.movementX * 0.0025;
      this.pitch -= e.movementY * 0.0025;
      const max = Math.PI / 2 - 0.05;
      if (this.pitch > max) this.pitch = max;
      if (this.pitch < -max) this.pitch = -max;
    });
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _update(dt, time) {
    // Movement
    if (this.movementEnabled) {
      const slow = this.keys.has('shift') ? SLOW_MULT : 1;
      const speed = MOVE_SPEED * slow * dt;
      // forward = direction the camera faces, on the floor plane
      const forward = new THREE.Vector3(
        Math.sin(this.yaw),
        0,
        Math.cos(this.yaw)
      );
      const right = new THREE.Vector3(forward.z, 0, -forward.x);

      const move = new THREE.Vector3();
      if (this.keys.has('w') || this.keys.has('arrowup')) move.sub(forward);
      if (this.keys.has('s') || this.keys.has('arrowdown')) move.add(forward);
      if (this.keys.has('a') || this.keys.has('arrowleft')) move.sub(right);
      if (this.keys.has('d') || this.keys.has('arrowright')) move.add(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        this.camera.position.add(move);
        // Clamp to room bounds
        const limit = 13;
        if (this.camera.position.x > limit) this.camera.position.x = limit;
        if (this.camera.position.x < -limit) this.camera.position.x = -limit;
        if (this.camera.position.z > limit) this.camera.position.z = limit;
        if (this.camera.position.z < -limit) this.camera.position.z = -limit;
      }
    }

    // Apply camera rotation from yaw/pitch
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Update characters — including who they're looking at.
    this._updateGazes();
    for (const c of this.characters.values()) {
      const targetPos = this._resolveGazeTarget(c);
      if (targetPos) c.lookAt(targetPos);
      c.update(dt, time);
    }
  }

  // ---------- gaze ----------
  /** Pick an initial peer to look at for every character. */
  _initIdleGazes() {
    const ids = [...this.characters.keys()];
    for (const [id, char] of this.characters) {
      const others = ids.filter((k) => k !== id);
      char.gazeTargetId = others[Math.floor(Math.random() * others.length)] || null;
      char.nextGazeRollAt = performance.now() + 1500 + Math.random() * 2500;
    }
  }

  /** Periodically reroll idle gaze when no one is actively speaking. */
  _updateGazes() {
    if (this.currentSpeakerId) return; // speaker logic owns gazes during a line
    const now = performance.now();
    const ids = [...this.characters.keys()];
    for (const [id, char] of this.characters) {
      if (now < char.nextGazeRollAt) continue;
      const userClose = this._userIsCloseTo(char);
      // If the user is in this character's earshot, give them a 50% chance
      // to glance at the user. Otherwise stick to peers — never look at
      // someone they can't even hear.
      let nextTarget;
      if (userClose && Math.random() < 0.5) {
        nextTarget = 'user';
      } else {
        const peers = ids.filter((k) => k !== id);
        nextTarget = peers[Math.floor(Math.random() * peers.length)] || null;
      }
      char.gazeTargetId = nextTarget;
      // Reroll again in 3-7s, longer when nothing is happening so heads
      // don't constantly swivel.
      char.nextGazeRollAt = now + 3000 + Math.random() * 4000;
    }
  }

  /** Convert a character's gazeTargetId to a world-space position. */
  _resolveGazeTarget(char) {
    const target = char.gazeTargetId;
    if (target === 'user') return this.camera.position;
    if (target && this.characters.has(target)) {
      return this.characters.get(target).group.position;
    }
    return null;
  }

  /** True if the camera (user) is within earshot of the given character. */
  _userIsCloseTo(char) {
    const dx = char.group.position.x - this.camera.position.x;
    const dz = char.group.position.z - this.camera.position.z;
    return Math.hypot(dx, dz) <= EARSHOT_RADIUS;
  }
}
