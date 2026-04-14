import * as THREE from 'three';

// Builds simple low-poly environments out of primitives. No external assets,
// no GLTF loading. The look is intentionally minimal so we don't pretend to
// be a real game — the focus is the conversation, not the graphics.

const FLOOR_SIZE = 30;

export function buildEnvironment(scene, kind) {
  const root = new THREE.Group();
  root.name = `env-${kind}`;
  scene.add(root);

  // Lights — warm daylight, soft and even
  const ambient = new THREE.AmbientLight(0xfff8f0, 0.75);
  root.add(ambient);

  const key = new THREE.DirectionalLight(0xfff4e8, 1.0);
  key.position.set(8, 14, 6);
  root.add(key);

  const fill = new THREE.HemisphereLight(0xdce8f5, 0xc8b8a0, 0.5);
  root.add(fill);

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({
    color: floorColorFor(kind),
    roughness: 0.95,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  root.add(floor);

  // Subtle grid so movement is readable
  const grid = new THREE.GridHelper(FLOOR_SIZE, 30, 0xb8aa98, 0xc4b8a8);
  grid.position.y = 0.01;
  root.add(grid);

  // Walls
  addWalls(root, kind);

  // Per-environment furniture
  switch (kind) {
    case 'classroom':
      buildClassroom(root);
      break;
    case 'cafeteria':
      buildCafeteria(root);
      break;
    case 'study':
      buildStudyRoom(root);
      break;
    case 'mixer':
      buildMixer(root);
      break;
    case 'party':
      buildParty(root);
      break;
    default:
      break;
  }

  return root;
}

function floorColorFor(kind) {
  switch (kind) {
    case 'classroom': return 0xc8b8a0;
    case 'cafeteria': return 0xd4c4aa;
    case 'study': return 0xc0a882;
    case 'mixer': return 0xccbfae;
    case 'party': return 0x9e8a78;
    default: return 0xc8b8a0;
  }
}

function addWalls(root, kind) {
  const wallColor = kind === 'party' ? 0xb8a090 : 0xe0d5c8;
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 1.0 });
  const half = FLOOR_SIZE / 2;
  const h = 4;

  const back = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_SIZE, h, 0.2), wallMat);
  back.position.set(0, h / 2, -half);
  root.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, FLOOR_SIZE), wallMat);
  left.position.set(-half, h / 2, 0);
  root.add(left);

  const right = left.clone();
  right.position.set(half, h / 2, 0);
  root.add(right);
}

// ---------- per-scene furniture ----------

function buildClassroom(root) {
  const deskMat = new THREE.MeshStandardMaterial({ color: 0xa08060, roughness: 0.85 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x7090a8, roughness: 0.8 });

  for (let row = 0; row < 4; row++) {
    for (let col = -3; col <= 3; col++) {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.6), deskMat);
      desk.position.set(col * 1.6, 0.85, -2 - row * 1.8);
      root.add(desk);

      // Desk legs
      for (const [dx, dz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.85, 0.06),
          deskMat
        );
        leg.position.set(col * 1.6 + dx, 0.42, -2 - row * 1.8 + dz);
        root.add(leg);
      }

      // Chair
      const cx = col * 1.6;
      const cz = -2 - row * 1.8 + 0.7;
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), chairMat);
      chair.position.set(cx, 0.5, cz);
      root.add(chair);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.06), chairMat);
      back.position.set(cx, 0.85, cz + 0.25);
      root.add(back);
      // Chair legs
      for (const [clx, clz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
        const cleg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), chairMat);
        cleg.position.set(cx + clx, 0.25, cz + clz);
        root.add(cleg);
      }
    }
  }

  // Whiteboard
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.8, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xeef0f5, roughness: 0.6 })
  );
  board.position.set(0, 2.2, -FLOOR_SIZE / 2 + 0.15);
  root.add(board);
}

function buildCafeteria(root) {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xc0b8b0, roughness: 0.85 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.8 });

  for (let i = 0; i < 3; i++) {
    const tx = (i - 1) * 4;
    const tz = -3;
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 1.4), tableMat);
    table.position.set(tx, 0.85, tz);
    root.add(table);

    for (const [dx, dz] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), tableMat);
      leg.position.set(tx + dx, 0.42, tz + dz);
      root.add(leg);
    }

    const benchA = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.4), benchMat);
    benchA.position.set(tx, 0.45, tz - 1.0);
    root.add(benchA);
    const benchB = benchA.clone();
    benchB.position.set(tx, 0.45, tz + 1.0);
    root.add(benchB);
    // Bench legs
    for (const bz of [tz - 1.0, tz + 1.0]) {
      for (const blx of [-1.1, 1.1]) {
        const bleg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), benchMat);
        bleg.position.set(tx + blx, 0.22, bz);
        root.add(bleg);
      }
    }
  }

  // Counter at the back
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1.1, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.75 })
  );
  counter.position.set(0, 0.55, -FLOOR_SIZE / 2 + 1.5);
  root.add(counter);
}

function buildStudyRoom(root) {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xb09870, roughness: 0.85 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.6), tableMat);
  table.position.set(0, 0.85, -2.3);
  root.add(table);

  for (const [dx, dz] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), tableMat);
    leg.position.set(dx, 0.42, -2.3 + dz);
    root.add(leg);
  }

  // Bookshelves on the back wall
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.9 });
  for (let i = -2; i <= 2; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 0.4), shelfMat);
    shelf.position.set(i * 2.2, 1.1, -FLOOR_SIZE / 2 + 0.4);
    root.add(shelf);
  }
}

function buildMixer(root) {
  // High-tops scattered around the room
  const topMat = new THREE.MeshStandardMaterial({ color: 0xc0bab2, roughness: 0.7 });
  const positions = [[-3, -3.5], [2.5, -3.5], [-2, -1.0], [3.0, -1.5], [0, -5]];
  for (const [x, z] of positions) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24), topMat);
    top.position.set(x, 1.05, z);
    root.add(top);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.05, 12), topMat);
    stem.position.set(x, 0.52, z);
    root.add(stem);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24), topMat);
    base.position.set(x, 0.02, z);
    root.add(base);
  }

  // Banner / event sign
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xe87b5c, roughness: 0.4 })
  );
  banner.position.set(0, 2.6, -FLOOR_SIZE / 2 + 0.2);
  root.add(banner);
}

function buildParty(root) {
  // Kitchen island
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x9a8a7a, roughness: 0.7 });
  const island = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.4), islandMat);
  island.position.set(0, 0.5, -3);
  root.add(island);

  // Stools
  for (const x of [-1.0, 0, 1.0]) {
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.08, 18),
      new THREE.MeshStandardMaterial({ color: 0xb09878, roughness: 0.85 })
    );
    seat.position.set(x, 0.85, -1.7);
    root.add(seat);
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.85, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a7068, roughness: 0.9 })
    );
    leg.position.set(x, 0.42, -1.7);
    root.add(leg);
  }

  // Warm accent lights
  const colors = [0xe87b5c, 0xc4956a, 0xe9a47a];
  for (let i = 0; i < colors.length; i++) {
    const lamp = new THREE.PointLight(colors[i], 0.4, 14);
    lamp.position.set(Math.cos(i) * 5, 3, Math.sin(i) * 4 - 3);
    root.add(lamp);
  }
}
