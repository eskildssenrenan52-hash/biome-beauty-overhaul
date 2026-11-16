import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './engine';
import { isTileValueSolid } from './physics';
import { ENEMY_SPRITES } from './sprites';
import { getAnyBossMeta, isBossKind, PLAY_MODES, UNDERWORLD_BOSS_ORDER } from './modes';
import { ALL_ENEMY_BESTIARY, UNDERWORLD_ENEMY_BESTIARY } from './passAndRewards';
import { getAnyBossBestiary, UNDERWORLD_BESTIARY_ENTRIES } from './systems';
import { drawUnderworldForegroundWeather, drawUnderworldSpectacle, isUnderworldBiome } from './underworldBackdrops';
import {
  InputState,
  RoomDef,
  TILE_SIZE,
  TileType,
  UNDERWORLD_ENEMY_KINDS,
  UnderworldBiomeId,
} from './types';
import { getAnyBiomeMeta, UNDERWORLD_BIOME_META, UNDERWORLD_CHAPTERS } from './worldDataUnderworld';

const emptyInput: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jumpHeld: false,
  jumpJustPressed: false,
  dashJustPressed: false,
  grabHeld: false,
  interactJustPressed: false,
  skillJustPressed: false,
  swapJustPressed: false,
  soulSlashJustPressed: false,
};

function isHazardTile(t: number): boolean {
  return (
    t === TileType.SPIKE_UP ||
    t === TileType.SPIKE_DOWN ||
    t === TileType.SPIKE_LEFT ||
    t === TileType.SPIKE_RIGHT ||
    t === TileType.LIQUID_LETHAL
  );
}

function isPlatformTile(t: number): boolean {
  return (
    isTileValueSolid(t) ||
    t === TileType.ONE_WAY ||
    t === TileType.CRUMBLE ||
    t === TileType.FRAGILE_GLASS ||
    t === TileType.ICE ||
    t === TileType.STICKY_RESIN ||
    t === TileType.CONVEYOR_LEFT ||
    t === TileType.CONVEYOR_RIGHT ||
    t === TileType.MAGMA_CRUST ||
    t === TileType.CLOUD_BOUNCE ||
    t === TileType.BEAT_A ||
    t === TileType.BEAT_B
  );
}

function isSolidBlockingTile(t: number): boolean {
  return (
    t === TileType.SOLID ||
    t === TileType.CRUMBLE ||
    t === TileType.ICE ||
    t === TileType.STICKY_RESIN ||
    t === TileType.CONVEYOR_LEFT ||
    t === TileType.CONVEYOR_RIGHT ||
    t === TileType.MAGMA_CRUST ||
    t === TileType.DREAM_BLOCK ||
    t === TileType.BREAKABLE
  );
}

/**
 * Platformer reachability solver for a 44x24 stage:
 * Models grounded walking, 3-tile jump arcs, wall-jumps against solid columns,
 * single/double dashes (including through DREAM_BLOCK / BREAKABLE tiles),
 * springs, dash crystals, jump orbs, bumpers, boost hoops, grapple anchors,
 * upward wind streams, and linked portals.
 */
