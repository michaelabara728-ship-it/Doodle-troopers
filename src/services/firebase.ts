/**
 * Firebase Realtime Database direct browser client.
 * Connects directly to Firebase Realtime Database without requiring a custom game server or websockets.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  onDisconnect,
  type Database,
  type Unsubscribe,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { AvatarCustomization, PlayerState } from '../types/game';

// Stored config check (cleans up any old battle-toon-arena dummy URL)
const getStoredConfig = () => {
  try {
    const local = localStorage.getItem('battle_toon_firebase_config');
    if (local) {
      if (local.includes('battle-toon-arena')) {
        localStorage.removeItem('battle_toon_firebase_config');
        return null;
      }
      return JSON.parse(local);
    }
  } catch {
    // Ignore invalid JSON
  }
  return null;
};

const stored = getStoredConfig();

export const firebaseConfig = stored || {
  databaseURL: "https://multi-game-65552-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "multi-game-65552",
  authDomain: "multi-game-65552.firebaseapp.com",
  storageBucket: "multi-game-65552.appspot.com",
};

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Database = getDatabase(app, firebaseConfig.databaseURL);

/**
 * 10-second timeout utility
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 10000,
  actionName = 'operation'
): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const err: any = new Error(`Request timed out after ${timeoutMs / 1000}s while ${actionName}. Check your network or database rules.`);
      err.code = 'TIMEOUT';
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Listen to Firebase connection state via .info/connected
 */
export function listenToFirebaseConnection(onStatusChange: (connected: boolean) => void): Unsubscribe {
  const connectedRef = ref(db, '.info/connected');
  return onValue(connectedRef, (snap) => {
    const isConnected = snap.val() === true;
    onStatusChange(isConnected);
  });
}

// Save custom config (if user provides one via UI)
export function updateFirebaseConfig(newConfig: any) {
  try {
    localStorage.setItem('battle_toon_firebase_config', JSON.stringify(newConfig));
    window.location.reload();
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
  }
}

export interface FirebaseLobbyPlayer {
  id: string;
  name: string;
  color: string;
  avatar: AvatarCustomization;
  isHost: boolean;
  joinedAt: number;
}

export interface FirebaseRoomSummary {
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers?: number;
  mapId: string;
  status: string;
}

export interface FirebaseRoomData {
  code: string;
  hostId: string;
  hostName: string;
  mapId: string;
  status: 'lobby' | 'in_game' | 'ended';
  createdAt: number;
  startedAt?: number;
  players?: Record<string, FirebaseLobbyPlayer>;
  gameStates?: Record<string, Partial<PlayerState>>;
  bullets?: Record<string, any>;
  events?: Record<string, any>;
}

/**
 * Generate 4-letter uppercase code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new multiplayer room in Firebase Realtime Database
 */
export async function createFirebaseRoom(
  playerId: string,
  playerName: string,
  playerColor: string,
  avatar: AvatarCustomization,
  mapId: string
): Promise<{ roomCode: string; room: FirebaseRoomData }> {
  const code = generateRoomCode();
  const roomRef = ref(db, `rooms/${code}`);

  const hostPlayer: FirebaseLobbyPlayer = {
    id: playerId,
    name: playerName,
    color: playerColor,
    avatar,
    isHost: true,
    joinedAt: Date.now(),
  };

  const roomData: FirebaseRoomData = {
    code,
    hostId: playerId,
    hostName: playerName,
    mapId,
    status: 'lobby',
    createdAt: Date.now(),
    players: {
      [playerId]: hostPlayer,
    },
  };

  await withTimeout(set(roomRef, roomData), 10000, 'creating room');

  // Setup disconnect cleanup for host
  try {
    const playerRef = ref(db, `rooms/${code}/players/${playerId}`);
    onDisconnect(playerRef).remove();
  } catch (e) {
    console.warn('onDisconnect failed:', e);
  }

  return { roomCode: code, room: roomData };
}

/**
 * Join an existing multiplayer room in Firebase Realtime Database
 */
