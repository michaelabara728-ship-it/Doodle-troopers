import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameRenderer } from './game/renderer';
import { MAPS } from './game/maps';
import { WEAPONS } from './game/weapons';
import { sound } from './game/audio';
import {
  ClientMessage,
  KillFeedItem,
  PlayerState,
  ServerMessage,
  WeaponType,
  AvatarCustomization,
  ChatMessage,
} from './types/game';
import { TouchControls } from './components/TouchControls';
import { HUD } from './components/HUD';
import { LobbyModal } from './components/LobbyModal';
import { MatchLobbyModal } from './components/MatchLobbyModal';
import { ScoreboardModal } from './components/ScoreboardModal';
import { GameOverModal } from './components/GameOverModal';
import { AvatarCustomizerModal } from './components/AvatarCustomizerModal';
import { OrientationBanner } from './components/OrientationBanner';
import { ChatOverlay } from './components/ChatOverlay';
import { EmoteWheelModal } from './components/EmoteWheelModal';
import {
  createFirebaseRoom,
  joinFirebaseRoom,
  startFirebaseMatch,
  leaveFirebaseRoom,
  listenToRoom,
  syncPlayerStateToFirebase,
  listenToGameStates,
  broadcastBulletToFirebase,
  listenToBullets,
  sendChatMessageToFirebase,
  listenToFirebaseConnection,
  FirebaseRoomData,
} from './services/firebase';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  // Game UI State
  const [gameState, setGameState] = useState<'lobby' | 'room_lobby' | 'playing' | 'game_over'>('lobby');
  const [gameMode, setGameMode] = useState<'multiplayer' | 'survival'>('survival');
  const [roomCode, setRoomCode] = useState<string>('');
  const [roomData, setRoomData] = useState<FirebaseRoomData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [mapId, setMapId] = useState<string>('jungle');
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [localPlayer, setLocalPlayer] = useState<PlayerState | undefined>(undefined);
  const [playersList, setPlayersList] = useState<PlayerState[]>([]);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);

  useEffect(() => {
    const unsub = listenToFirebaseConnection((connected) => {
      setFirebaseConnected(connected);
    });
    return () => unsub();
  }, []);

  const roomCodeRef = useRef<string>('');
  const localPlayerIdRef = useRef<string>('');
  const unsubscribeRoomRef = useRef<(() => void) | null>(null);
  const unsubscribeStatesRef = useRef<(() => void) | null>(null);
  const unsubscribeBulletsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    localPlayerIdRef.current = localPlayerId;
  }, [localPlayerId]);

  // Match Text Chat & Emote States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isEmoteWheelOpen, setIsEmoteWheelOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Avatar Customization State
  const [playerName, setPlayerName] = useState(() => {
    return 'Trooper_' + Math.floor(100 + Math.random() * 900);
  });
  const [avatar, setAvatar] = useState<AvatarCustomization>({
    headwear: 'helmet',
    camo: 'jungle',
    skinTone: '#fde047',
  });
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Zoom / Scope State (1x to 6x)
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Match Timer
  const [matchSeconds, setMatchSeconds] = useState(0);

  // Winner stats
  const [winnerInfo, setWinnerInfo] = useState<{
    name: string;
    id: string;
    leaderboard: { name: string; kills: number; deaths: number; color: string }[];
  }>({ name: '', id: '', leaderboard: [] });

  // Map voting state
  const [mapTallies, setMapTallies] = useState<Record<string, number>>({
    jungle: 0,
    snow: 0,
    desert: 0,
  });
  const [userVotedMap, setUserVotedMap] = useState<string | null>(null);

  // Input state from joysticks / keyboard
  const inputRef = useRef({
    moveX: 0,
    moveY: 0,
    aimX: 1,
    aimY: 0,
    isJetpacking: false,
    isShooting: false,
    wantsReload: false,
  });

  const lastSyncTimeRef = useRef(0);

  // Match Timer interval
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setMatchSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Engine
  const initEngine = useCallback(
    (selectedMapId: string, currentLocalId: string, mode: 'multiplayer' | 'survival') => {
      const engine = new GameEngine(
        selectedMapId,
        currentLocalId,
        {
          onShootBullet: (bullet) => {
            if (roomCodeRef.current) {
              broadcastBulletToFirebase(roomCodeRef.current, bullet).catch(() => {});
            }
          },
          onBulletHit: (_bulletId, _targetId, _damage, _weaponType) => {
            // Handled locally & state synced via Firebase
          },
          onMeleeHit: (_targetId, _damage) => {
            // Handled locally
          },
          onPickupCollected: (_pickupId) => {
            // Handled locally
          },
          onScreenShake: (intensity) => {
            rendererRef.current?.addScreenShake(intensity);
          },
          onLocalPlayerKilled: (killerId, weapon) => {
            const killer = engineRef.current?.players.get(killerId);
            const feedItem: KillFeedItem = {
              id: 'kill_' + Date.now(),
              killerName: killer?.name || 'Opponent',
              killerColor: killer?.color || '#ef4444',
              victimName: playerName,
              victimColor: '#3b82f6',
              weapon,
              timestamp: Date.now(),
            };
            setKillFeed((prev) => [feedItem, ...prev.slice(0, 5)]);
          },
          onGameOver: (winnerId, winnerName) => {
            const leaderboard = Array.from(engineRef.current?.players.values() || [])
              .map((p) => ({
                name: p.name,
                kills: p.kills,
                deaths: p.deaths,
                color: p.color,
              }))
              .sort((a, b) => b.kills - a.kills);

            triggerGameOver(winnerId, winnerName, leaderboard);
          },
        },
        mode
      );

      engineRef.current = engine;
      return engine;
    },
    [playerName]
  );

  const triggerGameOver = (
    winnerId: string,
    winnerName: string,
    leaderboard: { name: string; kills: number; deaths: number; color: string }[]
  ) => {
    sound.setJetpack(false);
    setWinnerInfo({ id: winnerId, name: winnerName, leaderboard });
    setGameState('game_over');
  };

  // Start match locally when room changes to 'in_game'
  const startMatchLocally = (room: FirebaseRoomData, pid: string) => {
    setGameState('playing');
    setMatchSeconds(0);

    const newEngine = initEngine(room.mapId, pid, 'multiplayer');

    // Add all lobby players into engine
    if (room.players) {
      const sps = newEngine.map.spawnPoints;
      let spIdx = 0;
      Object.values(room.players).forEach((p) => {
        const sp = sps[spIdx % sps.length];
        spIdx++;
        newEngine.setPlayer({
          id: p.id,
          name: p.name,
          color: p.color,
          avatar: p.avatar,
          x: sp.x,
          y: sp.y,
          vx: 0,
          vy: 0,
          aimAngle: 0,
          isGrounded: true,
          isJetpacking: false,
          isShooting: false,
          facingLeft: false,
          health: 120,
          maxHealth: 120,
          fuel: 100,
          maxFuel: 100,
          lives: 3,
          currentWeapon: 'pistol',
          isDualWielding: false,
          ammo: WEAPONS.pistol.ammoMax,
          reserveAmmo: WEAPONS.pistol.ammoReserve,
          grenades: 3,
          isReloading: false,
          reloadProgress: 1,
          kills: 0,
          deaths: 0,
          score: 0,
          isDead: false,
          respawnTimeRemaining: 0,
        });
      });
    }

    // Listen to real-time player position syncs from Firebase
    if (unsubscribeStatesRef.current) unsubscribeStatesRef.current();
    unsubscribeStatesRef.current = listenToGameStates(room.code, (states) => {
      const engine = engineRef.current;
      if (!engine) return;
      Object.entries(states).forEach(([id, st]) => {
        if (id !== pid) {
          const target = engine.players.get(id);
          if (target) {
            Object.assign(target, st);
          }
        }
      });
    });

    // Listen to bullets broadcast from Firebase
    if (unsubscribeBulletsRef.current) unsubscribeBulletsRef.current();
    unsubscribeBulletsRef.current = listenToBullets(room.code, (bullet) => {
      const engine = engineRef.current;
      if (engine && bullet && bullet.shooterId !== pid) {
        engine.spawnBullet(bullet);
      }
    });
  };

  // Join Multiplayer Room via Firebase Realtime Database
  const handleJoinRoom = async (roomCodeInput: string, name: string, customAvatar: AvatarCustomization) => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    setIsConnecting(true);
    setErrorMessage(null);
    setGameMode('multiplayer');

    try {
      const pid = 'p_' + Math.random().toString(36).substring(2, 9);
      setLocalPlayerId(pid);
      setIsHost(false);

      const room = await joinFirebaseRoom(code, pid, name, '#ef4444', customAvatar);

      setRoomCode(code);
      setRoomData(room);
      setMapId(room.mapId);
      setIsConnecting(false);
      setGameState('room_lobby');

      // Listen to room updates
      if (unsubscribeRoomRef.current) unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = listenToRoom(
        code,
        (updatedRoom) => {
          if (!updatedRoom) {
            setErrorMessage('Room was closed');
            setGameState('lobby');
            return;
          }
          setRoomData(updatedRoom);
          if (updatedRoom.status === 'in_game' && gameState !== 'playing') {
            startMatchLocally(updatedRoom, pid);
          }
        },
        (err: any) => {
          const codeStr = err?.code ? `[${err.code}] ` : '';
          setErrorMessage(`${codeStr}${err?.message || 'Firebase Realtime Database error'}`);
        }
      );
    } catch (err: any) {
      setIsConnecting(false);
      const codeStr = err?.code ? `[${err.code}] ` : '';
      const msgStr = err?.message || 'Room not found';
      setErrorMessage(`${codeStr}${msgStr}`);
    }
  };

  // Create Multiplayer Room via Firebase Realtime Database
  const handleCreateRoom = async (name: string, customAvatar: AvatarCustomization, selectedMap: string) => {
    setIsConnecting(true);
    setErrorMessage(null);
    setGameMode('multiplayer');

    try {
      const pid = 'p_' + Math.random().toString(36).substring(2, 9);
      setLocalPlayerId(pid);
      setIsHost(true);

      const { roomCode: code, room } = await createFirebaseRoom(
        pid,
        name,
        '#3b82f6',
        customAvatar,
        selectedMap
      );

      setRoomCode(code);
      setRoomData(room);
      setMapId(selectedMap);
      setIsConnecting(false);
      // Immediately transition to lobby with 4-letter code in large text!
      setGameState('room_lobby');

      // Listen to room updates (players joining, status changes)
      if (unsubscribeRoomRef.current) unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = listenToRoom(
        code,
        (updatedRoom) => {
          if (!updatedRoom) {
            setErrorMessage('[ROOM_CLOSED] Room was closed');
            setGameState('lobby');
            return;
          }
          setRoomData(updatedRoom);
          if (updatedRoom.status === 'in_game' && gameState !== 'playing') {
            startMatchLocally(updatedRoom, pid);
          }
        },
        (err: any) => {
          const codeStr = err?.code ? `[${err.code}] ` : '';
          setErrorMessage(`${codeStr}${err?.message || 'Firebase Realtime Database error'}`);
        }
      );
    } catch (err: any) {
      setIsConnecting(false);
      const codeStr = err?.code ? `[${err.code}] ` : '';
      const msgStr = err?.message || 'Could not connect to Firebase Realtime Database.';
      setErrorMessage(`${codeStr}${msgStr}`);
    }
  };

  // Host starts the match for all players
  const handleStartMatchHost = async () => {
    if (!roomCode) return;
    try {
      await startFirebaseMatch(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start match');
    }
  };

  // Leave room lobby
  const handleLeaveRoomLobby = async () => {
    if (unsubscribeRoomRef.current) {
      unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = null;
    }
    if (roomCode && localPlayerId) {
      await leaveFirebaseRoom(roomCode, localPlayerId);
    }
    setRoomCode('');
    setRoomData(null);
    setGameState('lobby');
  };

  // Start Survival Mode
  const handlePlaySurvival = (name: string, customAvatar: AvatarCustomization, selectedMap: string) => {
    setGameMode('survival');
    setMapId(selectedMap);
    setRoomCode('SOLO');
    const myId = 'p_local_' + Math.random().toString(36).substring(2, 7);
    setLocalPlayerId(myId);
    setMatchSeconds(0);

    const engine = initEngine(selectedMap, myId, 'survival');
    const sp = engine.map.spawnPoints[0];

    engine.setPlayer({
      id: myId,
      name,
      color: '#3b82f6',
      avatar: customAvatar,
      x: sp.x,
      y: sp.y,
      vx: 0,
      vy: 0,
      aimAngle: 0,
      isGrounded: true,
      isJetpacking: false,
      isShooting: false,
      facingLeft: false,
      health: 120,
      maxHealth: 120,
      fuel: 100,
      maxFuel: 100,
      lives: 3,
      currentWeapon: 'pistol',
      isDualWielding: false,
      ammo: WEAPONS.pistol.ammoMax,
      reserveAmmo: WEAPONS.pistol.ammoReserve,
      grenades: 3,
      isReloading: false,
      reloadProgress: 1,
      kills: 0,
      deaths: 0,
      score: 0,
      isDead: false,
      respawnTimeRemaining: 0,
      isBot: false,
    });

    setGameState('playing');
  };

  // Cycle Zoom (1x, 2x, 3x, 4x, 5x, 6x -> 1x)
  const handleCycleZoom = () => {
    setZoomLevel((prev) => {
      const next = (prev >= 6 ? 1 : (prev + 1)) as 1 | 2 | 3 | 4 | 5 | 6;
      sound.playZoom();
      rendererRef.current?.setZoom(next);
      return next;
    });
  };

  // Melee attack
  const handleMelee = () => {
    engineRef.current?.meleeAttack();
  };

  // Hand grenade throw
  const handleThrowGrenade = () => {
    engineRef.current?.throwGrenade();
  };

  // Swap weapon
  const handleSwapWeapon = () => {
    engineRef.current?.swapWeapon();
  };

  // Exit back to main menu
  const handleExitLobby = () => {
    if (unsubscribeRoomRef.current) {
      unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = null;
    }
    if (unsubscribeStatesRef.current) {
      unsubscribeStatesRef.current();
      unsubscribeStatesRef.current = null;
    }
    if (unsubscribeBulletsRef.current) {
      unsubscribeBulletsRef.current();
      unsubscribeBulletsRef.current = null;
    }
    if (gameMode === 'multiplayer' && roomCodeRef.current && localPlayerIdRef.current) {
      leaveFirebaseRoom(roomCodeRef.current, localPlayerIdRef.current).catch(() => {});
    }
    sound.setJetpack(false);
    setRoomCode('');
    setRoomData(null);
    setGameState('lobby');
  };

  // Main Game Loop (Optimized for low-end mobile Mali-G52 GPU like Galaxy A06)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.045);
      lastTime = currentTime;

      const engine = engineRef.current;
      const renderer = rendererRef.current;

      if (engine && renderer && gameState === 'playing') {
        // Run physics and combat logic
        engine.update(dt, {
          moveX: inputRef.current.moveX,
          moveY: inputRef.current.moveY,
          aimX: inputRef.current.aimX,
          aimY: inputRef.current.aimY,
          isJetpacking: inputRef.current.isJetpacking,
          isShooting: inputRef.current.isShooting,
          wantsReload: inputRef.current.wantsReload,
        });

        inputRef.current.wantsReload = false;

        const lp = engine.getLocalPlayer();
        if (lp) {
          renderer.updateCamera(lp, engine.map, dt);

          // Network sync ~12 times/sec (every 80ms)
          if (
            gameMode === 'multiplayer' &&
            roomCodeRef.current &&
            localPlayerIdRef.current &&
            currentTime - lastSyncTimeRef.current > 80
          ) {
            lastSyncTimeRef.current = currentTime;
            syncPlayerStateToFirebase(roomCodeRef.current, localPlayerIdRef.current, {
              x: Math.round(lp.x * 10) / 10,
              y: Math.round(lp.y * 10) / 10,
              vx: Math.round(lp.vx),
              vy: Math.round(lp.vy),
              aimAngle: Math.round(lp.aimAngle * 100) / 100,
              isJetpacking: lp.isJetpacking,
              isCrouching: lp.isCrouching || false,
              isShooting: lp.isShooting,
              facingLeft: lp.facingLeft,
              health: lp.health,
              maxHealth: lp.maxHealth || 120,
              currentWeapon: lp.currentWeapon,
              isDualWielding: lp.isDualWielding,
            }).catch(() => {});
          }
        }

        // Render Frame
        renderer.render(
          engine.map,
          engine.players,
          engine.bullets,
          engine.particles,
          engine.floatingTexts,
          engine.corpses,
          engine.localPlayerId,
          engine.gasClouds
        );

        // Sync React UI state smoothly
        setLocalPlayer(lp ? { ...lp } : undefined);
        setPlayersList(Array.from(engine.players.values()));
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  // Canvas Resize (Capped DPR to 1.25 for top performance on Galaxy A06)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new GameRenderer(canvas);

    const handleResize = () => {
      // Capped devicePixelRatio to 1.25 for smooth 60fps on budget Mali GPU
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Joystick Input Callbacks
  const handleMoveChange = useCallback((x: number, y: number) => {
    inputRef.current.moveX = x;
    inputRef.current.moveY = y;
  }, []);

  const handleAimChange = useCallback((x: number, y: number, isShooting: boolean) => {
    if (Math.hypot(x, y) > 0.01) {
      inputRef.current.aimX = x;
      inputRef.current.aimY = y;
    }
    inputRef.current.isShooting = isShooting;
  }, []);

  const handleReload = useCallback(() => {
    inputRef.current.wantsReload = true;
  }, []);

  const handleCycleGrenade = useCallback(() => {
    engineRef.current?.cycleGrenadeType();
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  // Chat & Emote Callbacks
  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      if (!prev) setUnreadChatCount(0);
      return !prev;
    });
  }, []);

  const handleOpenEmoteWheel = useCallback(() => {
    setIsEmoteWheelOpen((prev) => !prev);
  }, []);

  const handleSendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const chatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        senderId: localPlayerId || 'p_local',
        senderName: playerName,
        senderColor: '#38bdf8',
        text: trimmed,
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev.slice(-49), chatMsg]);
      sound.playChatPing();

      if (gameMode === 'multiplayer' && roomCodeRef.current) {
        sendChatMessageToFirebase(roomCodeRef.current, chatMsg).catch(() => {});
      } else if (gameMode === 'survival' && engineRef.current) {
        // Bot quick response in survival mode
        const aliveBots = Array.from(engineRef.current.players.values()).filter((p) => p.isBot && !p.isDead);
        if (aliveBots.length > 0 && Math.random() < 0.75) {
          const randomBot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
          setTimeout(() => {
            const botReplies = [
              { text: 'Target in sight! 🎯', emote: '🎯' },
              { text: 'No surrender! 🔥', emote: '🔥' },
              { text: 'You cannot escape! 💀', emote: '💀' },
              { text: 'Charge!! ⚡', emote: '⚡' },
              { text: 'Eat lead! 💣', emote: '💣' },
            ];
            const chosen = botReplies[Math.floor(Math.random() * botReplies.length)];
            engineRef.current?.triggerEmote(randomBot.id, chosen.emote, chosen.text);
            const botChat: ChatMessage = {
              id: 'bot_msg_' + Date.now(),
              senderId: randomBot.id,
              senderName: randomBot.name,
              senderColor: '#ef4444',
              text: chosen.text,
              timestamp: Date.now(),
            };
            setChatMessages((prev) => [...prev.slice(-49), botChat]);
            sound.playChatPing();
          }, 800 + Math.random() * 1000);
        }
      }
    },
    [gameMode, localPlayerId, playerName]
  );

  const handleSendEmote = useCallback(
    (emote: string, label: string) => {
      // Trigger overhead bubble on local player immediately
      if (engineRef.current && localPlayerId) {
        engineRef.current.triggerEmote(localPlayerId, emote, label);
      }
      sound.playEmotePop();

      const emoteMsg: ChatMessage = {
        id: 'emt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        senderId: localPlayerId || 'p_local',
        senderName: playerName,
        senderColor: '#38bdf8',
        text: label ? `${emote} ${label}` : emote,
        isEmote: true,
        emote,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev.slice(-49), emoteMsg]);

      if (gameMode === 'multiplayer' && roomCodeRef.current) {
        sendChatMessageToFirebase(roomCodeRef.current, emoteMsg).catch(() => {});
      }
    },
    [gameMode, localPlayerId, playerName]
  );

  // Map Voting Action
  const handleVoteMap = (votedMapId: string) => {
    setUserVotedMap(votedMapId);
    setMapTallies((prev) => ({
      ...prev,
      [votedMapId]: (prev[votedMapId] || 0) + 1,
    }));
  };

  // Play Again Action
  const handlePlayAgain = () => {
    let nextMapId = mapId;
    let maxV = 0;
    Object.entries(mapTallies).forEach(([mId, v]) => {
      if (v > maxV) {
        maxV = v;
        nextMapId = mId;
      }
    });
    setMapId(nextMapId);
    setUserVotedMap(null);
    setMapTallies({ jungle: 0, snow: 0, desert: 0 });
    setMatchSeconds(0);

    const newEngine = initEngine(nextMapId, localPlayerId, gameMode);
    newEngine.players.forEach((p) => {
      p.kills = 0;
      p.deaths = 0;
      p.score = 0;
      p.lives = 3;
      newEngine.respawnPlayer(p);
    });
    setGameState('playing');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* Mobile Landscape Orientation Advisory */}
      <OrientationBanner />

      {/* Main Game World Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full cursor-crosshair" />

      {/* IN-GAME HUD, TOUCH CONTROLS, CHAT & EMOTES */}
      {gameState === 'playing' && (
        <>
          <HUD
            localPlayer={localPlayer}
            players={playersList}
            killFeed={killFeed}
            roomCode={roomCode}
            zoomLevel={zoomLevel}
            onCycleZoom={handleCycleZoom}
            onReload={handleReload}
            onCycleGrenade={handleCycleGrenade}
            onToggleScoreboard={() => setShowScoreboard((prev) => !prev)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            mapName={MAPS[mapId]?.name || 'Arena'}
            matchTimerText={formatTimer(matchSeconds)}
            gameMode={gameMode}
            survivalWave={engineRef.current?.survivalWave}
            onToggleChat={handleToggleChat}
            unreadChatCount={unreadChatCount}
            onOpenEmoteWheel={handleOpenEmoteWheel}
          />

          <TouchControls
            onMoveChange={handleMoveChange}
            onAimChange={handleAimChange}
            onMelee={handleMelee}
            onThrowGrenade={handleThrowGrenade}
            onSwapWeapon={handleSwapWeapon}
            onCycleGrenade={handleCycleGrenade}
            onOpenEmoteWheel={handleOpenEmoteWheel}
            onToggleChat={handleToggleChat}
            grenadeType={localPlayer?.currentGrenadeType || 'frag'}
            grenadeCount={
              localPlayer?.grenadeInventory
                ? localPlayer.grenadeInventory[localPlayer.currentGrenadeType || 'frag'] || 0
                : localPlayer?.grenades ?? 3
            }
          />

          {/* Live In-Game Match Chat Feed & Expandable Panel */}
          <ChatOverlay
            messages={chatMessages}
            isOpen={isChatOpen}
            onToggleOpen={handleToggleChat}
            onSendMessage={handleSendMessage}
            onOpenEmoteWheel={handleOpenEmoteWheel}
            localPlayerName={playerName}
          />

          {/* Emote & Tactical Callout Wheel Modal */}
          <EmoteWheelModal
            isOpen={isEmoteWheelOpen}
            onClose={() => setIsEmoteWheelOpen(false)}
            onSelectEmote={handleSendEmote}
            onSelectQuickChat={handleSendMessage}
          />
        </>
      )}

      {/* Lobby Menu Modal */}
      {gameState === 'lobby' && (
        <LobbyModal
          playerName={playerName}
          avatar={avatar}
          onOpenAvatarCustomizer={() => setIsAvatarModalOpen(true)}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onPlaySurvival={handlePlaySurvival}
          isConnecting={isConnecting}
          errorMessage={errorMessage}
          firebaseConnected={firebaseConnected}
        />
      )}

      {/* Multiplayer Room Pre-Match Lobby Screen */}
      {gameState === 'room_lobby' && (
        <MatchLobbyModal
          roomCode={roomCode}
          roomData={roomData}
          localPlayerId={localPlayerId}
          isHost={isHost}
          onStartMatch={handleStartMatchHost}
          onLeaveRoom={handleLeaveRoomLobby}
          errorMessage={errorMessage}
        />
      )}

      {/* Avatar Customization Modal */}
      {isAvatarModalOpen && (
        <AvatarCustomizerModal
          name={playerName}
          avatar={avatar}
          onSave={(newName, newAvatar) => {
            setPlayerName(newName);
            setAvatar(newAvatar);
          }}
          onClose={() => setIsAvatarModalOpen(false)}
        />
      )}

      {/* Scoreboard Modal */}
      {showScoreboard && (
        <ScoreboardModal
          players={playersList}
          onClose={() => setShowScoreboard(false)}
          targetKills={15}
        />
      )}

      {/* Game Over Modal with Map Voting */}
      {gameState === 'game_over' && (
        <GameOverModal
          winnerName={winnerInfo.name}
          winnerId={winnerInfo.id}
          isWinner={winnerInfo.id === localPlayerId}
          leaderboard={winnerInfo.leaderboard}
          currentMapId={mapId}
          mapTallies={mapTallies}
          userVotedMap={userVotedMap}
          onVoteMap={handleVoteMap}
          onPlayAgain={handlePlayAgain}
          onExitLobby={handleExitLobby}
        />
      )}
    </div>
  );
}