function canTraverseStage(room: RoomDef): { ok: boolean; reason?: string; maxColReached: number } {
  const { cols, rows, tiles } = room;
  const spinnerSet = new Set<string>();
  const springSet = new Set<string>();
  const crystalSet = new Set<string>();
  const doubleCrystalSet = new Set<string>();
  const orbSet = new Set<string>();
  const windCols = new Set<string>();
  const grappleList: { cx: number; cy: number }[] = [];
  const portalA: { cx: number; cy: number }[] = [];
  const portalB: { cx: number; cy: number }[] = [];
  let goalTile: { cx: number; cy: number } | null = null;

  for (const ent of room.entities) {
    const cx = Math.floor(ent.x / TILE_SIZE);
    const cy = Math.floor(ent.y / TILE_SIZE);
    const key = `${cx},${cy}`;
    if (ent.kind === 'spinner') spinnerSet.add(key);
    if (ent.kind === 'spring_up') springSet.add(key);
    if (ent.kind === 'dash_crystal') crystalSet.add(key);
    if (ent.kind === 'double_dash_crystal') doubleCrystalSet.add(key);
    if (ent.kind === 'jump_orb' || ent.kind === 'bumper_orb' || ent.kind === 'boost_hoop') orbSet.add(key);
    if (ent.kind === 'grapple_anchor') grappleList.push({ cx, cy });
    if (ent.kind === 'portal_a') portalA.push({ cx, cy });
    if (ent.kind === 'portal_b') portalB.push({ cx, cy });
    if (ent.kind === 'wind_up') {
      for (let wy = Math.max(1, cy - 6); wy <= cy + 6; wy++) {
        for (let wx = cx; wx <= cx + 2; wx++) windCols.add(`${wx},${wy}`);
      }
    }
    if (ent.kind === 'chapter_goal' || ent.kind === 'summit_heart') {
      goalTile = { cx, cy };
    }
  }

  const inBounds = (cx: number, cy: number) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;
  const tileAt = (cx: number, cy: number) => (inBounds(cx, cy) ? tiles[cy * cols + cx] : TileType.SOLID);

  const isPassable = (cx: number, cy: number, allowBreakOrDream = false): boolean => {
    if (!inBounds(cx, cy)) return false;
    const t = tileAt(cx, cy);
    if (isHazardTile(t)) return false;
    if (spinnerSet.has(`${cx},${cy}`)) return false;
    if (allowBreakOrDream && (t === TileType.DREAM_BLOCK || t === TileType.BREAKABLE)) return true;
    return !isSolidBlockingTile(t);
  };

  const canOccupy = (cx: number, cy: number): boolean => isPassable(cx, cy, false);

  const isGroundedAt = (cx: number, cy: number): boolean => {
    if (!canOccupy(cx, cy)) return false;
    if (cy + 1 >= rows) return false;
    const below = tileAt(cx, cy + 1);
    return isPlatformTile(below);
  };

  const isTarget = (cx: number, cy: number): boolean => {
    if (room.exits?.rightRow !== undefined) {
      return cx >= cols - 2 && cy >= room.exits.rightRow - 5 && cy < room.exits.rightRow;
    }
    if (goalTile) {
      return Math.abs(cx - goalTile.cx) <= 2 && Math.abs(cy - goalTile.cy) <= 2;
    }
    return false;
  };

  const sx = Math.max(1, Math.min(cols - 2, Math.floor((room.spawnX + 4) / TILE_SIZE)));
  const sy = Math.max(1, Math.min(rows - 2, Math.floor((room.spawnY + 5) / TILE_SIZE)));
  if (!canOccupy(sx, sy)) {
    return { ok: false, reason: `Spawn (${sx},${sy}) is blocked/lethal`, maxColReached: sx };
  }

  // BFS state key: cx,cy,dashes (0..2)
  const visited = new Uint8Array(cols * rows * 3);
  const queue: number[] = [];
  let qHead = 0;

  const pushState = (cx: number, cy: number, dashes: number) => {
    if (!inBounds(cx, cy)) return;
    if (!canOccupy(cx, cy)) return;
    let d = Math.max(0, Math.min(2, dashes));
    if (isGroundedAt(cx, cy) || orbSet.has(`${cx},${cy}`) || windCols.has(`${cx},${cy}`)) {
      d = Math.max(d, 1);
    }
    if (crystalSet.has(`${cx},${cy}`)) d = Math.max(d, 1);
    if (doubleCrystalSet.has(`${cx},${cy}`)) d = 2;

    const idx = (cy * cols + cx) * 3 + d;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue.push(cx, cy, d);
  };

  pushState(sx, sy, 1);
  let maxCol = sx;

  while (qHead < queue.length) {
    const cx = queue[qHead++];
    const cy = queue[qHead++];
    const d = queue[qHead++];
    if (cx > maxCol) maxCol = cx;

    if (isTarget(cx, cy)) {
      return { ok: true, maxColReached: maxCol };
    }

    const grounded = isGroundedAt(cx, cy);
    const onBounce = grounded && tileAt(cx, cy + 1) === TileType.CLOUD_BOUNCE;

    // 1. Walk Left / Right & Fall Straight Down (gravity)
    for (const dx of [-1, 1]) {
      if (canOccupy(cx + dx, cy)) {
        pushState(cx + dx, cy, d);
        // Step up 1 tile if grounded or dropping through 1-way
        if (grounded && canOccupy(cx + dx, cy - 1)) pushState(cx + dx, cy - 1, d);
      }
      // Fall diagonally by 1
      if (canOccupy(cx + dx, cy + 1)) pushState(cx + dx, cy + 1, d);
    }
    if (canOccupy(cx, cy + 1)) pushState(cx, cy + 1, d);
    // Drop through ONE_WAY platform
    if (grounded && tileAt(cx, cy + 1) === TileType.ONE_WAY && canOccupy(cx, cy + 2)) {
      pushState(cx, cy + 2, d);
    }

    // 2. Wind updraft
    if (windCols.has(`${cx},${cy}`)) {
      for (let up = 1; up <= 5; up++) {
        if (!canOccupy(cx, cy - up)) break;
        pushState(cx, cy - up, Math.max(d, 1));
      }
    }

    // 3. Spring / Cloud Bounce launch (up to 7 tiles up, +/- 4 horizontal)
    if (springSet.has(`${cx},${cy}`) || onBounce) {
      for (let vy = 1; vy <= 7; vy++) {
        if (!canOccupy(cx, cy - vy)) break;
        pushState(cx, cy - vy, Math.max(d, 1));
        for (const dx of [-1, 1, -2, 2, -3, 3]) {
          if (canOccupy(cx + dx, cy - vy)) pushState(cx + dx, cy - vy, Math.max(d, 1));
        }
      }
    }

    // 4. Portals
    for (const pa of portalA) {
      if (Math.abs(cx - pa.cx) <= 1 && Math.abs(cy - pa.cy) <= 1) {
        for (const pb of portalB) pushState(pb.cx, pb.cy, Math.max(d, 1));
      }
    }

    // 5. Grapple Anchors (within radius 5 tiles -> swing & launch across/up)
    for (const gr of grappleList) {
      if (Math.hypot(cx - gr.cx, cy - gr.cy) <= 5.5) {
        for (let gx = -5; gx <= 5; gx++) {
          for (let gy = -4; gy <= 3; gy++) {
            const nx = gr.cx + gx;
            const ny = gr.cy + gy;
            if (canOccupy(nx, ny)) pushState(nx, ny, Math.max(d, 1));
          }
        }
      }
    }

    // 6. Standard Jump Arc & Wall Jump
    const nextToLeftWall = inBounds(cx - 1, cy) && isSolidBlockingTile(tileAt(cx - 1, cy));
    const nextToRightWall = inBounds(cx + 1, cy) && isSolidBlockingTile(tileAt(cx + 1, cy));
    const canJump = grounded || orbSet.has(`${cx},${cy}`) || nextToLeftWall || nextToRightWall;
    if (canJump) {
      // Pure vertical jump up 1..3 tiles
      for (let h = 1; h <= 3; h++) {
        if (!canOccupy(cx, cy - h)) break;
        pushState(cx, cy - h, d);
      }
      // Horizontal jump arcs: up to 5 tiles across, cresting 1..3 tiles up
      for (const dir of [-1, 1]) {
        if (nextToLeftWall && dir === -1 && !grounded) continue;
        if (nextToRightWall && dir === 1 && !grounded) continue;
        for (let step = 1; step <= 5; step++) {
          const nx = cx + dir * step;
          for (let hy = 0; hy <= 3; hy++) {
            if (!canOccupy(nx, cy - hy)) continue;
            // Ensure head clearance along step 1..step
            let clear = true;
            for (let k = 1; k <= step; k++) {
              if (!canOccupy(cx + dir * k, cy - Math.min(hy, k === step ? hy : 2))) {
                clear = false;
                break;
              }
            }
            if (clear) pushState(nx, cy - hy, d);
          }
        }
      }
    }

    // 7. Dash in 8 directions (up to 6 tiles horizontally or 5 diagonally/up)
    if (d > 0) {
      const dirs: [number, number, number][] = [
        [1, 0, 6],
        [-1, 0, 6],
        [0, -1, 5],
        [1, -1, 4],
        [-1, -1, 4],
        [1, 1, 4],
        [-1, 1, 4],
      ];
      for (const [dx, dy, maxDist] of dirs) {
        for (let dist = 1; dist <= maxDist; dist++) {
          const nx = cx + dx * dist;
          const ny = cy + dy * dist;
          if (!isPassable(nx, ny, true)) break;
          // Land safely once outside dream/breakable block
          if (canOccupy(nx, ny)) {
            pushState(nx, ny, d - 1);
          }
        }
      }
    }
  }

  return {
    ok: false,
    reason: `No valid platforming path from (${sx},${sy}) to exit (maxCol=${maxCol})`,
    maxColReached: maxCol,
  };
}

