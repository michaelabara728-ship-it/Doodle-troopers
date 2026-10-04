export type WeaponType =
  | 'pistol'
  | 'revolver'
  | 'smg'
  | 'rifle'
  | 'shotgun'
  | 'sniper'
  | 'rocket'
  | 'minigun'
  | 'flamethrower'
  | 'plasma'
  | 'saw'
  | 'grenade';

export type GrenadeType = 'frag' | 'stun' | 'gas';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  damage: number;
  ammoMax: number; // In clip
  ammoReserve: number; // In reserve
  fireRate: number; // Bullets per second
  reloadTime: number; // In seconds
  bulletSpeed: number;
  spread: number; // In radians
  pellets?: number;
  color: string;
  bulletColor: string;
  bulletRadius: number;
  isExplosive?: boolean;
  isOneHanded?: boolean;
  recoil: number;
  icon: string;
}

export type HeadwearType = 'helmet' | 'beret' | 'bandana' | 'beanie' | 'boonie' | 'aviator';
export type CamoType = 'jungle' | 'desert' | 'urban' | 'arctic' | 'blackops' | 'crimson';
export type SkinToneType = '#fde047' | '#fcd34d' | '#d97706' | '#92400e';

export interface AvatarCustomization {
  headwear: HeadwearType;
  camo: CamoType;
  skinTone: SkinToneType;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string; // Theme color
  avatar: AvatarCustomization;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aimAngle: number;
  isGrounded: boolean;
  isJetpacking: boolean;
  isCrouching?: boolean;
  bodyTilt?: number;
  isShooting: boolean;
  isMeleeing?: boolean;
  meleeTimer?: number;
  facingLeft: boolean;
  health: number;
  maxHealth: number;
  fuel: number;
  maxFuel: number;
  lives: number;
  currentWeapon: WeaponType;
  secondaryWeapon?: WeaponType;
  isDualWielding: boolean;
  ammo: number;
  reserveAmmo: number;
  grenades: number;
  currentGrenadeType?: GrenadeType;
  grenadeInventory?: Record<GrenadeType, number>;
  stunTimer?: number;
  burnTimer?: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  kills: number;
  deaths: number;
  score: number;
  isDead: boolean;
  respawnTimeRemaining: number;
  isBot?: boolean;
  timeSinceLastDamage?: number;
  isRegeneratingHealth?: boolean;
  activeEmote?: {
    emote: string;
    text?: string;
    expiresAt: number;
  };
}

export interface Bullet {
  id: string;
  shooterId: string;
  weaponType: WeaponType;
  grenadeType?: GrenadeType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  lifespan: number; // Seconds
  createdAt: number;
  isExplosive?: boolean;
  bouncesLeft?: number;
}

export interface GasCloud {
  id: string;
  x: number;
  y: number;
  radius: number;
  shooterId: string;
  duration: number; // Seconds remaining
  maxDuration: number;
}

export interface RagdollCorpse {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vRot: number;
  headwear: HeadwearType;
  camo: CamoType;
  skinTone: SkinToneType;
  // Detached flying helmet
  helmetX: number;
  helmetY: number;
  helmetVx: number;
  helmetVy: number;
  helmetAngle: number;
  helmetVRot: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  decay: number;
  type: 'spark' | 'smoke' | 'fire' | 'blood' | 'ring' | 'debris' | 'flash' | 'toxic_gas' | 'electric_arc' | 'casing';
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  alpha: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  type?: 'rock' | 'grass' | 'snow' | 'wood' | 'metal';
  isJumpPad?: boolean;
}

export interface Pickup {
  id: string;
  x: number;
  y: number;
  type: 'weapon' | 'medkit' | 'grenade' | 'stun_grenade' | 'gas_grenade';
  weaponType?: WeaponType;
  grenadeType?: GrenadeType;
  respawnTime: number; // Seconds
  isAvailable: boolean;
  currentTimer: number;
}

export interface SceneryItem {
  type: 'palm_tree' | 'pine_tree' | 'cabin' | 'cactus' | 'bush' | 'rock' | 'tent';
  x: number;
  y: number;
  scale?: number;
}

export interface MapData {
  id: string;
  name: string;
  theme: string;
  bgGradient: [string, string, string];
  width: number;
  height: number;
  platforms: Platform[];
  spawnPoints: { x: number; y: number }[];
  pickups: Pickup[];
  scenery?: SceneryItem[];
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  killerColor: string;
  victimName: string;
  victimColor: string;
  weapon: WeaponType | 'melee' | 'grenade' | 'gas';
  timestamp: number;
}

export interface RoomInfo {
  code: string;
  mapId: string;
  hostId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'in_game' | 'ended';
  players: { id: string; name: string; color: string; kills: number }[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  isEmote?: boolean;
  emote?: string;
  timestamp: number;
  system?: boolean;
}

export interface EmoteDef {
  id: string;
  emoji: string;
  label: string;
  category: 'reaction' | 'tactical' | 'taunt';
}

// Network messages
export type ClientMessage =
  | { type: 'create_room'; playerName: string; avatar: AvatarCustomization; mapId: string }
  | { type: 'join_room'; roomCode: string; playerName: string; avatar: AvatarCustomization }
  | { type: 'sync_player'; state: Partial<PlayerState> }
  | { type: 'shoot_bullet'; bullet: Omit<Bullet, 'createdAt'> }
  | { type: 'melee_hit'; targetId: string; damage: number }
  | { type: 'bullet_hit'; bulletId: string; targetId: string; damage: number; weaponType: WeaponType }
  | { type: 'pickup_collected'; pickupId: string }
  | { type: 'chat_message'; text: string }
  | { type: 'send_emote'; emote: string; label?: string }
  | { type: 'vote_map'; mapId: string }
  | { type: 'play_again' }
  | { type: 'leave_room' }
  | { type: 'ping'; timestamp: number };

export type ServerMessage =
  | { type: 'room_created'; roomCode: string; playerId: string; mapId: string }
  | { type: 'room_joined'; roomCode: string; playerId: string; mapId: string; players: PlayerState[]; chatHistory?: ChatMessage[] }
  | { type: 'error'; message: string }
  | { type: 'player_joined'; player: PlayerState }
  | { type: 'player_left'; playerId: string }
  | { type: 'sync_state'; players: Record<string, Partial<PlayerState>> }
  | { type: 'spawn_bullet'; bullet: Bullet }
  | { type: 'player_killed'; killerId: string; victimId: string; weaponType: WeaponType | 'melee' | 'grenade' | 'gas'; killerKills: number }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'player_emote'; playerId: string; playerName: string; emote: string; label?: string; timestamp: number }
  | { type: 'pickup_state'; pickups: { id: string; isAvailable: boolean }[] }
  | { type: 'map_votes_updated'; votes: Record<string, string>; mapTallies: Record<string, number> }
  | { type: 'game_over'; winnerId: string; winnerName: string; leaderboard: { name: string; kills: number; deaths: number; color: string }[] }
  | { type: 'game_restarted'; mapId: string }
  | { type: 'pong'; clientTimestamp: number; serverTimestamp: number };
