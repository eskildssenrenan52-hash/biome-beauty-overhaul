// @ts-nocheck -- imported game code, written for a looser TS config
// Animated multi-layered spectacles & atmospheric foregrounds for the 20 Underworld Biomes
import type { GameEngine } from './engine';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from './types';
import type { BiomeMeta } from './worldData';

export function isUnderworldBiome(biome: string): boolean {
  return (
    biome === 'styx_ferry' ||
    biome === 'asphodel_wastes' ||
    biome === 'brass_tartarus' ||
    biome === 'brimstone_caldera' ||
    biome === 'blood_aqueduct' ||
    biome === 'bone_ossuary' ||
    biome === 'cocytus_trench' ||
    biome === 'phlegethon_rapids' ||
    biome === 'acheron_gorge' ||
    biome === 'lethe_depths' ||
    biome === 'wailing_spires' ||
    biome === 'iron_dungeon' ||
    biome === 'pestilence_marsh' ||
    biome === 'ash_necropolis' ||
    biome === 'obsidian_labyrinth' ||
    biome === 'hellglass_cathedral' ||
    biome === 'shadow_sanctum' ||
    biome === 'magma_core' ||
    biome === 'void_gate' ||
    biome === 'pandemonium_citadel'
  );
}

export function drawUnderworldSpectacle(
  ctx: CanvasRenderingContext2D,
  biome: string,
  meta: BiomeMeta,
  t: number,
  camX: number
): boolean {
  if (!isUnderworldBiome(biome)) return false;

  // Atmospheric sub-horizon abyssal mist glow
  const glowY = 104 + Math.round(Math.sin(t * 0.7) * 4);
  ctx.fillStyle = meta.accent + '1c';
  ctx.fillRect(0, glowY, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - glowY);

  if (biome === 'styx_ferry' || biome === 'lethe_depths') {
    // Spectral horizon moons & drifting ferry lantern silhouettes
    const mx = 236 - Math.round((camX * 0.04) % 40);
    ctx.fillStyle = meta.accent + '28';
    ctx.fillRect(mx - 14, 18, 28, 28);
    ctx.fillStyle = meta.secondaryAccent + '44';
    ctx.fillRect(mx - 9, 23, 18, 18);

    // Floating ghostly ferry silhouettes crossing distant water
    for (let i = 0; i < 3; i++) {
      const bx = ((i * 124 + t * (9 + i * 3) - camX * 0.14) % (VIRTUAL_WIDTH + 60)) - 30;
      const by = 114 + i * 11 + Math.round(Math.sin(t * 2 + i) * 1.5);
      ctx.fillStyle = '#040a0e';
      ctx.fillRect(Math.round(bx), by, 22, 4);
      ctx.fillRect(Math.round(bx + 4), by - 4, 10, 4);
      ctx.fillStyle = meta.accent;
      ctx.fillRect(Math.round(bx + 17), by - 5, 2, 2);
      ctx.fillStyle = meta.secondaryAccent + '66';
      ctx.fillRect(Math.round(bx + 16), by - 6, 4, 4);
    }
    // Shimmering water bands
    for (let y = 136; y < VIRTUAL_HEIGHT; y += 5) {
      const offset = Math.round(Math.sin(t * 2.2 + y * 0.3) * 8);
      ctx.fillStyle = meta.accent + (y % 10 === 0 ? '2a' : '16');
      ctx.fillRect(((y * 23 + offset) % VIRTUAL_WIDTH), y, 28, 1);
    }
    return true;
  }

  if (biome === 'asphodel_wastes' || biome === 'shadow_sanctum') {
    // Tall gothic willow / shadow monoliths + pulsing spectral eyes in mist
    for (let i = 0; i < 6; i++) {
      const tx = ((i * 68 - camX * 0.12) % (VIRTUAL_WIDTH + 48) + VIRTUAL_WIDTH + 48) % (VIRTUAL_WIDTH + 48) - 24;
      const h = 44 + (i % 3) * 16;
      ctx.fillStyle = meta.mountainFar;
      ctx.fillRect(Math.round(tx), VIRTUAL_HEIGHT - h - 20, 10, h + 20);
      ctx.fillStyle = meta.accent + '33';
      ctx.fillRect(Math.round(tx + 2), VIRTUAL_HEIGHT - h - 18, 2, h);
      // Swaying willow wisps
      const sway = Math.round(Math.sin(t * 1.6 + i) * 3);
      ctx.fillStyle = meta.secondaryAccent + '44';
      ctx.fillRect(Math.round(tx - 6 + sway), VIRTUAL_HEIGHT - h - 12, 3, 18);
      ctx.fillRect(Math.round(tx + 11 + sway), VIRTUAL_HEIGHT - h - 8, 3, 14);
    }
    return true;
  }

  if (biome === 'brass_tartarus' || biome === 'iron_dungeon') {
    // Massive slow rotating Tartarus gears & hanging iron prison cages
    for (let g = 0; g < 3; g++) {
      const gx = 54 + g * 106 - Math.round((camX * 0.08) % 80);
      const gy = 56 + (g % 2) * 26;
      const r = 18 + (g % 2) * 6;
      ctx.strokeStyle = meta.accent + '44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const ang = t * (g % 2 === 0 ? 0.5 : -0.4) + (k * Math.PI) / 4;
        ctx.fillStyle = meta.secondaryAccent + '55';
        ctx.fillRect(Math.round(gx + Math.cos(ang) * r) - 2, Math.round(gy + Math.sin(ang) * r) - 2, 4, 4);
      }
    }
    ctx.lineWidth = 1;
    // Hanging cages swaying gently
    for (let c = 0; c < 4; c++) {
      const cx = ((c * 88 + 20 - camX * 0.16) % (VIRTUAL_WIDTH + 40) + VIRTUAL_WIDTH + 40) % (VIRTUAL_WIDTH + 40) - 20;
      const sway = Math.round(Math.sin(t * 1.4 + c * 1.7) * 2);
      ctx.fillStyle = '#09060c';
      ctx.fillRect(Math.round(cx), 0, 1, 32 + (c % 2) * 14);
      ctx.strokeStyle = meta.accent + '66';
      ctx.strokeRect(Math.round(cx + sway) - 6, 32 + (c % 2) * 14, 12, 16);
    }
    return true;
  }

  if (biome === 'brimstone_caldera' || biome === 'phlegethon_rapids' || biome === 'magma_core') {
    // Boiling volcanic horizon fissures & distant lava cascades
    for (let v = 0; v < 4; v++) {
      const vx = ((v * 92 - camX * 0.1) % (VIRTUAL_WIDTH + 50) + VIRTUAL_WIDTH + 50) % (VIRTUAL_WIDTH + 50) - 25;
      ctx.fillStyle = '#0f0404';
      ctx.beginPath();
      ctx.moveTo(vx - 34, VIRTUAL_HEIGHT);
      ctx.lineTo(vx - 6, 62 + (v % 2) * 14);
      ctx.lineTo(vx + 8, 62 + (v % 2) * 14);
      ctx.lineTo(vx + 38, VIRTUAL_HEIGHT);
      ctx.fill();
      // Flowing lava fall inside caldera
      const pulse = Math.floor(t * 12 + v) % 4;
      ctx.fillStyle = meta.accent + 'aa';
      ctx.fillRect(Math.round(vx - 2), 64 + (v % 2) * 14, 4, 110);
      ctx.fillStyle = meta.secondaryAccent;
      ctx.fillRect(Math.round(vx - 1), 66 + (v % 2) * 14 + pulse * 4, 2, 10);
    }
    return true;
  }

  if (biome === 'blood_aqueduct' || biome === 'hellglass_cathedral') {
    // Tall gothic pointed arches & crimson cascades / shattered rose window
    const rx = 160 - Math.round((camX * 0.04) % 30);
    ctx.strokeStyle = meta.accent + '55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, 46, 26, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = t * 0.15 + (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(rx, 46);
      ctx.lineTo(Math.round(rx + Math.cos(a) * 25), Math.round(46 + Math.sin(a) * 25));
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (let a = 0; a < 5; a++) {
      const ax = ((a * 76 - camX * 0.14) % (VIRTUAL_WIDTH + 40) + VIRTUAL_WIDTH + 40) % (VIRTUAL_WIDTH + 40) - 20;
      ctx.fillStyle = meta.mountainMid;
      ctx.fillRect(Math.round(ax), 58, 12, VIRTUAL_HEIGHT - 58);
      ctx.fillStyle = meta.accent + '66';
      ctx.fillRect(Math.round(ax + 4), 76, 4, VIRTUAL_HEIGHT - 76);
    }
    return true;
  }

  if (biome === 'cocytus_trench' || biome === 'acheron_gorge') {
    // Vertical crystalline ice spires + shimmering subzero aurora ribbons
    for (let x = 0; x < VIRTUAL_WIDTH; x += 6) {
      const wave = Math.sin(x * 0.035 + t * 1.4) * 9 + Math.cos(x * 0.018 - t * 0.9) * 5;
      const ay = Math.round(30 + wave);
      ctx.fillStyle = meta.accent + '26';
      ctx.fillRect(x, ay, 5, 16);
      ctx.fillStyle = meta.secondaryAccent + '33';
      ctx.fillRect(x, ay + 4, 4, 5);
    }
    for (let i = 0; i < 7; i++) {
      const sx = ((i * 54 - camX * 0.15) % (VIRTUAL_WIDTH + 30) + VIRTUAL_WIDTH + 30) % (VIRTUAL_WIDTH + 30) - 15;
      const sh = 50 + (i % 3) * 22;
      ctx.fillStyle = meta.mountainNear;
      ctx.beginPath();
      ctx.moveTo(sx - 12, VIRTUAL_HEIGHT);
      ctx.lineTo(sx, VIRTUAL_HEIGHT - sh);
      ctx.lineTo(sx + 12, VIRTUAL_HEIGHT);
      ctx.fill();
      ctx.fillStyle = meta.secondaryAccent + '44';
      ctx.fillRect(Math.round(sx - 1), VIRTUAL_HEIGHT - sh + 4, 2, sh - 8);
    }
    return true;
  }

  if (biome === 'pandemonium_citadel' || biome === 'void_gate') {
    // Fractured Black Sun Eclipse + floating abyssal obelisks
    const sx = 160;
    const sy = 42;
    ctx.fillStyle = meta.accent + '33';
    ctx.beginPath();
    ctx.arc(sx, sy, 32 + Math.sin(t * 2.4) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.secondaryAccent + '88';
    ctx.beginPath();
    ctx.arc(sx, sy, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050208';
    ctx.beginPath();
    ctx.arc(sx, sy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Solar eclipse flare spikes
    for (let r = 0; r < 10; r++) {
      const a = t * 0.35 + (r * Math.PI * 2) / 10;
      const len = 28 + Math.sin(t * 4 + r) * 5;
      ctx.strokeStyle = r % 2 === 0 ? meta.secondaryAccent + '66' : meta.accent + '66';
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * 21, sy + Math.sin(a) * 21);
      ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
      ctx.stroke();
    }
    return true;
  }

  // Remaining Underworld Biomes (bone_ossuary, wailing_spires, pestilence_marsh, ash_necropolis, obsidian_labyrinth)
  for (let i = 0; i < 6; i++) {
    const ox = ((i * 62 - camX * 0.14) % (VIRTUAL_WIDTH + 32) + VIRTUAL_WIDTH + 32) % (VIRTUAL_WIDTH + 32) - 16;
    const bob = Math.round(Math.sin(t * 1.8 + i) * 3);
    const h = 42 + (i % 3) * 18;
    ctx.fillStyle = meta.mountainNear;
    ctx.fillRect(Math.round(ox), VIRTUAL_HEIGHT - h - bob, 11, h + bob);
    ctx.fillStyle = meta.accent + '66';
    ctx.fillRect(Math.round(ox + 3), VIRTUAL_HEIGHT - h - bob + 4, 4, 4);
    ctx.fillRect(Math.round(ox + 4), VIRTUAL_HEIGHT - h - bob + 12, 2, 16);
  }
  return true;
}

export function drawUnderworldForegroundWeather(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  meta: BiomeMeta
): void {
  const biome = engine.currentRoom.biome;
  if (!isUnderworldBiome(biome)) return;
  const t = engine.elapsedSeconds;

  // Rising embers / souls / snow / spores across foreground
  const rising =
    biome === 'brimstone_caldera' ||
    biome === 'phlegethon_rapids' ||
    biome === 'magma_core' ||
    biome === 'pandemonium_citadel' ||
    biome === 'styx_ferry' ||
    biome === 'brass_tartarus';

  for (let i = 0; i < 20; i++) {
    const px = ((i * 41 + Math.sin(t * 1.5 + i) * 12 + (rising ? 0 : t * 18)) % VIRTUAL_WIDTH + VIRTUAL_WIDTH) % VIRTUAL_WIDTH;
    const rawY = t * (20 + (i % 4) * 6) + i * 19;
    const py = rising
      ? VIRTUAL_HEIGHT - (rawY % VIRTUAL_HEIGHT)
      : rawY % VIRTUAL_HEIGHT;
    ctx.fillStyle = i % 3 === 0 ? meta.secondaryAccent + 'aa' : meta.accent + '88';
    ctx.fillRect(Math.round(px), Math.round(py), i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
  }
}