test('Submundo tem 20 mundos, 20 biomas, 20 chefes e 100 fases (44x24) todas conectadas e 100% possíveis', () => {
  assert.equal(UNDERWORLD_CHAPTERS.length, 20);
  assert.equal(Object.keys(UNDERWORLD_BIOME_META).length, 20);
  assert.equal(UNDERWORLD_BOSS_ORDER.length, 20);
  assert.ok(PLAY_MODES.some((m) => m.id === 'underworld'));

  const totalStages = UNDERWORLD_CHAPTERS.reduce((acc, ch) => acc + ch.stages.length, 0);
  assert.equal(totalStages, 100, `Expected 100 Underworld stages (20x5), got ${totalStages}`);

  const failures: string[] = [];

  for (let c = 0; c < UNDERWORLD_CHAPTERS.length; c++) {
    const ch = UNDERWORLD_CHAPTERS[c];
    assert.equal(ch.stages.length, 5, `Underworld Circle ${c + 1} expected 5 stages`);

    for (let s = 0; s < ch.stages.length; s++) {
      const stage = ch.stages[s];
      assert.equal(stage.cols, 44, `${stage.id} cols mismatch`);
      assert.equal(stage.rows, 24, `${stage.id} rows mismatch`);
      assert.equal(stage.tiles.length, 44 * 24);

      if (s < 4) {
        assert.ok(stage.exits?.rightRow !== undefined, `${stage.id} missing rightRow exit`);
        const nextStage = ch.stages[s + 1];
        assert.equal(
          stage.exits?.rightRow,
          nextStage.exits?.leftRow,
          `${stage.id} rightRow (${stage.exits?.rightRow}) !== ${nextStage.id} leftRow (${nextStage.exits?.leftRow})`
        );
      } else {
        const expectedBoss = UNDERWORLD_BOSS_ORDER[c];
        assert.ok(
          stage.entities.some((e) => e.kind === expectedBoss),
          `${stage.id} missing archdemon boss ${expectedBoss}`
        );
        assert.ok(
          stage.entities.some((e) => e.kind === 'chapter_goal'),
          `${stage.id} missing chapter_goal`
        );
      }

      const res = canTraverseStage(stage);
      if (!res.ok) {
        failures.push(`${stage.id} (${stage.name}): ${res.reason}`);
      }
    }
  }

  assert.equal(
    failures.length,
    0,
    `Unreachable Underworld hand-crafted stages:\n${failures.join('\n')}`
  );
});

