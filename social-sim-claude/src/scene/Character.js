import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VisemeAnimator } from './VisemeAnimator.js';

// Singleton loaders shared across all characters.
const loader = new GLTFLoader();
const fbxLoader = new FBXLoader();

// Respect Vite's base path ('/sim/' in prod, '/' in dev) so this works both
// under the deployed shell and during local `npm run dev`.
const MODEL_BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/') + 'models/';

// Cache the idle animation clips so we only load the FBX once.
let _idleClipsPromise = null;
function loadIdleClips() {
  if (!_idleClipsPromise) {
    _idleClipsPromise = fbxLoader.loadAsync(MODEL_BASE + 'idle.fbx').then((fbx) => {
      return fbx.animations; // AnimationClip[]
    });
  }
  return _idleClipsPromise;
}

export class Character3D {
  /** Use `Character3D.create()` instead of calling the constructor directly. */
  constructor({ id, name, position }) {
    this.id = id;
    this.name = name;
    this.group = new THREE.Group();
    this.group.position.set(position[0], 0, position[2]);
    this.group.userData.characterId = id;

    // Will be set after model loads.
    this.head = null;
    this.headBone = null;
    this.visemeAnimator = null;
    this.mixer = null;

    // Animation state (same interface as before).
    this.bobPhase = Math.random() * Math.PI * 2;
    this.isTalking = false;
    this.isInRange = false;
    this.gazeTargetId = null;
    this.nextGazeRollAt = 0;
  }

  /**
   * Async factory — loads the GLTF avatar and returns a ready-to-use instance.
   * @param {object} opts
   * @param {string} opts.id
   * @param {string} opts.name
   * @param {number[]} opts.position  [x, 0, z]
   * @param {string} opts.avatarFile  filename inside public/models/
   */
  static async create({ id, name, position, avatarFile }) {
    const char = new Character3D({ id, name, position });
    await char._loadModel(avatarFile);
    return char;
  }

  // ---------- model loading ----------
  async _loadModel(avatarFile) {
    const gltf = await loader.loadAsync(MODEL_BASE + avatarFile);
    const avatar = gltf.scene;

    // Measure and scale to a consistent ~1.7m height.
    const box = new THREE.Box3().setFromObject(avatar);
    const height = box.max.y - box.min.y;
    if (height > 0.01) {
      const scale = 1.7 / height;
      avatar.scale.setScalar(scale);
    }

    // Ensure feet sit on the floor after scaling.
    const boxAfter = new THREE.Box3().setFromObject(avatar);
    avatar.position.y = -boxAfter.min.y;

    this.group.add(avatar);

    // Find the Head bone for gaze / name-tag positioning.
    avatar.traverse((child) => {
      if (child.isBone && /^head$/i.test(child.name)) {
        this.headBone = child;
      }
    });

    // Attach a tiny anchor group to the head bone so getHeadWorldPosition()
    // returns a point slightly above the skull for floating UI labels.
    this.head = new THREE.Group();
    if (this.headBone) {
      this.headBone.add(this.head);
      this.head.position.set(0, 0.15, 0);
    } else {
      // Fallback if skeleton has no "Head" bone.
      this.head.position.set(0, 1.65, 0);
      this.group.add(this.head);
    }

    // Discover morph-target meshes and set up the viseme animator.
    const morphMeshes = VisemeAnimator.findMorphMeshes(avatar);
    if (morphMeshes.length > 0) {
      this.visemeAnimator = new VisemeAnimator(morphMeshes);
    }

    // Rendering tweaks for skinned meshes.
    avatar.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
      }
    });

    // Load and apply idle animation from FBX.
    try {
      const clips = await loadIdleClips();
      if (clips && clips.length > 0) {
        this.mixer = new THREE.AnimationMixer(avatar);
        const clip = clips[0];
        const action = this.mixer.clipAction(clip);
        action.play();
      }
    } catch (e) {
      console.warn('Could not load idle animation:', e);
    }
  }

  // ---------- public interface (unchanged) ----------
  setTalking(value) {
    this.isTalking = value;
    if (this.visemeAnimator) this.visemeAnimator.setTalking(value);
  }

  lookAt(target) {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    const angle = Math.atan2(dx, dz);
    const cur = this.group.rotation.y;
    let diff = angle - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y = cur + diff * 0.12;
  }

  update(dt, time) {
    // Skeletal idle animation.
    if (this.mixer) this.mixer.update(dt);

    // Subtle body sway (reduced since real avatars look more natural).
    this.bobPhase += dt * (this.isTalking ? 3 : 0.8);
    const sway = Math.sin(this.bobPhase) * (this.isTalking ? 0.015 : 0.005);
    this.group.rotation.z = sway;

    // Viseme lip-sync + eye blink.
    if (this.visemeAnimator) this.visemeAnimator.update(dt);
  }

  getHeadWorldPosition() {
    const v = new THREE.Vector3();
    if (this.head) this.head.getWorldPosition(v);
    return v;
  }
}
