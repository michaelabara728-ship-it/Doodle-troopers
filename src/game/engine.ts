import {
  PlayerState,
  Bullet,
  Particle,
  FloatingText,
  MapData,
  WeaponType,
  RagdollCorpse,
  AvatarCustomization,
  GasCloud,
  GrenadeType,
} from '../types/game';
import { WEAPONS } from './weapons';
import { sound } from './audio';
import { MAPS } from './maps';

export interface GameEngineCallbacks {
  onShootBullet: (bullet: Omit<Bullet, 'createdAt'>) => void;
  onBulletHit: (bulletId: string, targetId: string, damage: number, weaponType: WeaponType) => void;
  onMeleeHit?: (targetId: string, damage: number) => void;
  onPickupCollected: (pickupId: string) => void;
  onScreenShake: (intensity: number) => void;
  onLocalPlayerKilled: (killerId: string, weapon: WeaponType | 'melee' | 'grenade' | 'gas') => void;
  onWaveComplete?: (wave: number) => void;
  onGameOver?: (winnerId: string, winnerName: string) => void;
}

export class GameEngine {
  public map: MapData;
  public players: Map<string, PlayerState> = new Map();
  public bullets: Bullet[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public corpses: RagdollCorpse[] = [];
  public gasClouds: GasCloud[] = [];
  public localPlayerId: string;
  public callbacks: GameEngineCallbacks;

  // Game mode
  public gameMode: 'multiplayer' | 'survival' = 'multiplayer';
  public survivalWave = 1;
  public survivalKills = 0;
  public botsRemainingInWave = 0;
  private waveTransitionTimer = 0;
  private gasDamageTimer = 0;

  // Physics constants
  private readonly GRAVITY = 1100; // px/s^2
  private readonly MOVE_SPEED = 245; // px/s
  private readonly JETPACK_FORCE = -1700; // px/s^2 upward thrust
  private readonly PLAYER_WIDTH = 28;
  private readonly PLAYER_HEIGHT = 44;

  constructor(mapId: string, localPlayerId: string, callbacks: GameEngineCallbacks, mode: 'multiplayer' | 'survival' = 'multiplayer') {
    this.map = MAPS[mapId] || MAPS.jungle;
    this.localPlayerId = localPlayerId;
    this.callbacks = callbacks;
    this.gameMode = mode;

    if (this.gameMode === 'survival') {
      this.initSurvivalWave(1);
    }
  }

  public getLocalPlayer(): PlayerState | undefined {
    return this.players.get(this.localPlayerId);
  }

  public setPlayer(player: PlayerState) {
    if (player.timeSinceLastDamage === undefined) {
      player.timeSinceLastDamage = 5.0;
    }
    this.players.set(player.id, player);
  }

  public removePlayer(id: string) {
    this.players.delete(id);
  }

  public spawnBullet(bullet: Bullet) {
    this.bullets.push({ ...bullet, createdAt: performance.now() });

    // Audio for bullets fired
    switch (bullet.weaponType) {
      case 'pistol':
        sound.playPistol();
        break;
      case 'revolver':
        sound.playRevolver();
        break;
      case 'smg':
        sound.playSMG();
        break;
      case 'minigun':
        sound.playMinigun();
        break;
      case 'flamethrower':
        sound.playFlamethrower();
        break;
      case 'plasma':
        sound.playPlasma();
        break;
      case 'saw':
        sound.playSaw();
        break;
      case 'rifle':
        sound.playRifle();
        break;
      case 'shotgun':
        sound.playShotgun();
        break;
      case 'sniper':
        sound.playSniper();
        break;
      case 'rocket':
        sound.playRocketLaunch();
        break;
      case 'grenade':
        if (bullet.grenadeType === 'stun') {
          sound.playGrenadeLaunch();
        } else if (bullet.grenadeType === 'gas') {
          sound.playGasHiss();
        } else {
          sound.playGrenadeLaunch();
        }
        break;
    }

    // Eject brass shell casing for firearms
    if (['pistol', 'revolver', 'smg', 'minigun', 'rifle', 'shotgun', 'sniper'].includes(bullet.weaponType)) {
      const ejectAngle = bullet.vx > 0 ? -2.2 + (Math.random() - 0.5) * 0.5 : -0.9 + (Math.random() - 0.5) * 0.5;
      const ejectSpeed = 80 + Math.random() * 70;
      this.particles.push({
        x: bullet.x,
        y: bullet.y,
        vx: Math.cos(ejectAngle) * ejectSpeed,
        vy: Math.sin(ejectAngle) * ejectSpeed,
        life: 0.55,
        maxLife: 0.55,
        color: '#fbbf24',
        size: 3,
        decay: 1,
        type: 'casing',
      });
    }

    // Cap particles on mobile to maintain smooth 60fps
    if (this.particles.length > 90) {
      this.particles.splice(0, this.particles.length - 90);
    }
  }

  public triggerExplosion(x: number, y: number, radius = 95, maxDamage = 115, shooterId = '') {
    sound.playExplosion();
    this.callbacks.onScreenShake(14);

    // Shockwave ring particle
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.35,
      maxLife: 0.35,
      color: '#f97316',
      size: 12,
      decay: 1,
      type: 'ring',
    });