test('Todos os 20 novos inimigos e 20 chefes do Submundo têm sprites válidos, bestiário e mecânicas de fundo', () => {
  assert.equal(UNDERWORLD_ENEMY_KINDS.length, 20);
  assert.equal(UNDERWORLD_ENEMY_BESTIARY.length, 20);
  assert.equal(ALL_ENEMY_BESTIARY.length, 62);
  assert.equal(UNDERWORLD_BESTIARY_ENTRIES.length, 20);

  for (const kind of UNDERWORLD_ENEMY_KINDS) {
    const sp = ENEMY_SPRITES[kind];
    assert.ok(sp, `Missing sprite for ${kind}`);
    for (const frame of sp.frames) {
      const w = frame[0].length;
      for (const row of frame) {
        assert.equal(row.length, w, `Inconsistent row width in ${kind}`);
        for (const ch of row) {
          if (ch === '.' || ch === ' ') continue;
          assert.ok(sp.palette[ch] !== undefined, `Invalid palette char '${ch}' in ${kind}`);
        }
      }
    }
  }

  for (const bossKind of UNDERWORLD_BOSS_ORDER) {
    assert.equal(isBossKind(bossKind), true);
    assert.ok(getAnyBossMeta(bossKind));
    assert.ok(getAnyBossBestiary(bossKind));
    assert.ok(ENEMY_SPRITES[bossKind], `Missing sprite for boss ${bossKind}`);
  }

  const noopGrad = { addColorStop() {} };
  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    createLinearGradient: () => noopGrad,
    createRadialGradient: () => noopGrad,
  } as unknown as CanvasRenderingContext2D;

  let spectacleCount = 0;
  for (const biome of Object.keys(UNDERWORLD_BIOME_META) as UnderworldBiomeId[]) {
    assert.equal(isUnderworldBiome(biome), true);
    const meta = getAnyBiomeMeta(biome);
    if (drawUnderworldSpectacle(mockCtx, biome, meta, 1.5, 10)) {
      spectacleCount++;
    }
    drawUnderworldForegroundWeather(
      mockCtx,
      { currentRoom: { biome }, elapsedSeconds: 1.5 } as unknown as GameEngine,
      meta
    );
  }
  assert.equal(spectacleCount, 20, 'Expected all 20 Underworld biomes to draw spectacles');
});

