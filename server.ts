import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClientMessage, PlayerState, ServerMessage, WeaponType, ChatMessage } from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ConnectedPlayer {
  ws: WebSocket;
  id: string;
  name: string;
  color: string;
  roomCode: string;
  state: PlayerState;
  lastPing: number;
}

interface GameRoom {
  code: string;
  mapId: string;
  hostId: string;
  players: Map<string, ConnectedPlayer>;
  status: 'waiting' | 'in_game' | 'ended';
  maxPlayers: number;
  pickups: Map<string, { isAvailable: boolean; respawnAt: number }>;
  mapVotes: Map<string, string>; // playerId -> mapId
  chatMessages: ChatMessage[];
}

const rooms = new Map<string, GameRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastToRoom(room: GameRoom, msg: ServerMessage, excludeWs?: WebSocket) {
  const payload = JSON.stringify(msg);
  room.players.forEach((player) => {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  // Room listing API for convenience / room search
  app.get('/api/rooms', (req, res) => {
    const publicRooms = Array.from(rooms.values()).map((r) => ({
      code: r.code,
      mapId: r.mapId,
      playerCount: r.players.size,
      maxPlayers: r.maxPlayers,
      status: r.status,
    }));
    res.json(publicRooms);
  });

  wss.on('connection', (ws: WebSocket) => {
    let currentPlayer: ConnectedPlayer | null = null;

    ws.on('message', (raw: string) => {
      try {
        const msg: ClientMessage = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'create_room': {
            const roomCode = generateRoomCode();
            const playerId = 'p_' + Math.random().toString(36).substring(2, 9);

            const initialPlayerState: PlayerState = {
              id: playerId,
              name: (msg.playerName || 'Soldier').substring(0, 14),
              color: '#3b82f6',
              avatar: msg.avatar || { headwear: 'helmet', camo: 'jungle', skinTone: '#fde047' },
              x: 200,
              y: 500,
              vx: 0,
              vy: 0,
              aimAngle: 0,
              isGrounded: true,
              isJetpacking: false,
              isShooting: false,
              facingLeft: false,
              health: 100,
              maxHealth: 100,
              fuel: 100,
              maxFuel: 100,
              lives: 3,
              currentWeapon: 'pistol',
              isDualWielding: false,
              ammo: 12,
              reserveAmmo: 60,
              grenades: 3,
              isReloading: false,
              reloadProgress: 1,
              kills: 0,
              deaths: 0,
              score: 0,
              isDead: false,
              respawnTimeRemaining: 0,
            };

            const room: GameRoom = {
              code: roomCode,
              mapId: msg.mapId || 'jungle',
              hostId: playerId,
              players: new Map(),
              status: 'in_game',
              maxPlayers: 6,
              pickups: new Map(),
              mapVotes: new Map(),
              chatMessages: [
                {
                  id: 'sys_' + Math.random().toString(36).substring(2, 9),
                  senderId: 'system',
                  senderName: 'HQ',
                  senderColor: '#38bdf8',
                  text: `Battle Arena initialized! Code: [${roomCode}]`,
                  timestamp: Date.now(),
                  system: true,
                },
              ],
            };

            currentPlayer = {
              ws,
              id: playerId,
              name: initialPlayerState.name,
              color: initialPlayerState.color,
              roomCode,
              state: initialPlayerState,
              lastPing: Date.now(),
            };

            room.players.set(playerId, currentPlayer);
            rooms.set(roomCode, room);

            ws.send(
              JSON.stringify({
                type: 'room_created',
                roomCode,
                playerId,
                mapId: room.mapId,
              } as ServerMessage)
            );
            break;
          }

          case 'join_room': {
            const code = (msg.roomCode || '').toUpperCase().trim();
            const room = rooms.get(code);

            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found! Check the 4-letter code.' } as ServerMessage));
              return;
            }

            if (room.players.size >= room.maxPlayers) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room is full (max 6 players)!' } as ServerMessage));
              return;
            }

            const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
            const initialPlayerState: PlayerState = {
              id: playerId,
              name: (msg.playerName || 'Soldier').substring(0, 14),
              color: '#ef4444',
              avatar: msg.avatar || { headwear: 'helmet', camo: 'jungle', skinTone: '#fde047' },
              x: 300 + Math.random() * 400,
              y: 500,
              vx: 0,
              vy: 0,
              aimAngle: 0,
              isGrounded: true,
              isJetpacking: false,
              isShooting: false,
              facingLeft: false,
              health: 100,
              maxHealth: 100,
              fuel: 100,
              maxFuel: 100,
              lives: 3,
              currentWeapon: 'pistol',
              isDualWielding: false,
              ammo: 12,
              reserveAmmo: 60,
              grenades: 3,
              isReloading: false,
              reloadProgress: 1,
              kills: 0,
              deaths: 0,
              score: 0,
              isDead: false,
              respawnTimeRemaining: 0,
            };

            currentPlayer = {
              ws,
              id: playerId,
              name: initialPlayerState.name,
              color: initialPlayerState.color,
              roomCode: code,
              state: initialPlayerState,
              lastPing: Date.now(),
            };

            // Existing players snapshot
            const existingPlayers = Array.from(room.players.values()).map((p) => p.state);

            room.players.set(playerId, currentPlayer);

            // Send confirmation to joining player
            ws.send(
              JSON.stringify({
                type: 'room_joined',
                roomCode: code,
                playerId,
                mapId: room.mapId,
                players: existingPlayers,
                chatHistory: room.chatMessages,
              } as ServerMessage)
            );

            // Notify others in room
            broadcastToRoom(
              room,
              {
                type: 'player_joined',
                player: initialPlayerState,
              },
              ws
            );

            // Broadcast join chat alert
            const joinChatMsg: ChatMessage = {
              id: 'sys_' + Math.random().toString(36).substring(2, 9),
              senderId: 'system',
              senderName: 'HQ',
              senderColor: '#10b981',
              text: `${initialPlayerState.name} entered the combat zone.`,
              timestamp: Date.now(),
              system: true,
            };
            room.chatMessages.push(joinChatMsg);
            if (room.chatMessages.length > 50) room.chatMessages.shift();
            broadcastToRoom(room, {
              type: 'chat_message',
              message: joinChatMsg,
            });
            break;
          }

          case 'sync_player': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            // Merge delta state
            Object.assign(currentPlayer.state, msg.state);

            // Broadcast to other players in room
            broadcastToRoom(
              room,
              {
                type: 'sync_state',
                players: {
                  [currentPlayer.id]: currentPlayer.state,
                },
              },
              ws
            );
            break;
          }

          case 'shoot_bullet': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            // Broadcast bullet spawn to all others in room
            broadcastToRoom(
              room,
              {
                type: 'spawn_bullet',
                bullet: {
                  ...msg.bullet,
                  createdAt: Date.now(),
                },
              },
              ws
            );
            break;
          }

          case 'bullet_hit': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            const targetPlayer = room.players.get(msg.targetId);
            if (!targetPlayer || targetPlayer.state.isDead) return;

            targetPlayer.state.health -= msg.damage;

            if (targetPlayer.state.health <= 0) {
              targetPlayer.state.health = 0;
              targetPlayer.state.isDead = true;
              targetPlayer.state.respawnTimeRemaining = 3.0; // 3 seconds respawn
              targetPlayer.state.deaths++;

              currentPlayer.state.kills++;
              currentPlayer.state.score += 100;

              // Broadcast kill feed item & kill event
              broadcastToRoom(room, {
                type: 'player_killed',
                killerId: currentPlayer.id,
                victimId: targetPlayer.id,
                weaponType: msg.weaponType,
                killerKills: currentPlayer.state.kills,
              });

              // Check Win Condition: First to 15 kills wins!
              if (currentPlayer.state.kills >= 15 && room.status !== 'ended') {
                room.status = 'ended';
                const leaderboard = Array.from(room.players.values())
                  .map((p) => ({
                    name: p.state.name,
                    kills: p.state.kills,
                    deaths: p.state.deaths,
                    color: p.state.color,
                  }))
                  .sort((a, b) => b.kills - a.kills);

                broadcastToRoom(room, {
                  type: 'game_over',
                  winnerId: currentPlayer.id,
                  winnerName: currentPlayer.state.name,
                  leaderboard,
                });
              }
            } else {
              // Health reduction sync
              broadcastToRoom(room, {
                type: 'sync_state',
                players: {
                  [targetPlayer.id]: {
                    health: targetPlayer.state.health,
                  },
                },
              });
            }
            break;
          }

          case 'melee_hit': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            const targetPlayer = room.players.get(msg.targetId);
            if (!targetPlayer || targetPlayer.state.isDead) return;

            targetPlayer.state.health -= msg.damage;

            if (targetPlayer.state.health <= 0) {
              targetPlayer.state.health = 0;
              targetPlayer.state.isDead = true;
              targetPlayer.state.respawnTimeRemaining = 3.0;
              targetPlayer.state.deaths++;

              currentPlayer.state.kills++;
              currentPlayer.state.score += 100;

              broadcastToRoom(room, {
                type: 'player_killed',
                killerId: currentPlayer.id,
                victimId: targetPlayer.id,
                weaponType: 'melee',
                killerKills: currentPlayer.state.kills,
              });

              if (currentPlayer.state.kills >= 15 && room.status !== 'ended') {
                room.status = 'ended';
                const leaderboard = Array.from(room.players.values())
                  .map((p) => ({
                    name: p.state.name,
                    kills: p.state.kills,
                    deaths: p.state.deaths,
                    color: p.state.color,
                  }))
                  .sort((a, b) => b.kills - a.kills);

                broadcastToRoom(room, {
                  type: 'game_over',
                  winnerId: currentPlayer.id,
                  winnerName: currentPlayer.state.name,
                  leaderboard,
                });
              }
            } else {
              broadcastToRoom(room, {
                type: 'sync_state',
                players: {
                  [targetPlayer.id]: {
                    health: targetPlayer.state.health,
                  },
                },
              });
            }
            break;
          }

          case 'pickup_collected': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            room.pickups.set(msg.pickupId, {
              isAvailable: false,
              respawnAt: Date.now() + 15000,
            });

            broadcastToRoom(room, {
              type: 'pickup_state',
              pickups: [{ id: msg.pickupId, isAvailable: false }],
            });
            break;
          }

          case 'chat_message': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            const text = (msg.text || '').trim().substring(0, 100);
            if (!text) return;

            const chatItem: ChatMessage = {
              id: 'msg_' + Math.random().toString(36).substring(2, 9),
              senderId: currentPlayer.id,
              senderName: currentPlayer.state.name,
              senderColor: currentPlayer.state.color,
              text,
              timestamp: Date.now(),
            };

            room.chatMessages.push(chatItem);
            if (room.chatMessages.length > 50) room.chatMessages.shift();

            broadcastToRoom(room, {
              type: 'chat_message',
              message: chatItem,
            });
            break;
          }

          case 'send_emote': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            const emote = msg.emote;
            const label = msg.label || '';
            const now = Date.now();

            currentPlayer.state.activeEmote = {
              emote,
              text: label,
              expiresAt: now + 3500,
            };

            const emoteItem: ChatMessage = {
              id: 'emt_' + Math.random().toString(36).substring(2, 9),
              senderId: currentPlayer.id,
              senderName: currentPlayer.state.name,
              senderColor: currentPlayer.state.color,
              text: label ? `${emote} ${label}` : emote,
              isEmote: true,
              emote,
              timestamp: now,
            };

            room.chatMessages.push(emoteItem);
            if (room.chatMessages.length > 50) room.chatMessages.shift();

            // Broadcast emote event to room
            broadcastToRoom(room, {
              type: 'player_emote',
              playerId: currentPlayer.id,
              playerName: currentPlayer.state.name,
              emote,
              label,
              timestamp: now,
            });

            // Broadcast chat message item
            broadcastToRoom(room, {
              type: 'chat_message',
              message: emoteItem,
            });

            // Sync player's activeEmote so other players see overhead bubble
            broadcastToRoom(room, {
              type: 'sync_state',
              players: {
                [currentPlayer.id]: {
                  activeEmote: currentPlayer.state.activeEmote,
                },
              },
            });
            break;
          }

          case 'vote_map': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            room.mapVotes.set(currentPlayer.id, msg.mapId);

            // Compute tallies
            const mapTallies: Record<string, number> = {
              neon_bunker: 0,
              cactus_canyon: 0,
              cyber_skyway: 0,
            };
            const votesObj: Record<string, string> = {};
            room.mapVotes.forEach((mId, pId) => {
              votesObj[pId] = mId;
              mapTallies[mId] = (mapTallies[mId] || 0) + 1;
            });

            broadcastToRoom(room, {
              type: 'map_votes_updated',
              votes: votesObj,
              mapTallies,
            });
            break;
          }

          case 'play_again': {
            if (!currentPlayer) return;
            const room = rooms.get(currentPlayer.roomCode);
            if (!room) return;

            // Pick winning map from votes if votes were cast
            let nextMapId = room.mapId;
            let highestVotes = 0;
            const mapTallies: Record<string, number> = {};
            room.mapVotes.forEach((mId) => {
              mapTallies[mId] = (mapTallies[mId] || 0) + 1;
              if (mapTallies[mId] > highestVotes) {
                highestVotes = mapTallies[mId];
                nextMapId = mId;
              }
            });

            room.mapId = nextMapId;
            room.mapVotes.clear();
            room.status = 'in_game';
            // Reset player scores & kills
            room.players.forEach((p) => {
              p.state.kills = 0;
              p.state.deaths = 0;
              p.state.score = 0;
              p.state.health = 100;
              p.state.fuel = 100;
              p.state.isDead = false;
              p.state.respawnTimeRemaining = 0;
            });

            broadcastToRoom(room, {
              type: 'game_restarted',
              mapId: nextMapId,
            });
            break;
          }

          case 'ping': {
            ws.send(
              JSON.stringify({
                type: 'pong',
                clientTimestamp: msg.timestamp,
                serverTimestamp: Date.now(),
              } as ServerMessage)
            );
            break;
          }

          case 'leave_room': {
            handlePlayerDisconnect(currentPlayer);
            currentPlayer = null;
            break;
          }
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    });

    const handlePlayerDisconnect = (player: ConnectedPlayer | null) => {
      if (!player) return;
      const room = rooms.get(player.roomCode);
      if (room) {
        room.players.delete(player.id);
        broadcastToRoom(room, {
          type: 'player_left',
          playerId: player.id,
        });

        // Broadcast leave system chat message
        const leaveMsg: ChatMessage = {
          id: 'sys_' + Math.random().toString(36).substring(2, 9),
          senderId: 'system',
          senderName: 'HQ',
          senderColor: '#ef4444',
          text: `${player.name} left the arena.`,
          timestamp: Date.now(),
          system: true,
        };
        room.chatMessages.push(leaveMsg);
        if (room.chatMessages.length > 50) room.chatMessages.shift();
        broadcastToRoom(room, {
          type: 'chat_message',
          message: leaveMsg,
        });

        // Clean up empty room
        if (room.players.size === 0) {
          rooms.delete(player.roomCode);
        } else if (room.hostId === player.id) {
          // Reassign host
          const nextHost = room.players.keys().next().value;
          if (nextHost) room.hostId = nextHost;
        }
      }
    };

    ws.on('close', () => {
      handlePlayerDisconnect(currentPlayer);
    });

    ws.on('error', () => {
      handlePlayerDisconnect(currentPlayer);
    });
  });

  // Setup Vite middlewares or static files
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Arena shooter server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
