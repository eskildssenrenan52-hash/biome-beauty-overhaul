// @ts-nocheck -- imported game code, written for a looser TS config
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AURA_TRAILS,
  AURA_TRAIL_MAP,
  DAILY_REWARDS,
  ENEMY_BESTIARY,
  ENEMY_BESTIARY_MAP,
  MISSIONS,
  PASS_ASTRAL_UNLOCK_COST,
  PASS_MAX_TIER,
  PASS_TIERS,
  PASS_XP_PER_TIER,
  STAR_MILESTONES,
  computeWorldStars,
  getPassProgressFromXp,
} from './passAndRewards';
import { ENEMY_SPRITES, NPC_SPRITES } from './sprites';
import { BIOME_META } from './worldData';
import { drawNewBiomeSpectacle, drawNewBiomeForegroundWeather } from './newBackdrops';
import { GameEngine } from './engine';
import type { BiomeId, EntityKind, InputState } from './types';

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
};

test('Passe Estelar, Missões, Estrelas, Cofre Diário, Trilhas de Aura e Bestiário de 42 Inimigos são consistentes', () => {
  assert.equal(PASS_TIERS.length, PASS_MAX_TIER);
  assert.equal(PASS_MAX_TIER, 40);
  assert.equal(MISSIONS.length, 12);
  assert.equal(STAR_MILESTONES.length, 8);
  assert.equal(DAILY_REWARDS.length, 7);
  assert.equal(AURA_TRAILS.length, 8);
  assert.equal(ENEMY_BESTIARY.length, 42);

  for (let i = 0; i < PASS_TIERS.length; i++) {
    assert.equal(PASS_TIERS[i].tier, i + 1);
    assert.equal(PASS_TIERS[i].xpRequired, (i + 1) * PASS_XP_PER_TIER);
    assert.ok(PASS_TIERS[i].freeReward.label.length > 0);
    assert.ok(PASS_TIERS[i].astralReward.label.length > 0);
  }

  const p0 = getPassProgressFromXp(0);
  assert.equal(p0.level, 0);
  assert.equal(p0.currentTierXp, 0);

  const p3 = getPassProgressFromXp(350);
  assert.equal(p3.level, 3);
  assert.equal(p3.currentTierXp, 50);

  const pMax = getPassProgressFromXp(999999);
  assert.equal(pMax.level, 40);
  assert.equal(pMax.progress, 1);

  for (const trail of AURA_TRAILS) {
    assert.ok(AURA_TRAIL_MAP[trail.id]);
  }
  for (const enemy of ENEMY_BESTIARY) {
    assert.ok(ENEMY_BESTIARY_MAP[enemy.kind]);
    assert.ok(ENEMY_SPRITES[enemy.kind], `Missing sprite for ${enemy.kind}`);
  }

  assert.equal(computeWorldStars(false, 0, 10, 10), 0);
  assert.equal(computeWorldStars(true, 10, 0, 5), 1);
  assert.equal(computeWorldStars(true, 2, 1, 5), 2);
  assert.equal(computeWorldStars(true, 0, 3, 5), 3);
});

test('Todos os 50 biomas têm metadados completos e os 30 novos biomas têm cenários dedicados', () => {
  const biomeIds = Object.keys(BIOME_META) as BiomeId[];
  assert.equal(biomeIds.length, 50);
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

  let customNewCount = 0;
  for (const b of biomeIds) {
    const meta = BIOME_META[b];
    assert.ok(meta.name.length > 0 && meta.skyTop && meta.skyMid && meta.skyBottom && meta.accent);
    if (drawNewBiomeSpectacle(mockCtx, b, meta, 0, 0, 10, 2, 20, 4, 1.5)) {
      customNewCount++;
    }
    drawNewBiomeForegroundWeather(mockCtx, b, meta, 10, 2, 1.5);
  }
  assert.equal(customNewCount, 30, 'Expected all 30 new biomes to have dedicated spectacle backdrops');

  for (const [npcId, sprite] of Object.entries(NPC_SPRITES)) {
    for (const frame of sprite.frames) {
      const w = frame[0].length;
      for (const row of frame) {
        assert.equal(row.length, w, `NPC ${npcId} inconsistent row width`);
        for (const ch of row) {
          if (ch === '.' || ch === ' ') continue;
          assert.ok(sprite.palette[ch] !== undefined, `NPC ${npcId} invalid palette key '${ch}'`);
        }
      }
    }
  }
});