    // Fire & Smoke blast
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.45,
        maxLife: 0.85,
        color: i % 2 === 0 ? '#ef4444' : i % 3 === 0 ? '#f59e0b' : '#64748b',
        size: 5 + Math.random() * 9,
        decay: 1,
        type: i % 3 === 0 ? 'smoke' : 'fire',
      });
    }

    // Damage players in blast radius
    for (const [id, player] of this.players.entries()) {
      if (player.isDead) continue;
      const dist = Math.hypot(player.x - x, player.y - y);
      if (dist < radius) {
        let falloff = 1 - dist / radius;
        let damage = Math.round(maxDamage * falloff);

        // Crouch defense: explosions deal only 30% damage with much less knockback
        if (player.isCrouching) {
          damage = Math.max(1, Math.round(damage * 0.3));
          falloff *= 0.3;
        }

        if (damage > 0) {
          player.health = Math.max(0, player.health - damage);
          player.timeSinceLastDamage = 0;
          player.isRegeneratingHealth = false;
          if (player.isCrouching) {
            this.addFloatingText(`🛡️ -${damage}`, player.x, player.y - 25, '#38bdf8');
          } else {
            this.addFloatingText(`-${damage}`, player.x, player.y - 20, '#ef4444');
          }

          // Impact pushback
          const pushAngle = Math.atan2(player.y - y, player.x - x);
          player.vx += Math.cos(pushAngle) * 350 * falloff;
          player.vy += Math.sin(pushAngle) * 350 * falloff;

          if (player.health <= 0) {
            this.handlePlayerDeath(player, shooterId, 'rocket');
          }
        }
      }
    }
  }

  public meleeAttack(attackerId = this.localPlayerId) {
    const attacker = this.players.get(attackerId);
    if (!attacker || attacker.isDead) return;

    attacker.isMeleeing = true;
    attacker.meleeTimer = 0.25;
    sound.playPunch();

    const range = 58;
    const punchAngle = attacker.facingLeft ? Math.PI : 0;
    const hitBoxX = attacker.x + (attacker.facingLeft ? -32 : 32);
    const hitBoxY = attacker.y;

    // Melee swing flash particle
    this.particles.push({
      x: hitBoxX,
      y: hitBoxY,
      vx: 0,
      vy: 0,
      life: 0.15,
      maxLife: 0.15,
      color: '#ffffff',
      size: 16,
      decay: 1,
      type: 'flash',
    });

    for (const [id, target] of this.players.entries()) {
      if (id === attackerId || target.isDead) continue;
      const dist = Math.hypot(target.x - hitBoxX, target.y - hitBoxY);
      if (dist < range) {
        const damage = 45;
        target.health = Math.max(0, target.health - damage);
        target.timeSinceLastDamage = 0;
        target.isRegeneratingHealth = false;
        sound.playHitMarker();
        this.callbacks.onScreenShake(6);

        // Knockback
        target.vx += (attacker.facingLeft ? -350 : 350);
        target.vy -= 180;

        this.addFloatingText(`POW! -${damage}`, target.x, target.y - 25, '#f59e0b');

        if (attackerId === this.localPlayerId && this.callbacks.onMeleeHit) {
          this.callbacks.onMeleeHit(target.id, damage);
        }

        if (target.health <= 0) {
          this.handlePlayerDeath(target, attackerId, 'melee');
        }
        break;
      }
    }
  }

  public triggerStunExplosion(x: number, y: number, radius = 120, maxDamage = 35, shooterId = '') {
    sound.playStunPulse();
    this.callbacks.onScreenShake(10);

    // Cyan EMP shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.45,
      maxLife: 0.45,
      color: '#38bdf8',
      size: 14,
      decay: 1,
      type: 'ring',
    });

    // Intense electric arcs and sparks
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.35,
        maxLife: 0.6,
        color: i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#67e8f9' : '#fef08a',
        size: 3 + Math.random() * 3.5,
        decay: 1,
        type: 'electric_arc',
      });
    }

    // Affect players within EMP radius
    for (const [id, player] of this.players.entries()) {
      if (player.isDead) continue;
      const dist = Math.hypot(player.x - x, player.y - y);
      if (dist < radius) {
        let falloff = 1 - dist / radius;
        let damage = Math.round(maxDamage * (0.6 + 0.4 * falloff));
        if (player.isCrouching) {
          damage = Math.max(1, Math.round(damage * 0.3));
          falloff *= 0.3;
        }
        player.health = Math.max(0, player.health - damage);
        player.timeSinceLastDamage = 0;
        player.isRegeneratingHealth = false;
        player.stunTimer = player.isCrouching ? 1.2 : 2.6;
        if (player.isCrouching) {
          this.addFloatingText(`🛡️ STUN DEFENDED! -${damage}`, player.x, player.y - 25, '#38bdf8');
        } else {
          this.addFloatingText(`⚡ STUNNED! -${damage}`, player.x, player.y - 25, '#38bdf8');
        }

        // Knockback from shockwave
        const pushAngle = Math.atan2(player.y - y, player.x - x);
        player.vx += Math.cos(pushAngle) * 220 * falloff;
        player.vy += Math.sin(pushAngle) * 220 * falloff;

        if (player.health <= 0) {
          this.handlePlayerDeath(player, shooterId, 'grenade');
        }
      }
    }
  }

  public triggerGasRelease(x: number, y: number, shooterId = '') {
    sound.playGasHiss();
    this.callbacks.onScreenShake(5);

    this.gasClouds.push({
      id: 'gas_' + Date.now() + '_' + Math.random(),
      x,
      y,
      radius: 88,
      shooterId,
      duration: 7.5,
      maxDuration: 7.5,
    });

    // Initial billowing aerosol cloud particles
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 80;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        life: 0.8 + Math.random() * 0.7,
        maxLife: 1.5,
        color: i % 2 === 0 ? '#22c55e' : i % 3 === 0 ? '#84cc16' : '#a3e635',
        size: 8 + Math.random() * 12,
        decay: 1,
        type: 'toxic_gas',
      });
    }
  }

  private updateGasClouds(dt: number) {
    this.gasDamageTimer -= dt;
    const canDamage = this.gasDamageTimer <= 0;
    if (canDamage) {
      this.gasDamageTimer = 0.35; // tick damage every 0.35s
    }

    for (let i = this.gasClouds.length - 1; i >= 0; i--) {
      const g = this.gasClouds[i];
      g.duration -= dt;

      // Drifting ambient toxic smog particles
      if (Math.random() < 0.4) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * g.radius * 0.85;
        this.particles.push({
          x: g.x + Math.cos(angle) * dist,
          y: g.y + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 16,
          vy: -12 - Math.random() * 18,
          life: 0.6 + Math.random() * 0.5,
          maxLife: 1.2,
          color: Math.random() < 0.5 ? '#22c55e' : Math.random() < 0.8 ? '#84cc16' : '#4ade80',
          size: 7 + Math.random() * 10,
          decay: 1,
          type: 'toxic_gas',
        });
      }

      // Check damage to players inside cloud
      if (canDamage) {
        for (const player of this.players.values()) {
          if (player.isDead) continue;
          const dist = Math.hypot(player.x - g.x, player.y - g.y);
          if (dist < g.radius) {
            const poisonDmg = 5;
            player.health = Math.max(0, player.health - poisonDmg);
            player.timeSinceLastDamage = 0;
            player.isRegeneratingHealth = false;
            this.addFloatingText(`-5 🧪`, player.x, player.y - 20, '#84cc16');

            // Cough/toxic sparks
            for (let c = 0; c < 2; c++) {
              this.particles.push({
                x: player.x + (Math.random() - 0.5) * 16,
                y: player.y - 10 + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 30,
                vy: -20 - Math.random() * 20,
                life: 0.3,
                maxLife: 0.3,
                color: '#a3e635',
                size: 3,
                decay: 1,
                type: 'toxic_gas',
              });
            }

            if (player.health <= 0) {
              this.handlePlayerDeath(player, g.shooterId, 'gas');
            }
          }
        }
      }

      if (g.duration <= 0) {
        this.gasClouds.splice(i, 1);
      }
    }
  }

  /**
   * Passive health regeneration mechanic:
   * Slowly recovers player health if they haven't taken damage for 5 seconds.
   */
  private updateHealthRegeneration(dt: number) {
    const REGEN_DELAY = 5.0; // 5 seconds without damage required
    const REGEN_RATE = 12.0; // Recovers 12 HP per second

    for (const player of this.players.values()) {
      if (player.isDead) {
        player.timeSinceLastDamage = 0;
        player.isRegeneratingHealth = false;
        continue;
      }

      // Track elapsed seconds since last suffering any damage
      player.timeSinceLastDamage = (player.timeSinceLastDamage ?? 5.0) + dt;

      if (player.timeSinceLastDamage >= REGEN_DELAY && player.health < player.maxHealth) {
        player.isRegeneratingHealth = true;
        const prevHealth = player.health;
        player.health = Math.min(player.maxHealth, player.health + REGEN_RATE * dt);

        // Spawn gentle ascending healing sparkles
        if (Math.random() < 0.22) {
          this.particles.push({
            x: player.x + (Math.random() - 0.5) * 18,
            y: player.y + (Math.random() - 0.5) * 18,
            vx: (Math.random() - 0.5) * 12,
            vy: -22 - Math.random() * 20,
            life: 0.35,
            maxLife: 0.35,
            color: '#22c55e',
            size: 2.5,
            decay: 1,
            type: 'spark',
          });
        }

        // Notification when reached full recovery
        if (prevHealth < player.maxHealth && player.health >= player.maxHealth) {
          player.isRegeneratingHealth = false;
          if (player.id === this.localPlayerId) {
            this.addFloatingText('HEALTH RESTORED ❤️', player.x, player.y - 25, '#22c55e');
          }
        }
      } else {
        player.isRegeneratingHealth = false;
      }
    }
  }

  public cycleGrenadeType(playerId = this.localPlayerId) {
    const player = this.players.get(playerId);
    if (!player || player.isDead) return;

    if (!player.grenadeInventory) {
      player.grenadeInventory = { frag: player.grenades || 3, stun: 2, gas: 2 };
    }

    const types: GrenadeType[] = ['frag', 'stun', 'gas'];
    const current = player.currentGrenadeType || 'frag';
    const nextIdx = (types.indexOf(current) + 1) % types.length;
    player.currentGrenadeType = types[nextIdx];

    sound.playReload();
    const labels: Record<GrenadeType, string> = {
      frag: '💣 FRAG BOMB',
      stun: '⚡ EMP STUN GRENADE',
      gas: '🧪 TOXIC GAS GRENADE',
    };
    const colors: Record<GrenadeType, string> = {
      frag: '#facc15',
      stun: '#38bdf8',
      gas: '#a3e635',
    };

    const count = player.grenadeInventory[player.currentGrenadeType] || 0;
    this.addFloatingText(`${labels[player.currentGrenadeType]} (${count})`, player.x, player.y - 25, colors[player.currentGrenadeType]);
  }

  public throwGrenade(throwerId = this.localPlayerId, grenadeType?: GrenadeType) {
    const thrower = this.players.get(throwerId);
    if (!thrower || thrower.isDead) return;

    if (thrower.stunTimer && thrower.stunTimer > 0) {
      this.addFloatingText('STUNNED! ⚡', thrower.x, thrower.y - 25, '#38bdf8');
      return;
    }

    if (!thrower.grenadeInventory) {
      thrower.grenadeInventory = { frag: thrower.grenades || 3, stun: 2, gas: 2 };
    }

    const activeType = grenadeType || thrower.currentGrenadeType || 'frag';
    const available = thrower.grenadeInventory[activeType] || 0;

    if (available <= 0) {
      // Find alternate type with count > 0
      const altTypes: GrenadeType[] = ['frag', 'stun', 'gas'];
      const alt = altTypes.find((t) => (thrower.grenadeInventory![t] || 0) > 0);
      if (!alt) {
        this.addFloatingText('OUT OF GRENADES!', thrower.x, thrower.y - 20, '#ef4444');
        return;
      }
      thrower.currentGrenadeType = alt;
      this.throwGrenade(throwerId, alt);
      return;
    }

    thrower.grenadeInventory[activeType]--;
    thrower.grenades =
      (thrower.grenadeInventory.frag || 0) +
      (thrower.grenadeInventory.stun || 0) +
      (thrower.grenadeInventory.gas || 0);

    const config = WEAPONS.grenade;
    const speed = config.bulletSpeed;
    const angle = thrower.aimAngle;

    const colors: Record<GrenadeType, string> = {
      frag: '#65a30d',
      stun: '#0284c7',
      gas: '#84cc16',
    };

    const bulletData: Omit<Bullet, 'createdAt'> = {
      id: 'grn_' + thrower.id + '_' + Date.now(),
      shooterId: thrower.id,
      weaponType: 'grenade',
      grenadeType: activeType,
      x: thrower.x + Math.cos(angle) * 25,
      y: thrower.y + Math.sin(angle) * 25,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 120, // upward arc
      damage: activeType === 'stun' ? 35 : activeType === 'gas' ? 6 : config.damage,
      radius: config.bulletRadius,
      color: colors[activeType],
      lifespan: activeType === 'gas' ? 1.8 : 2.4,
      isExplosive: true,
      bouncesLeft: activeType === 'gas' ? 1 : 3,
    };

    this.spawnBullet({ ...bulletData, createdAt: performance.now() });
    this.callbacks.onShootBullet(bulletData);
  }

  public swapWeapon(playerId = this.localPlayerId) {
    const player = this.players.get(playerId);
    if (!player || player.isDead) return;

    if (player.secondaryWeapon) {
      const prev = player.currentWeapon;
      player.currentWeapon = player.secondaryWeapon;
      player.secondaryWeapon = prev;
      player.isDualWielding = false;
      const config = WEAPONS[player.currentWeapon];
      player.ammo = config.ammoMax;
      sound.playReload();
      this.addFloatingText(config.name, player.x, player.y - 20, '#38bdf8');
    }
  }

  public reloadWeapon(player: PlayerState) {
    if (player.isReloading || player.isDead) return;
    const config = WEAPONS[player.currentWeapon];
    const maxAmmo = player.isDualWielding ? config.ammoMax * 2 : config.ammoMax;
    if (player.ammo >= maxAmmo || player.reserveAmmo <= 0) return;

    player.isReloading = true;
    player.reloadProgress = 0;
    sound.playReload();
  }

  public update(
    dt: number,
    input: {
      moveX: number;
      moveY: number;
      aimX: number;
      aimY: number;
      isJetpacking: boolean;
      isShooting: boolean;
      wantsReload?: boolean;
    }
  ) {
    const now = performance.now();
    const localPlayer = this.getLocalPlayer();

    // 1. Update Local Player Controls & Physics
    if (localPlayer && !localPlayer.isDead) {
      this.updateLocalPlayer(dt, localPlayer, input, now);
    }

    // 2. Update Bots & Survival Mode
    this.updateBots(dt, now);
    if (this.gameMode === 'survival') {
      this.updateSurvivalLogic(dt);
    }

    // 3. Update Respawn Timers for dead players
    this.players.forEach((player) => {
      if (player.isDead) {
        player.respawnTimeRemaining -= dt;
        if (player.respawnTimeRemaining <= 0) {
          if (this.gameMode === 'survival' && player.id === this.localPlayerId) {
            if (player.lives > 0) {
              this.respawnPlayer(player);
            }
          } else {
            this.respawnPlayer(player);
          }
        }
      }
    });

    // 4. Update Bullets
    this.updateBullets(dt);

    // 4b. Update Toxic Gas Clouds
    this.updateGasClouds(dt);

    // 4c. Update Passive Health Regeneration (recovers health when 5 seconds without damage)
    this.updateHealthRegeneration(dt);

    // 5. Update Pickups
    this.updatePickups(dt, localPlayer);

    // 6. Update Ragdoll Corpses (tumbling bodies and flying helmets)
    this.updateRagdolls(dt);

    // 7. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.type === 'ring') {
        p.size += dt * 160;
      } else if (p.type === 'toxic_gas') {
        p.size += dt * 10;
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 8. Update Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.alpha -= dt * 1.2;
      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateLocalPlayer(
    dt: number,
    player: PlayerState,
    input: {
      moveX: number;
      moveY: number;
      aimX: number;
      aimY: number;
      isJetpacking: boolean;
      isShooting: boolean;
      wantsReload?: boolean;
    },
    now: number
  ) {
    // Handle EMP Stun Effect
    if (player.stunTimer && player.stunTimer > 0) {
      player.stunTimer -= dt;
      input.moveX *= 0.15;
      input.moveY = Math.max(0, input.moveY);
      input.isJetpacking = false;
      input.isShooting = false;
      if (Math.random() < 0.45) {
        this.particles.push({
          x: player.x + (Math.random() - 0.5) * 24,
          y: player.y + (Math.random() - 0.5) * 36,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          life: 0.16,
          maxLife: 0.16,
          color: Math.random() < 0.5 ? '#38bdf8' : '#fde047',
          size: 2.5,
          decay: 1,
          type: 'electric_arc',
        });
      }
    }

    // Handle Flamethrower Burn Effect
    if (player.burnTimer && player.burnTimer > 0) {
      player.burnTimer -= dt;
      if (Math.random() < 0.1) {
        player.health = Math.max(0, player.health - 3);
        player.timeSinceLastDamage = 0;
        player.isRegeneratingHealth = false;
        this.addFloatingText('-3 🔥', player.x, player.y - 20, '#f97316');
        if (player.health <= 0) {
          this.handlePlayerDeath(player, '', 'flamethrower');
        }
      }
      if (Math.random() < 0.35) {
        this.particles.push({
          x: player.x + (Math.random() - 0.5) * 20,
          y: player.y + (Math.random() - 0.5) * 28,
          vx: (Math.random() - 0.5) * 20,
          vy: -25 - Math.random() * 30,
          life: 0.25,
          maxLife: 0.25,
          color: Math.random() < 0.5 ? '#f97316' : '#ef4444',
          size: 3.5,
          decay: 1,
          type: 'fire',
        });
      }
    }

    // Melee attack animation timer
    if (player.isMeleeing) {
      player.meleeTimer = (player.meleeTimer || 0) - dt;
      if (player.meleeTimer <= 0) {
        player.isMeleeing = false;
      }
    }

    // Aim angle from right joystick
    if (Math.hypot(input.aimX, input.aimY) > 0.08) {
      player.aimAngle = Math.atan2(input.aimY, input.aimX);
      player.facingLeft = Math.abs(player.aimAngle) > Math.PI / 2;
    }

    // 1. Check Crouch: Dragging left joystick down while on the ground
    const wantsCrouch = player.isGrounded && input.moveY > 0.35;
    player.isCrouching = wantsCrouch;

    // Movement speed: 45% of normal speed when crouching
    const currentMoveSpeed = player.isCrouching ? this.MOVE_SPEED * 0.45 : this.MOVE_SPEED;

    // 2. Jetpack Flying Physics
    const upwardThrust = Math.max(0, -input.moveY);
    const wantsJetpack = (upwardThrust > 0.08 || input.isJetpacking) && player.fuel > 0;
    const wasJetpacking = player.isJetpacking;

    if (wantsJetpack) {
      // Immediate takeoff: un-ground immediately when pushing up
      if (player.isGrounded) {
        player.isGrounded = false;
      }
      player.isCrouching = false;
      player.isJetpacking = true;
      sound.setJetpack(true);

      const thrustPower = Math.min(1, Math.max(0.2, (upwardThrust - 0.05) / 0.85));

      // Short snappy boost at start of thrust so it feels instantly responsive
      if (!wasJetpacking) {
        player.vy = Math.min(player.vy - 160, -220);
      }

      // Smooth acceleration up to max rise speed
      const maxRiseSpeed = -320 - 260 * thrustPower;
      const upwardAccel = this.JETPACK_FORCE * (0.6 + 0.6 * thrustPower);
      player.vy += upwardAccel * dt;
      if (player.vy < maxRiseSpeed) {
        player.vy = maxRiseSpeed;
      }

      // Air control: left and right movement while flying accelerates and slows smoothly
      if (Math.abs(input.moveX) > 0.08) {
        const targetAirVx = input.moveX * this.MOVE_SPEED * 1.15;
        player.vx += (targetAirVx - player.vx) * Math.min(1, 10 * dt);
        player.facingLeft = input.moveX < 0;
      } else {
        // Light air drag
        player.vx *= Math.pow(0.25, dt);
      }

      // Fuel drains while thrusting
      player.fuel = Math.max(0, player.fuel - (20 + 18 * thrustPower) * dt);

      // Jetpack exhaust smoke & flame particles angled opposite to motion
      if (Math.random() < 0.35 + 0.45 * thrustPower) {
        const flameOffset = player.facingLeft ? 15 : -15;
        const exhaustVx = -player.vx * 0.3 + (Math.random() - 0.5) * 30;
        this.particles.push({
          x: player.x + flameOffset,
          y: player.y + 16,
          vx: exhaustVx,
          vy: 60 + Math.random() * 80 * thrustPower,
          life: 0.2 + 0.15 * thrustPower,
          maxLife: 0.35,
          color: Math.random() < 0.5 ? '#f97316' : '#fef08a',
          size: 2.5 + Math.random() * 3.5 * thrustPower,
          decay: 1,
          type: 'fire',
        });

        // Drifting smoke trail puffs
        if (Math.random() < 0.35) {
          this.particles.push({
            x: player.x + flameOffset,
            y: player.y + 18,
            vx: (Math.random() - 0.5) * 20 - player.vx * 0.2,
            vy: 30 + Math.random() * 40,
            life: 0.45,
            maxLife: 0.45,
            color: '#94a3b8',
            size: 4 + Math.random() * 3,
            decay: 1,
            type: 'smoke',
          });
        }
      }
    } else {
      player.isJetpacking = false;
      sound.setJetpack(false);

      // In the air: Float down gently with light air drag
      if (!player.isGrounded) {
        player.vy += this.GRAVITY * dt;
        player.vy = Math.min(player.vy, 540); // Gentle terminal fall velocity
        if (player.vy > 0) {
          player.vy *= Math.pow(0.88, dt); // Buoyant descent
        }

        // Air control
        if (Math.abs(input.moveX) > 0.08) {
          const targetAirVx = input.moveX * this.MOVE_SPEED * 1.05;
          player.vx += (targetAirVx - player.vx) * Math.min(1, 9 * dt);
          player.facingLeft = input.moveX < 0;
        } else {
          player.vx *= Math.pow(0.3, dt);
        }
      } else {
        // Ground horizontal movement with acceleration & friction
        if (Math.abs(input.moveX) > 0.08) {
          const targetVx = input.moveX * currentMoveSpeed;
          player.vx += (targetVx - player.vx) * Math.min(1, 22 * dt);
          player.facingLeft = input.moveX < 0;
        } else {
          // Smooth quick deceleration
          player.vx += (0 - player.vx) * Math.min(1, 25 * dt);
          if (Math.abs(player.vx) < 4) player.vx = 0;
        }
      }
    }

    // Fuel recharges on the ground
    if (player.isGrounded && !player.isJetpacking) {
      player.fuel = Math.min(player.maxFuel, player.fuel + 65 * dt);
    }

    // Calculate body tilt in direction of movement
    const tiltMultiplier = !player.isGrounded ? 0.0008 : 0.0004;
    const targetTilt = Math.max(-0.25, Math.min(0.25, player.vx * tiltMultiplier));
    player.bodyTilt = (player.bodyTilt || 0) + (targetTilt - (player.bodyTilt || 0)) * Math.min(1, 14 * dt);

    // Resolve Platform & Wall Collisions
    this.resolvePlayerPlatformCollision(player, dt);

    // Reload logic
    if (input.wantsReload) {
      this.reloadWeapon(player);
    }

    if (player.isReloading) {
      const config = WEAPONS[player.currentWeapon];
      player.reloadProgress += dt / config.reloadTime;
      if (player.reloadProgress >= 1) {
        player.isReloading = false;
        player.reloadProgress = 1;
        const maxAmmo = player.isDualWielding ? config.ammoMax * 2 : config.ammoMax;
        const needed = maxAmmo - player.ammo;
        const available = Math.min(needed, player.reserveAmmo);
        player.ammo += available;
        player.reserveAmmo -= available;
      }
    }

    // Shooting
    player.isShooting = input.isShooting;
    if (player.isShooting && !player.isReloading) {
      const config = WEAPONS[player.currentWeapon];
      const fireInterval = 1000 / (config.fireRate * (player.isDualWielding ? 1.5 : 1));
      const lastShot = (player as unknown as { lastShotTime: number }).lastShotTime || 0;

      if (now - lastShot >= fireInterval) {
        if (player.ammo > 0) {
          (player as unknown as { lastShotTime: number }).lastShotTime = now;
          player.ammo--;
          this.executeShoot(player, config);
        } else {
          this.reloadWeapon(player);
        }
      }
    }
  }

  private executeShoot(player: PlayerState, config: typeof WEAPONS[keyof typeof WEAPONS]) {
    // Recoil push
    const recoilFactor = player.isDualWielding ? config.recoil * 1.3 : config.recoil;
    player.vx -= Math.cos(player.aimAngle) * recoilFactor * 14;
    player.vy -= Math.sin(player.aimAngle) * recoilFactor * 14;

    // Screen Shake on heavier firearms
    if (config.id === 'sniper' || config.id === 'shotgun' || config.id === 'rocket' || config.id === 'revolver' || config.id === 'saw') {
      this.callbacks.onScreenShake(config.id === 'rocket' ? 9 : config.id === 'sniper' ? 8 : config.id === 'revolver' ? 6 : 7);
    } else if (config.id === 'minigun') {
      this.callbacks.onScreenShake(2);
    }

    const shotsCount = config.pellets || 1;
    for (let i = 0; i < shotsCount; i++) {
      const spread = (Math.random() - 0.5) * config.spread * 2;
      const angle = player.aimAngle + spread;
      const speed = config.bulletSpeed + (Math.random() - 0.5) * 30;

      // Dual wield alternates muzzle barrel offset
      const dualOffset = player.isDualWielding ? (Math.random() < 0.5 ? 6 : -6) : 0;
      const mX = player.x + Math.cos(player.aimAngle) * 26 - Math.sin(player.aimAngle) * dualOffset;
      const mY = player.y + Math.sin(player.aimAngle) * 26 + Math.cos(player.aimAngle) * dualOffset;

      const bulletData: Omit<Bullet, 'createdAt'> = {
        id: 'b_' + player.id + '_' + Date.now() + '_' + i,
        shooterId: player.id,
        weaponType: config.id,
        x: mX,
        y: mY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: config.damage,
        radius: config.bulletRadius,
        color: config.bulletColor,
        lifespan: config.id === 'rocket' ? 3.0 : config.id === 'flamethrower' ? 0.45 : config.id === 'saw' ? 3.5 : 1.8,
        isExplosive: config.isExplosive,
        bouncesLeft: config.id === 'saw' ? 3 : 0,
      };

      // Flamethrower nozzle flame burst particles
      if (config.id === 'flamethrower') {
        for (let f = 0; f < 3; f++) {
          this.particles.push({
            x: mX,
            y: mY,
            vx: Math.cos(angle + (Math.random() - 0.5) * 0.25) * (speed * 0.85),
            vy: Math.sin(angle + (Math.random() - 0.5) * 0.25) * (speed * 0.85),
            life: 0.35 + Math.random() * 0.15,
            maxLife: 0.5,
            color: Math.random() < 0.4 ? '#f97316' : Math.random() < 0.7 ? '#ef4444' : '#fef08a',
            size: 4 + Math.random() * 5,
            decay: 1,
            type: 'fire',
          });
        }
      }

      this.spawnBullet({ ...bulletData, createdAt: performance.now() });
      this.callbacks.onShootBullet(bulletData);
    }
  }

  private updateBullets(dt: number) {
    const now = performance.now();

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];

      // Grenade projectile gravity
      if (b.weaponType === 'grenade') {
        b.vy += 650 * dt;
      } else if (b.weaponType === 'saw') {
        b.vy += 450 * dt; // saw blade drops slightly
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Rocket launcher smoke puff trail
      if (b.weaponType === 'rocket' && Math.random() < 0.6) {
        this.particles.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 30 - b.vx * 0.1,
          vy: (Math.random() - 0.5) * 30 - b.vy * 0.1,
          life: 0.25,
          maxLife: 0.25,
          color: '#cbd5e1',
          size: 4 + Math.random() * 4,
          decay: 1,
          type: 'smoke',
        });
      }

      let hitSomething = false;

      // Platform collisions
      for (const p of this.map.platforms) {
        if (
          b.x + b.radius >= p.x &&
          b.x - b.radius <= p.x + p.w &&
          b.y + b.radius >= p.y &&
          b.y - b.radius <= p.y + p.h
        ) {
          if (b.weaponType === 'grenade' && (b.bouncesLeft || 0) > 0) {
            b.bouncesLeft!--;
            b.vy = -b.vy * 0.55;
            b.vx = b.vx * 0.75;
            b.y = p.y - b.radius;
            sound.playPistol();
          } else if (b.weaponType === 'saw' && (b.bouncesLeft || 0) > 0) {
            b.bouncesLeft!--;
            b.vy = -b.vy * 0.7;
            b.vx = b.vx * 0.88;
            b.y = p.y - b.radius;
            sound.playSaw();
            // Ricochet grinding sparks
            for (let s = 0; s < 6; s++) {
              this.particles.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 160,
                vy: -Math.random() * 140,
                life: 0.22,
                maxLife: 0.22,
                color: '#facc15',
                size: 2.5,
                decay: 1,
                type: 'spark',
              });
            }
          } else {
            hitSomething = true;
            if (b.isExplosive || b.weaponType === 'grenade') {
              if (b.grenadeType === 'stun') {
                this.triggerStunExplosion(b.x, b.y, 120, 35, b.shooterId);
              } else if (b.grenadeType === 'gas') {
                this.triggerGasRelease(b.x, b.y, b.shooterId);
              } else {
                this.triggerExplosion(b.x, b.y, 95, b.damage, b.shooterId);
              }
            } else {
              // Spark particles on impact
              for (let s = 0; s < 4; s++) {
                this.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 120,
                  vy: (Math.random() - 0.5) * 120,
                  life: 0.15,
                  maxLife: 0.15,
                  color: b.weaponType === 'plasma' ? '#38bdf8' : '#fbbf24',
                  size: 2,
                  decay: 1,
                  type: b.weaponType === 'plasma' ? 'electric_arc' : 'spark',
                });
              }
            }
          }
          break;
        }
      }

      // Check player hits
      if (!hitSomething) {
        for (const [id, target] of this.players.entries()) {
          if (id === b.shooterId || target.isDead) continue;
          const halfW = this.PLAYER_WIDTH / 2;
          const halfH = this.PLAYER_HEIGHT / 2;

          if (
            b.x >= target.x - halfW &&
            b.x <= target.x + halfW &&
            b.y >= target.y - halfH &&
            b.y <= target.y + halfH
          ) {
            hitSomething = true;

            // Blood / impact sparks
            for (let s = 0; s < 6; s++) {
              this.particles.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 160,
                vy: (Math.random() - 0.5) * 160,
                life: 0.22,
                maxLife: 0.22,
                color: b.weaponType === 'plasma' ? '#38bdf8' : '#ef4444',
                size: 3,
                decay: 1,
                type: b.weaponType === 'plasma' ? 'electric_arc' : 'blood',
              });
            }

            // Weapon specific status triggers
            if (b.weaponType === 'flamethrower') {
              target.burnTimer = 2.0; // Sets ablaze
            } else if (b.weaponType === 'plasma') {
              // Plasma shock ring
              this.particles.push({
                x: b.x,
                y: b.y,
                vx: 0,
                vy: 0,
                life: 0.22,
                maxLife: 0.22,
                color: '#38bdf8',
                size: 9,
                decay: 1,
                type: 'ring',
              });
            } else if (b.weaponType === 'saw') {
              sound.playSaw();
              this.callbacks.onScreenShake(6);
            } else if (b.weaponType === 'grenade') {
              if (b.grenadeType === 'stun') {
                this.triggerStunExplosion(b.x, b.y, 120, 35, b.shooterId);
              } else if (b.grenadeType === 'gas') {
                this.triggerGasRelease(b.x, b.y, b.shooterId);
              } else {
                this.triggerExplosion(b.x, b.y, 95, b.damage, b.shooterId);
              }
              break;
            }

            const isHeadshot = b.y < target.y - halfH / 2;
            const finalDamage = isHeadshot ? Math.round(b.damage * 1.35) : b.damage;

            if (b.shooterId === this.localPlayerId) {
              this.callbacks.onBulletHit(b.id, target.id, finalDamage, b.weaponType);
              sound.playHitMarker();
              this.addFloatingText(
                isHeadshot ? `HEADSHOT! -${finalDamage}` : `-${finalDamage}`,
                target.x,
                target.y - 25,
                isHeadshot ? '#ef4444' : '#f8fafc'
              );
            }

            target.health = Math.max(0, target.health - finalDamage);
            target.timeSinceLastDamage = 0;
            target.isRegeneratingHealth = false;
            if (target.health <= 0) {
              this.handlePlayerDeath(target, b.shooterId, b.weaponType);
            }
            break;
          }
        }
      }

      // Lifespan expired or bullet off-map
      if (hitSomething || now - b.createdAt >= b.lifespan * 1000 || b.x < 0 || b.x > this.map.width || b.y > this.map.height + 60) {
        if ((b.isExplosive || b.weaponType === 'grenade') && !hitSomething) {
          if (b.grenadeType === 'stun') {
            this.triggerStunExplosion(b.x, b.y, 120, 35, b.shooterId);
          } else if (b.grenadeType === 'gas') {
            this.triggerGasRelease(b.x, b.y, b.shooterId);
          } else {
            this.triggerExplosion(b.x, b.y, 95, b.damage, b.shooterId);
          }
        }
        this.bullets.splice(i, 1);
      }
    }
  }

  private handlePlayerDeath(victim: PlayerState, killerId: string, weapon: WeaponType | 'melee' | 'grenade' | 'gas') {
    if (victim.isDead) return;
    victim.isDead = true;
    victim.deaths++;
    victim.respawnTimeRemaining = 3;

    // Spawn Ragdoll corpse with tumbling limbs and flying detached helmet!
    this.spawnRagdoll(victim);

    const killer = this.players.get(killerId);
    if (killer && killer.id !== victim.id) {
      killer.kills++;
      killer.score += 100;
      if (this.gameMode === 'survival' && killer.id === this.localPlayerId) {
        this.survivalKills++;
      }
    }

    if (victim.id === this.localPlayerId) {
      this.callbacks.onLocalPlayerKilled(killerId, weapon);
      if (this.gameMode === 'survival') {
        victim.lives = Math.max(0, victim.lives - 1);
        if (victim.lives <= 0 && this.callbacks.onGameOver) {
          this.callbacks.onGameOver(killerId, killer?.name || 'Bots');
        }
      }
    }

    // Multiplayer win condition: first to 15 kills
    if (killer && killer.kills >= 15 && this.callbacks.onGameOver) {
      this.callbacks.onGameOver(killer.id, killer.name);
    }
  }

  private spawnRagdoll(player: PlayerState) {
    const launchAngle = player.facingLeft ? 0.6 : -0.6;
    const speed = 200 + Math.random() * 120;

    this.corpses.push({
      id: 'rag_' + player.id + '_' + Date.now(),
      x: player.x,
      y: player.y,
      vx: Math.cos(launchAngle) * speed,
      vy: -220,
      angle: 0,
      vRot: (Math.random() - 0.5) * 14,
      headwear: player.avatar?.headwear || 'helmet',
      camo: player.avatar?.camo || 'jungle',
      skinTone: player.avatar?.skinTone || '#fde047',
      helmetX: player.x,
      helmetY: player.y - 14,
      helmetVx: Math.cos(launchAngle) * (speed * 1.2),
      helmetVy: -320,
      helmetAngle: 0,
      helmetVRot: (Math.random() - 0.5) * 22,
      life: 5.0,
      maxLife: 5.0,
    });
  }

  private updateRagdolls(dt: number) {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.life -= dt;

      // Body gravity & tumbling
      c.vy += this.GRAVITY * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.angle += c.vRot * dt;

      // Helmet gravity & tumbling
      c.helmetVy += this.GRAVITY * dt;
      c.helmetX += c.helmetVx * dt;
      c.helmetY += c.helmetVy * dt;
      c.helmetAngle += c.helmetVRot * dt;

      // Ground platform bounce for corpse body
      for (const p of this.map.platforms) {
        if (c.x >= p.x && c.x <= p.x + p.w && c.y >= p.y - 15 && c.y <= p.y + p.h) {
          c.y = p.y - 15;
          c.vy = -c.vy * 0.3;
          c.vx *= 0.8;
          c.vRot *= 0.6;
        }

        // Helmet bounce
        if (c.helmetX >= p.x && c.helmetX <= p.x + p.w && c.helmetY >= p.y - 10 && c.helmetY <= p.y + p.h) {
          c.helmetY = p.y - 10;
          c.helmetVy = -c.helmetVy * 0.45;
          c.helmetVx *= 0.85;
          c.helmetVRot *= 0.7;
        }
      }

      if (c.life <= 0) {
        this.corpses.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number, localPlayer: PlayerState | undefined) {
    this.map.pickups.forEach((pk) => {
      if (!pk.isAvailable) {
        pk.currentTimer -= dt;
        if (pk.currentTimer <= 0) {
          pk.isAvailable = true;
        }
      } else {
        // Floating sparkles from available pickups
        if (Math.random() < 0.28) {
          this.particles.push({
            x: pk.x + (Math.random() - 0.5) * 22,
            y: pk.y + 8,
            vx: (Math.random() - 0.5) * 12,
            vy: -32 - Math.random() * 28,
            life: 0.45,
            maxLife: 0.45,
            color: pk.type === 'medkit' ? '#4ade80' : pk.type === 'grenade' ? '#fbbf24' : '#38bdf8',
            size: 2,
            decay: 1,
            type: 'spark',
          });
        }

        if (localPlayer && !localPlayer.isDead) {
          const dist = Math.hypot(localPlayer.x - pk.x, localPlayer.y - pk.y);
          if (dist < 34) {
            if (pk.type === 'medkit') {
              const maxHp = localPlayer.maxHealth || 120;
              if (localPlayer.health < maxHp) {
                localPlayer.health = Math.min(maxHp, localPlayer.health + 50);
                pk.isAvailable = false;
                pk.currentTimer = pk.respawnTime;
                sound.playPickup();
                this.addFloatingText('+50 HP', localPlayer.x, localPlayer.y - 20, '#22c55e');
                this.callbacks.onPickupCollected(pk.id);
              }
            } else if (pk.type === 'grenade') {
              if (!localPlayer.grenadeInventory) {
                localPlayer.grenadeInventory = { frag: 3, stun: 2, gas: 2 };
              }
              localPlayer.grenadeInventory.frag = Math.min(6, (localPlayer.grenadeInventory.frag || 0) + 2);
              localPlayer.grenades = (localPlayer.grenadeInventory.frag || 0) + (localPlayer.grenadeInventory.stun || 0) + (localPlayer.grenadeInventory.gas || 0);
              pk.isAvailable = false;
              pk.currentTimer = pk.respawnTime;
              sound.playPickup();
              this.addFloatingText('+2 FRAG BOMBS 💣', localPlayer.x, localPlayer.y - 20, '#fbbf24');
              this.callbacks.onPickupCollected(pk.id);
            } else if (pk.type === 'stun_grenade') {
              if (!localPlayer.grenadeInventory) {
                localPlayer.grenadeInventory = { frag: 3, stun: 2, gas: 2 };
              }
              localPlayer.grenadeInventory.stun = Math.min(5, (localPlayer.grenadeInventory.stun || 0) + 2);
              localPlayer.grenades = (localPlayer.grenadeInventory.frag || 0) + (localPlayer.grenadeInventory.stun || 0) + (localPlayer.grenadeInventory.gas || 0);
              pk.isAvailable = false;
              pk.currentTimer = pk.respawnTime;
              sound.playPickup();
              this.addFloatingText('+2 EMP STUN ⚡', localPlayer.x, localPlayer.y - 20, '#38bdf8');
              this.callbacks.onPickupCollected(pk.id);
            } else if (pk.type === 'gas_grenade') {
              if (!localPlayer.grenadeInventory) {
                localPlayer.grenadeInventory = { frag: 3, stun: 2, gas: 2 };
              }
              localPlayer.grenadeInventory.gas = Math.min(5, (localPlayer.grenadeInventory.gas || 0) + 2);
              localPlayer.grenades = (localPlayer.grenadeInventory.frag || 0) + (localPlayer.grenadeInventory.stun || 0) + (localPlayer.grenadeInventory.gas || 0);
              pk.isAvailable = false;
              pk.currentTimer = pk.respawnTime;
              sound.playPickup();
              this.addFloatingText('+2 TOXIC GAS 🧪', localPlayer.x, localPlayer.y - 20, '#a3e635');
              this.callbacks.onPickupCollected(pk.id);
            } else if (pk.type === 'weapon' && pk.weaponType) {
              const newWeapon = pk.weaponType;
              const config = WEAPONS[newWeapon];

              // Dual Wielding Check: Picking up a 2nd identical one-handed gun
              if (config.isOneHanded && localPlayer.currentWeapon === newWeapon && !localPlayer.isDualWielding) {
                localPlayer.isDualWielding = true;
                localPlayer.ammo = config.ammoMax * 2;
                localPlayer.reserveAmmo = config.ammoReserve * 2;
                localPlayer.isReloading = false;
                sound.playPickup();
                this.addFloatingText(`DUAL WIELD! x2 ${config.name.toUpperCase()}`, localPlayer.x, localPlayer.y - 25, '#f59e0b');
              } else {
                // Secondary weapon stash or primary swap
                if (localPlayer.currentWeapon !== newWeapon) {
                  localPlayer.secondaryWeapon = localPlayer.currentWeapon;
                }
                localPlayer.currentWeapon = newWeapon;
                localPlayer.isDualWielding = false;
                localPlayer.ammo = config.ammoMax;
                localPlayer.reserveAmmo = config.ammoReserve;
                localPlayer.isReloading = false;
                sound.playPickup();
                this.addFloatingText(config.name, localPlayer.x, localPlayer.y - 20, '#38bdf8');
              }

              pk.isAvailable = false;
              pk.currentTimer = pk.respawnTime;
              this.callbacks.onPickupCollected(pk.id);
            }
          }
        }
      }
    });
  }

  private resolvePlayerPlatformCollision(player: PlayerState, dt: number) {
    const halfW = this.PLAYER_WIDTH / 2; // 14
    // Hitbox shrinks when crouching
    const halfH = player.isCrouching ? 13 : this.PLAYER_HEIGHT / 2; // 13 vs 22

    // 1. Decoupled Horizontal Movement (X-axis)
    let newX = player.x + player.vx * dt;
    newX = Math.max(halfW, Math.min(this.map.width - halfW, newX));

    for (const p of this.map.platforms) {
      // Check if vertical extents overlap with small top/bottom margin so ceilings/floors are not detected as walls
      const overlapsY = (player.y + halfH - 4 > p.y) && (player.y - halfH + 4 < p.y + p.h);
      if (!overlapsY) continue;

      // Moving right into left wall
      if (player.vx > 0 && player.x + halfW <= p.x + 2 && newX + halfW >= p.x) {
        newX = p.x - halfW;
        player.vx = 0; // slide along wall vertically without sticking!
      }
      // Moving left into right wall
      else if (player.vx < 0 && player.x - halfW >= p.x + p.w - 2 && newX - halfW <= p.x + p.w) {
        newX = p.x + p.w + halfW;
        player.vx = 0; // slide along wall vertically without sticking!
      }
    }
    player.x = newX;

    // 2. Decoupled Vertical Movement (Y-axis)
    let newY = player.y + player.vy * dt;
    let groundedThisFrame = false;

    for (const p of this.map.platforms) {
      // Check horizontal overlap with 2px corner tolerance so player slides cleanly over edges
      const overlapsX = (player.x + halfW - 2 > p.x) && (player.x - halfW + 2 < p.x + p.w);
      if (!overlapsX) continue;

      // Falling down onto top of platform
      if (player.vy >= 0) {
        const feetPrev = player.y + halfH;
        const feetNew = newY + halfH;
        // Proper ground check with a 6px tolerance
        if (feetPrev <= p.y + 6 && feetNew >= p.y) {
          if (p.isJumpPad) {
            newY = p.y - halfH;
            player.vy = -750;
            sound.playZoom();
            groundedThisFrame = true;
          } else {
            newY = p.y - halfH;
            player.vy = 0;
            groundedThisFrame = true;
          }
        }
      }
      // Hitting underside of platform (ceiling)
      else if (player.vy < 0) {
        const headPrev = player.y - halfH;
        const headNew = newY - halfH;
        if (headPrev >= p.y + p.h - 6 && headNew <= p.y + p.h) {
          newY = p.y + p.h + halfH;
          player.vy = 0;
        }
      }
    }

    // Map bottom floor
    if (newY + halfH >= this.map.height - 8) {
      newY = this.map.height - 8 - halfH;
      player.vy = 0;
      groundedThisFrame = true;
    }

    player.y = newY;
    player.isGrounded = groundedThisFrame;
  }

  private updateBots(dt: number, now: number) {
    for (const bot of this.players.values()) {
      if (!bot.isBot || bot.isDead) continue;

      // Find nearest alive opponent
      let target: PlayerState | null = null;
      let minDist = 800;

      for (const other of this.players.values()) {
        if (other.id !== bot.id && !other.isDead) {
          const d = Math.hypot(other.x - bot.x, other.y - bot.y);
          if (d < minDist) {
            minDist = d;
            target = other;
          }
        }
      }

      let moveX = 0;
      let isJetpacking = false;
      let isShooting = false;

      if (target) {
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        bot.aimAngle = Math.atan2(dy, dx);
        bot.facingLeft = dx < 0;

        if (Math.abs(dx) > 120) {
          moveX = dx > 0 ? 0.75 : -0.75;
        }

        // Use jetpack if target is higher up or gap
        if (dy < -60 && bot.fuel > 20) {
          isJetpacking = true;
        }

        if (minDist < 600) {
          isShooting = Math.random() < 0.65;
        }

        // Close range melee
        if (minDist < 50 && Math.random() < 0.2) {
          this.meleeAttack(bot.id);
        }
      } else {
        moveX = Math.sin(now * 0.001 + parseInt(bot.id.slice(-2) || '1', 16)) > 0.2 ? 0.7 : -0.7;
      }

      this.updateLocalPlayer(
        dt,
        bot,
        {
          moveX,
          moveY: isJetpacking ? -0.8 : 0,
          aimX: Math.cos(bot.aimAngle),
          aimY: Math.sin(bot.aimAngle),
          isJetpacking,
          isShooting,
        },
        now
      );
    }
  }

  public initSurvivalWave(wave: number) {
    this.survivalWave = wave;
    const botCount = 2 + wave * 2; // Wave 1: 4 bots, Wave 2: 6 bots...
    this.botsRemainingInWave = botCount;

    // Remove old bots
    const botIds = Array.from(this.players.keys()).filter((id) => id.startsWith('bot_'));
    botIds.forEach((id) => this.players.delete(id));

    const botWeapons: WeaponType[] = ['pistol', 'smg', 'rifle', 'shotgun'];
    if (wave >= 3) botWeapons.push('sniper', 'rocket');

    for (let i = 0; i < botCount; i++) {
      const sp = this.map.spawnPoints[i % this.map.spawnPoints.length];
      const botWeapon = botWeapons[i % botWeapons.length];
      const botPlayer: PlayerState = {
        id: `bot_${wave}_${i}`,
        name: `Doodle Bot #${i + 1}`,
        color: '#dc2626',
        avatar: {
          headwear: i % 2 === 0 ? 'helmet' : 'bandana',
          camo: 'crimson',
          skinTone: '#fde047',
        },
        x: sp.x + (Math.random() - 0.5) * 60,
        y: sp.y,
        vx: 0,
        vy: 0,
        aimAngle: 0,
        isGrounded: false,
        isJetpacking: false,
        isShooting: false,
        facingLeft: false,
        health: 75 + wave * 10,
        maxHealth: 75 + wave * 10,
        fuel: 100,
        maxFuel: 100,
        lives: 1,
        currentWeapon: botWeapon,
        isDualWielding: wave >= 2 && i % 3 === 0,
        ammo: WEAPONS[botWeapon].ammoMax,
        reserveAmmo: WEAPONS[botWeapon].ammoReserve,
        grenades: 1,
        isReloading: false,
        reloadProgress: 1,
        kills: 0,
        deaths: 0,
        score: 0,
        isDead: false,
        respawnTimeRemaining: 0,
        isBot: true,
      };

      this.players.set(botPlayer.id, botPlayer);
    }
  }

  private updateSurvivalLogic(dt: number) {
    const aliveBots = Array.from(this.players.values()).filter((p) => p.isBot && !p.isDead).length;

    if (aliveBots === 0) {
      this.waveTransitionTimer += dt;
      if (this.waveTransitionTimer >= 3.0) {
        this.waveTransitionTimer = 0;
        const nextWave = this.survivalWave + 1;
        this.initSurvivalWave(nextWave);
        if (this.callbacks.onWaveComplete) {
          this.callbacks.onWaveComplete(nextWave);
        }
      }
    }
  }

  public respawnPlayer(player: PlayerState) {
    player.isDead = false;
    player.maxHealth = 120;
    player.health = 120;
    player.isCrouching = false;
    player.fuel = player.maxFuel;
    player.stunTimer = 0;
    player.burnTimer = 0;
    player.timeSinceLastDamage = 5.0;
    player.isRegeneratingHealth = false;
    player.currentWeapon = 'pistol';
    player.secondaryWeapon = undefined;
    player.isDualWielding = false;
    player.ammo = WEAPONS.pistol.ammoMax;
    player.reserveAmmo = WEAPONS.pistol.ammoReserve;
    player.currentGrenadeType = 'frag';
    player.grenadeInventory = { frag: 3, stun: 2, gas: 2 };
    player.grenades = 7;
    player.isReloading = false;
    player.reloadProgress = 1;
    player.vx = 0;
    player.vy = 0;

    const spIndex = Math.floor(Math.random() * this.map.spawnPoints.length);
    const sp = this.map.spawnPoints[spIndex];
    player.x = sp.x;
    player.y = sp.y;
  }

  public addFloatingText(text: string, x: number, y: number, color = '#ffffff') {
    this.floatingTexts.push({
      id: 'ft_' + Math.random(),
      text,
      x,
      y,
      vy: -45,
      color,
      alpha: 1,
    });
  }

  public triggerEmote(playerId: string, emote: string, text?: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    player.activeEmote = {
      emote,
      text: text || '',
      expiresAt: Date.now() + 3500,
    };
  }
}
