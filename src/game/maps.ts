import { MapData } from '../types/game';

export const MAPS: Record<string, MapData> = {
  jungle: {
    id: 'jungle',
    name: 'Jungle Outpost',
    theme: 'Tropical Guerrilla Outpost',
    bgGradient: ['#062314', '#0d4022', '#14532d'],
    width: 1500,
    height: 850,
    platforms: [
      // Ground floor with grassy rock top
      { x: 0, y: 800, w: 1500, h: 50, color: '#166534', type: 'grass' },
      { x: 0, y: 0, w: 1500, h: 25, color: '#14532d', type: 'rock' },
      { x: 0, y: 0, w: 25, h: 850, color: '#14532d', type: 'rock' },
      { x: 1475, y: 0, w: 25, h: 850, color: '#14532d', type: 'rock' },

      // Low rock ledges with foliage
      { x: 100, y: 660, w: 280, h: 24, color: '#15803d', type: 'grass' },
      { x: 480, y: 680, w: 220, h: 22, color: '#15803d', type: 'grass' },
      { x: 800, y: 680, w: 220, h: 22, color: '#15803d', type: 'grass' },
      { x: 1120, y: 660, w: 280, h: 24, color: '#15803d', type: 'grass' },

      // Suspended jungle bridge
      { x: 400, y: 510, w: 700, h: 20, color: '#78350f', type: 'wood' },

      // Watch posts
      { x: 80, y: 410, w: 220, h: 22, color: '#15803d', type: 'grass' },
      { x: 1200, y: 410, w: 220, h: 22, color: '#15803d', type: 'grass' },

      // Canopy cliff nests
      { x: 280, y: 270, w: 240, h: 20, color: '#166534', type: 'grass' },
      { x: 980, y: 270, w: 240, h: 20, color: '#166534', type: 'grass' },
      { x: 630, y: 240, w: 240, h: 20, color: '#78350f', type: 'wood' },

      // Jump geysers / trampoline pads
      { x: 380, y: 785, w: 50, h: 15, color: '#22c55e', isJumpPad: true },
      { x: 1070, y: 785, w: 50, h: 15, color: '#22c55e', isJumpPad: true },
    ],
    spawnPoints: [
      { x: 180, y: 600 },
      { x: 1300, y: 600 },
      { x: 750, y: 450 },
      { x: 380, y: 210 },
      { x: 1120, y: 210 },
      { x: 750, y: 180 },
    ],
    pickups: [
      { id: 'pk_j_smg', x: 590, y: 645, type: 'weapon', weaponType: 'smg', respawnTime: 10, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_rfl', x: 910, y: 645, type: 'weapon', weaponType: 'rifle', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_sg', x: 180, y: 375, type: 'weapon', weaponType: 'shotgun', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_snp', x: 750, y: 205, type: 'weapon', weaponType: 'sniper', respawnTime: 16, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_rkt', x: 750, y: 475, type: 'weapon', weaponType: 'rocket', respawnTime: 18, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_rev', x: 240, y: 625, type: 'weapon', weaponType: 'revolver', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_saw', x: 1240, y: 625, type: 'weapon', weaponType: 'saw', respawnTime: 16, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_flm', x: 630, y: 205, type: 'weapon', weaponType: 'flamethrower', respawnTime: 15, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_grn', x: 1310, y: 375, type: 'grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_stun', x: 80, y: 375, type: 'stun_grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_gas', x: 1200, y: 375, type: 'gas_grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_med1', x: 380, y: 235, type: 'medkit', respawnTime: 15, isAvailable: true, currentTimer: 0 },
      { id: 'pk_j_med2', x: 1120, y: 235, type: 'medkit', respawnTime: 15, isAvailable: true, currentTimer: 0 },
    ],
    scenery: [
      { type: 'palm_tree', x: 160, y: 660, scale: 1.2 },
      { type: 'palm_tree', x: 1240, y: 660, scale: 1.3 },
      { type: 'palm_tree', x: 560, y: 510, scale: 1.0 },
      { type: 'palm_tree', x: 920, y: 510, scale: 1.1 },
      { type: 'bush', x: 260, y: 800, scale: 1.0 },
      { type: 'bush', x: 720, y: 800, scale: 1.2 },
      { type: 'bush', x: 1180, y: 800, scale: 1.0 },
    ],
  },

  snow: {
    id: 'snow',
    name: 'Snow Mountain',
    theme: 'Frosty Alpine Ridge',
    bgGradient: ['#0f172a', '#1e293b', '#334155'],
    width: 1500,
    height: 850,
    platforms: [
      // Frozen ground
      { x: 0, y: 800, w: 1500, h: 50, color: '#e2e8f0', type: 'snow' },
      { x: 0, y: 0, w: 1500, h: 25, color: '#334155', type: 'rock' },
      { x: 0, y: 0, w: 25, h: 850, color: '#334155', type: 'rock' },
      { x: 1475, y: 0, w: 25, h: 850, color: '#334155', type: 'rock' },

      // Icy lower ledges
      { x: 120, y: 670, w: 260, h: 22, color: '#f1f5f9', type: 'snow' },
      { x: 480, y: 660, w: 240, h: 22, color: '#f1f5f9', type: 'snow' },
      { x: 780, y: 660, w: 240, h: 22, color: '#f1f5f9', type: 'snow' },
      { x: 1120, y: 670, w: 260, h: 22, color: '#f1f5f9', type: 'snow' },

      // Timber cabin terrace
      { x: 440, y: 490, w: 620, h: 22, color: '#78350f', type: 'wood' },

      // Mid cliff ledges
      { x: 60, y: 420, w: 240, h: 20, color: '#cbd5e1', type: 'snow' },
      { x: 1200, y: 420, w: 240, h: 20, color: '#cbd5e1', type: 'snow' },

      // High sniper peaks
      { x: 280, y: 260, w: 240, h: 20, color: '#f8fafc', type: 'snow' },
      { x: 980, y: 260, w: 240, h: 20, color: '#f8fafc', type: 'snow' },
      { x: 630, y: 230, w: 240, h: 20, color: '#78350f', type: 'wood' },

      // Super jump steam vents
      { x: 380, y: 785, w: 50, h: 15, color: '#38bdf8', isJumpPad: true },
      { x: 1070, y: 785, w: 50, h: 15, color: '#38bdf8', isJumpPad: true },
    ],
    spawnPoints: [
      { x: 180, y: 610 },
      { x: 1300, y: 610 },
      { x: 750, y: 430 },
      { x: 380, y: 200 },
      { x: 1120, y: 200 },
      { x: 750, y: 170 },
    ],
    pickups: [
      { id: 'pk_s_smg', x: 580, y: 625, type: 'weapon', weaponType: 'smg', respawnTime: 10, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_rfl', x: 900, y: 625, type: 'weapon', weaponType: 'rifle', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_sg', x: 180, y: 385, type: 'weapon', weaponType: 'shotgun', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_snp', x: 750, y: 195, type: 'weapon', weaponType: 'sniper', respawnTime: 16, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_rkt', x: 750, y: 455, type: 'weapon', weaponType: 'rocket', respawnTime: 18, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_pls', x: 200, y: 635, type: 'weapon', weaponType: 'plasma', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_mini', x: 950, y: 455, type: 'weapon', weaponType: 'minigun', respawnTime: 18, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_rev', x: 630, y: 195, type: 'weapon', weaponType: 'revolver', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_grn', x: 1310, y: 385, type: 'grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_stun', x: 60, y: 385, type: 'stun_grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_gas', x: 1200, y: 385, type: 'gas_grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_med1', x: 380, y: 225, type: 'medkit', respawnTime: 15, isAvailable: true, currentTimer: 0 },
      { id: 'pk_s_med2', x: 1120, y: 225, type: 'medkit', respawnTime: 15, isAvailable: true, currentTimer: 0 },
    ],
    scenery: [
      { type: 'cabin', x: 750, y: 490, scale: 1.1 },
      { type: 'pine_tree', x: 160, y: 670, scale: 1.2 },
      { type: 'pine_tree', x: 1240, y: 670, scale: 1.3 },
      { type: 'pine_tree', x: 340, y: 260, scale: 1.0 },
      { type: 'pine_tree', x: 1060, y: 260, scale: 1.0 },
    ],
  },

  desert: {
    id: 'desert',
    name: 'Desert Badlands',
    theme: 'Canyon Outpost & Quarry',
    bgGradient: ['#291307', '#451a03', '#78350f'],
    width: 1500,
    height: 850,
    platforms: [
      // Ground sandstone
      { x: 0, y: 800, w: 1500, h: 50, color: '#9a3412', type: 'rock' },
      { x: 0, y: 0, w: 1500, h: 25, color: '#451a03', type: 'rock' },
      { x: 0, y: 0, w: 25, h: 850, color: '#7c2d12', type: 'rock' },
      { x: 1475, y: 0, w: 25, h: 850, color: '#7c2d12', type: 'rock' },

      // Low rock formations
      { x: 100, y: 670, w: 260, h: 22, color: '#c2410c', type: 'rock' },
      { x: 480, y: 670, w: 220, h: 22, color: '#c2410c', type: 'rock' },
      { x: 800, y: 670, w: 220, h: 22, color: '#c2410c', type: 'rock' },
      { x: 1140, y: 670, w: 260, h: 22, color: '#c2410c', type: 'rock' },

      // Wooden mine scaffold bridge
      { x: 420, y: 510, w: 660, h: 20, color: '#b45309', type: 'wood' },

      // Left & Right watchtowers
      { x: 80, y: 410, w: 220, h: 22, color: '#c2410c', type: 'rock' },
      { x: 1200, y: 410, w: 220, h: 22, color: '#c2410c', type: 'rock' },

      // High sniper mesas
      { x: 280, y: 270, w: 240, h: 20, color: '#ea580c', type: 'rock' },
      { x: 980, y: 270, w: 240, h: 20, color: '#ea580c', type: 'rock' },
      { x: 630, y: 240, w: 240, h: 20, color: '#f59e0b', type: 'wood' },

      // Geyser vents
      { x: 380, y: 785, w: 50, h: 15, color: '#f97316', isJumpPad: true },
      { x: 1070, y: 785, w: 50, h: 15, color: '#f97316', isJumpPad: true },
    ],
    spawnPoints: [
      { x: 180, y: 610 },
      { x: 1300, y: 610 },
      { x: 750, y: 450 },
      { x: 380, y: 210 },
      { x: 1120, y: 210 },
      { x: 750, y: 180 },
    ],
    pickups: [
      { id: 'pk_d_smg', x: 590, y: 635, type: 'weapon', weaponType: 'smg', respawnTime: 10, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_rfl', x: 910, y: 635, type: 'weapon', weaponType: 'rifle', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_sg', x: 180, y: 375, type: 'weapon', weaponType: 'shotgun', respawnTime: 12, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_snp', x: 750, y: 205, type: 'weapon', weaponType: 'sniper', respawnTime: 16, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_rkt', x: 750, y: 475, type: 'weapon', weaponType: 'rocket', respawnTime: 18, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_mini', x: 200, y: 635, type: 'weapon', weaponType: 'minigun', respawnTime: 18, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_flm', x: 980, y: 235, type: 'weapon', weaponType: 'flamethrower', respawnTime: 15, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_pls', x: 630, y: 205, type: 'weapon', weaponType: 'plasma', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_saw', x: 480, y: 635, type: 'weapon', weaponType: 'saw', respawnTime: 16, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_grn', x: 1310, y: 375, type: 'grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_stun', x: 80, y: 375, type: 'stun_grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_gas', x: 1200, y: 375, type: 'gas_grenade', respawnTime: 14, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_med1', x: 380, y: 235, type: 'medkit', respawnTime: 15, isAvailable: true, currentTimer: 0 },
      { id: 'pk_d_med2', x: 1120, y: 235, type: 'medkit', respawnTime: 15, isAvailable: true, currentTimer: 0 },
    ],
    scenery: [
      { type: 'cactus', x: 160, y: 670, scale: 1.2 },
      { type: 'cactus', x: 1260, y: 670, scale: 1.1 },
      { type: 'cactus', x: 600, y: 800, scale: 1.3 },
      { type: 'cactus', x: 940, y: 800, scale: 1.0 },
      { type: 'rock', x: 360, y: 800, scale: 1.2 },
      { type: 'rock', x: 1120, y: 800, scale: 1.2 },
    ],
  },
};