test('Engine Passe Estelar, Missões, Estrelas, Cofre Diário, Trilhas, Bounties e 24 Novos Inimigos funcionam', () => {
  const engine = new GameEngine(() => {});
  engine.startPlaying(false);
  engine.assist.invincible = true;

  // Daily Reward Streak
  assert.equal(engine.canClaimDailyReward(), true);
  const coinsStart = engine.astralCoins;
  assert.equal(engine.claimDailyReward(), true);
  assert.equal(engine.canClaimDailyReward(), false);
  assert.ok(engine.astralCoins > coinsStart);

  // Unlock Astral Pass & claim tiers
  engine.addAstralCoins(PASS_ASTRAL_UNLOCK_COST + 50);
  assert.equal(engine.unlockAstralPass(), true);
  assert.equal(engine.passAstralUnlocked, true);

  engine.grantPlayerXp(500);
  assert.ok(engine.passXp >= 500);
  assert.equal(engine.claimPassReward(1, 'free'), true);
  assert.equal(engine.claimPassReward(1, 'astral'), true);
  assert.equal(engine.claimPassReward(1, 'free'), false);
  const claimedBulk = engine.claimAllPassRewards();
  assert.ok(claimedBulk >= 2);

  // Mission claim
  engine.missionStats.enemiesDefeated = 20;
  assert.equal(engine.claimMission('daily_enemies_12'), true);
  assert.equal(engine.claimMission('daily_enemies_12'), false);

  // Star milestone claim
  engine.worldStars[0] = 3;
  assert.equal(engine.getTotalWorldStars(), 3);
  assert.equal(engine.claimStarMilestone(3), true);
  assert.equal(engine.claimStarMilestone(3), false);

  // Aura trail buy + equip
  engine.addAstralCoins(200);
  assert.equal(engine.equipOrBuyAuraTrail('aurora'), true);
  assert.equal(engine.equippedAuraTrail, 'aurora');

  // Enemy bounty claim
  engine.enemyKills['enemy_rift_stalker'] = 10;
  assert.equal(engine.claimEnemyBounty('enemy_rift_stalker'), true);
  assert.equal(engine.claimEnemyBounty('enemy_rift_stalker'), false);

  // Step all 24 new enemy kinds cleanly without errors
  const newEnemyKinds: EntityKind[] = [
    'enemy_rift_stalker',
    'enemy_cryo_turret',
    'enemy_chrono_weaver',
    'enemy_void_leech',
    'enemy_shield_phalanx',
    'enemy_chain_tesla',
    'enemy_spore_splitter',
    'enemy_magma_slug',
    'enemy_prism_cherub',
    'enemy_gravity_imp',
    'enemy_blade_dancer',
    'enemy_ember_phoenix',
    'enemy_anchor_brute',
    'enemy_echo_assassin',
    'enemy_magnet_core',
    'enemy_amber_wasp',
    'enemy_rune_monolith',
    'enemy_tidal_jelly',
    'enemy_clock_spider',
    'enemy_solar_acolyte',
    'enemy_shadow_hook',
    'enemy_crystal_gargoyle',
    'enemy_star_bomber',
    'enemy_abyss_knight',
  ];

  const px = engine.player.x;
  const py = engine.player.y;
  engine.liveEntities = newEnemyKinds.map((kind, i) => ({
    def: { id: `new_e_${i}`, kind, x: px + 40 + (i % 6) * 14, y: py - Math.floor(i / 6) * 8 },
    x: px + 40 + (i % 6) * 14,
    y: py - Math.floor(i / 6) * 8,
    w: 14,
    h: 14,
    vx: 0,
    vy: 0,
    homeX: px + 40 + (i % 6) * 14,
    homeY: py - Math.floor(i / 6) * 8,
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

  for (let f = 0; f < 90; f++) {
    engine.step(1 / 60, emptyInput);
  }
  assert.ok(engine.projectiles.some((pr) => pr.active), 'Expected new enemies to fire projectiles');

  const snap = engine.getSnapshot();
  assert.equal(snap.equippedAuraTrail, 'aurora');
  assert.ok(snap.totalWorldStars >= 3);
  assert.equal(snap.passAstralUnlocked, true);
});