test('Engine Submundo, 20 novos inimigos e Golpe da Alma [U] executam sem erros', () => {
  const engine = new GameEngine(() => {});
  engine.startPlayMode('underworld', false);
  engine.assist.invincible = true;

  assert.equal(engine.playMode, 'underworld');
  assert.equal(engine.chapters.length, 20);
  assert.equal(engine.currentRoom.biome, 'styx_ferry');

  // Step with all 20 new Underworld enemies spawned simultaneously
  const px = engine.player.x;
  const py = engine.player.y;
  engine.liveEntities = UNDERWORLD_ENEMY_KINDS.map((kind, i) => ({
    def: { id: `uw_test_${i}`, kind, x: px + 44 + (i % 5) * 16, y: py - Math.floor(i / 5) * 10 },
    x: px + 44 + (i % 5) * 16,
    y: py - Math.floor(i / 5) * 10,
    w: 14,
    h: 14,
    vx: 0,
    vy: 0,
    homeX: px + 44 + (i % 5) * 16,
    homeY: py - Math.floor(i / 5) * 10,
    timer: 0,
    cooldown: 0,
    state: 'idle',
    hp: 3,
    maxHp: 3,
    dir: -1,
    flash: 0,
    koTimer: 0,
    collected: false,
  }));

  for (let f = 0; f < 100; f++) {
    engine.step(1 / 60, emptyInput);
  }

  // Verify Soul Strike [U] consumes 40 Soul Charge when no melee kills refill it, and spawns piercing crescent wave
  engine.liveEntities = [];
  engine.soulCharge = 100;
  const fired = engine.triggerSoulStrike();
  assert.equal(fired, true);
  assert.equal(engine.soulCharge, 60);
  assert.ok(engine.projectiles.some((pr) => pr.active && pr.friendly && pr.pierceWalls), 'Soul Strike spawned crescent wave');

  const snap = engine.getSnapshot();
  assert.equal(snap.isUnderworld, true);
  assert.equal(snap.totalChapters, 20);
  assert.equal(snap.soulCharge, 60);
});