export async function joinFirebaseRoom(
  roomCodeInput: string,
  playerId: string,
  playerName: string,
  playerColor: string,
  avatar: AvatarCustomization
): Promise<FirebaseRoomData> {
  const code = (roomCodeInput || '').toUpperCase().trim();
  if (code.length !== 4) {
    const err: any = new Error('Room code must be 4 characters');
    err.code = 'INVALID_CODE';
    throw err;
  }

  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await withTimeout(get(roomRef), 10000, 'finding room');

  if (!snapshot.exists()) {
    const err: any = new Error('Room not found');
    err.code = 'ROOM_NOT_FOUND';
    throw err;
  }

  const roomData = snapshot.val() as FirebaseRoomData;

  const playerRef = ref(db, `rooms/${code}/players/${playerId}`);
  const newPlayer: FirebaseLobbyPlayer = {
    id: playerId,
    name: playerName,
    color: playerColor,
    avatar,
    isHost: false,
    joinedAt: Date.now(),
  };

  await withTimeout(set(playerRef, newPlayer), 10000, 'joining room');

  try {
    onDisconnect(playerRef).remove();
  } catch (e) {
    console.warn('onDisconnect failed:', e);
  }

  return roomData;
}

/**
 * Start Match (Host only)
 */
export async function startFirebaseMatch(roomCode: string): Promise<void> {
  const statusRef = ref(db, `rooms/${roomCode}/status`);
  const startedAtRef = ref(db, `rooms/${roomCode}/startedAt`);
  await set(statusRef, 'in_game');
  await set(startedAtRef, Date.now());
}

/**
 * Leave Room
 */
export async function leaveFirebaseRoom(roomCode: string, playerId: string): Promise<void> {
  try {
    const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
    await remove(playerRef);

    // Check if room is empty
    const roomRef = ref(db, `rooms/${roomCode}/players`);
    const snap = await get(roomRef);
    if (!snap.exists() || Object.keys(snap.val() || {}).length === 0) {
      await remove(ref(db, `rooms/${roomCode}`));
    }
  } catch (err) {
    console.error('Error leaving room:', err);
  }
}

/**
 * Listen to room lobby & status updates in real time
 */
export function listenToRoom(
  roomCode: string,
  onUpdate: (room: FirebaseRoomData | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const roomRef = ref(db, `rooms/${roomCode}`);
  return onValue(
    roomRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.val() as FirebaseRoomData);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error('Firebase Realtime DB listener error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Sync player gameplay delta state
 */
export async function syncPlayerStateToFirebase(
  roomCode: string,
  playerId: string,
  state: Partial<PlayerState>
): Promise<void> {
  const pRef = ref(db, `rooms/${roomCode}/gameStates/${playerId}`);
  await update(pRef, state);
}

/**
 * Listen to all player states in real time
 */
export function listenToGameStates(
  roomCode: string,
  onUpdate: (states: Record<string, Partial<PlayerState>>) => void
): Unsubscribe {
  const statesRef = ref(db, `rooms/${roomCode}/gameStates`);
  return onValue(statesRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.val());
    }
  });
}

/**
 * Broadcast bullet spawn to Firebase
 */
export async function broadcastBulletToFirebase(
  roomCode: string,
  bullet: any
): Promise<void> {
  const bulletRef = ref(db, `rooms/${roomCode}/bullets/${bullet.id}`);
  await set(bulletRef, bullet);
}

/**
 * Listen to bullets spawned in match
 */
export function listenToBullets(
  roomCode: string,
  onBullet: (bullet: any) => void
): Unsubscribe {
  const bulletsRef = ref(db, `rooms/${roomCode}/bullets`);
  return onValue(bulletsRef, (snap) => {
    if (snap.exists()) {
      const data = snap.val();
      Object.values(data).forEach((b: any) => {
        onBullet(b);
      });
    }
  });
}

/**
 * Send chat message to Firebase
 */
export async function sendChatMessageToFirebase(roomCode: string, message: any): Promise<void> {
  const msgRef = ref(db, `rooms/${roomCode}/chat/${message.id}`);
  await set(msgRef, message);
}

/**
 * Listen to chat messages in Firebase
 */
export function listenToChat(
  roomCode: string,
  onMessage: (msg: any) => void
): Unsubscribe {
  const chatRef = ref(db, `rooms/${roomCode}/chat`);
  return onValue(chatRef, (snap) => {
    if (snap.exists()) {
      const msgs = Object.values(snap.val());
      msgs.forEach((m: any) => onMessage(m));
    }
  });
}

export {
  initializeApp,
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  onDisconnect,
};
