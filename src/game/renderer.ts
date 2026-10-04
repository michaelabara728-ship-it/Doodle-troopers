import {
  PlayerState,
  Bullet,
  Particle,
  FloatingText,
  MapData,
  RagdollCorpse,
  Platform,
  SceneryItem,
  GasCloud,
} from '../types/game';
import { WEAPONS } from './weapons';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera = { x: 0, y: 0, zoom: 1.0 };
  private targetZoom = 1.0;
  private currentZoom = 1.0;
  private shakeIntensity = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D rendering context');
    this.ctx = context;
  }

  public setZoom(zoomLevel: number) {
    // 1x = 1.0, 2x = 1.25, 3x = 1.55, 4x = 1.9, 5x = 2.3, 6x = 2.75
    const zoomMap: Record<number, number> = {
      1: 1.0,
      2: 1.25,
      3: 1.55,
      4: 1.9,
      5: 2.3,
      6: 2.75,
    };
    this.targetZoom = zoomMap[zoomLevel] || 1.0;
  }

  public addScreenShake(intensity: number) {
    this.shakeIntensity = Math.min(18, this.shakeIntensity + intensity);
  }

  public updateCamera(target: { x: number; y: number }, map: MapData, dt = 0.016) {
    // Smooth zoom interpolation centered on target
    const zoomSpeed = Math.min(1, 10 * dt);
    this.currentZoom += (this.targetZoom - this.currentZoom) * zoomSpeed;
    this.camera.zoom = this.currentZoom;

    // Viewport dimensions in game world units
    const viewW = this.canvas.width / this.camera.zoom;
    const viewH = this.canvas.height / this.camera.zoom;

    let targetCamX = target.x;
    let targetCamY = target.y;

    // Soft clamp within map bounds if map is larger than view
    if (map.width > viewW) {
      targetCamX = Math.max(viewW / 2, Math.min(map.width - viewW / 2, targetCamX));
    } else {
      targetCamX = map.width / 2;
    }

    if (map.height > viewH) {
      targetCamY = Math.max(viewH / 2, Math.min(map.height - viewH / 2, targetCamY));
    } else {
      targetCamY = map.height / 2;
    }

    // Smooth camera tracking
    const panSpeed = Math.min(1, 14 * dt);
    this.camera.x += (targetCamX - this.camera.x) * panSpeed;
    this.camera.y += (targetCamY - this.camera.y) * panSpeed;

    // Screen Shake decay
    if (this.shakeIntensity > 0.1) {
      this.shakeIntensity *= Math.pow(0.05, dt);
    } else {
      this.shakeIntensity = 0;
    }
  }

  public render(
    map: MapData,
    players: Map<string, PlayerState>,
    bullets: Bullet[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    corpses: RagdollCorpse[],
    localPlayerId: string,
    gasClouds: GasCloud[] = []
  ) {
    const ctx = this.ctx;
    const now = performance.now() * 0.001;

    // 1. Clear Screen
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Dynamic background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGrad.addColorStop(0, map.bgGradient[0]);
    bgGrad.addColorStop(0.5, map.bgGradient[1]);
    bgGrad.addColorStop(1, map.bgGradient[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Camera & Shake Transform (Centered on camera target)
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;

    ctx.translate(this.canvas.width / 2 + shakeX, this.canvas.height / 2 + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // 2. Render Parallax Scenery (trees, cabins, cacti)
    this.renderScenery(ctx, map.scenery || []);

    // 3. Render Map Platforms with bold doodle outlines
    this.renderPlatforms(ctx, map.platforms);

    // 4. Render Toxic Gas Clouds (billowing poison mist)
    this.renderGasClouds(ctx, gasClouds, now);

    // 5. Render Pickups (weapons, medkits, grenades)
    this.renderPickups(ctx, map.pickups, now);

    // 6. Render Ragdoll Corpses (tumbling bodies & bouncing helmets)
    this.renderCorpses(ctx, corpses);

    // 7. Render Soldiers (hand-drawn cartoon style)
    const localPlayer = players.get(localPlayerId);
    players.forEach((player) => {
      this.renderDoodleSoldier(ctx, player, player.id === localPlayerId, now);
    });

    // 8. Render Sniper Laser sight
    if (localPlayer && !localPlayer.isDead && localPlayer.currentWeapon === 'sniper') {
      this.renderSniperLaser(ctx, localPlayer, map);
    }

    // 9. Render Bullets & Grenades
    this.renderBullets(ctx, bullets, now);

    // 10. Render Particles (flames, sparks, smoke, blood)
    this.renderParticles(ctx, particles);

    // 11. Render Floating Damage Numbers
    this.renderFloatingTexts(ctx, floatingTexts);

    ctx.restore();
  }

  private renderScenery(ctx: CanvasRenderingContext2D, scenery: SceneryItem[]) {
    scenery.forEach((s) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      const sc = s.scale || 1.0;
      ctx.scale(sc, sc);

      if (s.type === 'palm_tree') {
        // Hand-drawn curved trunk
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-15, -60, 10, -120);
        ctx.stroke();

        // Lush green fronds
        ctx.fillStyle = '#15803d';
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 3;
        const frondAngles = [-1.8, -1.2, -0.6, 0, 0.6, 1.2];
        frondAngles.forEach((a) => {
          ctx.save();
          ctx.translate(10, -120);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.ellipse(30, 0, 36, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      } else if (s.type === 'pine_tree') {
        // Wooden trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-6, -20, 12, 20);

        // Layered snow pine needles
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#022c22';
        ctx.lineWidth = 3;
        for (let tier = 0; tier < 3; tier++) {
          const yOff = -20 - tier * 32;
          const w = 48 - tier * 10;
          ctx.beginPath();
          ctx.moveTo(-w, yOff);
          ctx.lineTo(w, yOff);
          ctx.lineTo(0, yOff - 36);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Snow cap on edges
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(-w, yOff);
          ctx.lineTo(w, yOff);
          ctx.lineTo(0, yOff - 12);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#064e3b';
        }
      } else if (s.type === 'cabin') {
        // Log cabin body
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#291307';
        ctx.lineWidth = 4;
        ctx.fillRect(-55, -65, 110, 65);
        ctx.strokeRect(-55, -65, 110, 65);

        // Triangular roof with snow
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(-68, -65);
        ctx.lineTo(68, -65);
        ctx.lineTo(0, -115);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Snow layer on roof
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-68, -65);
        ctx.lineTo(68, -65);
        ctx.lineTo(0, -100);
        ctx.closePath();
        ctx.fill();

        // Window & Door
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-35, -45, 22, 20);
        ctx.strokeRect(-35, -45, 22, 20);

        ctx.fillStyle = '#451a03';
        ctx.fillRect(8, -48, 24, 48);
        ctx.strokeRect(8, -48, 24, 48);
      } else if (s.type === 'cactus') {
        // Desert Saguaro Cactus with thick comic outlines
        ctx.fillStyle = '#15803d';
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // Main stem
        ctx.fillRect(-10, -95, 20, 95);
        ctx.strokeRect(-10, -95, 20, 95);

        // Left arm
        ctx.fillRect(-32, -65, 22, 14);
        ctx.fillRect(-32, -85, 14, 25);
        ctx.strokeRect(-32, -85, 14, 25);

        // Right arm
        ctx.fillRect(10, -50, 22, 14);
        ctx.fillRect(18, -75, 14, 30);
        ctx.strokeRect(18, -75, 14, 30);
      }

      ctx.restore();
    });
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[]) {
    platforms.forEach((p) => {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';

      if (p.isJumpPad) {
        // High bounce trampoline / steam vent pad
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeRect(p.x, p.y, p.w, p.h);

        // Glowing chevrons
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2 - 8, p.y + p.h - 3);
        ctx.lineTo(p.x + p.w / 2, p.y + 3);
        ctx.lineTo(p.x + p.w / 2 + 8, p.y + p.h - 3);
        ctx.fill();
      } else {
        // Platform body
        ctx.fillStyle = p.color || '#334155';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeRect(p.x, p.y, p.w, p.h);

        // Comic top-surface styling (grass / snow / wood planks)
        if (p.type === 'grass') {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(p.x + 2, p.y + 1, p.w - 4, 6);
        } else if (p.type === 'snow') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p.x + 2, p.y + 1, p.w - 4, 6);
        } else if (p.type === 'wood') {
          ctx.fillStyle = '#d97706';
          ctx.fillRect(p.x + 2, p.y + 1, p.w - 4, 4);
        }
      }

      ctx.restore();
    });
  }

  private renderGasClouds(ctx: CanvasRenderingContext2D, gasClouds: GasCloud[], now: number) {
    gasClouds.forEach((g) => {
      ctx.save();
      const alpha = Math.min(0.62, g.duration / 1.5);
      ctx.globalAlpha = alpha;

      // Outer toxic radial glow
      const grad = ctx.createRadialGradient(g.x, g.y, g.radius * 0.15, g.x, g.y, g.radius);
      grad.addColorStop(0, 'rgba(132, 204, 22, 0.45)');
      grad.addColorStop(0.65, 'rgba(34, 197, 94, 0.28)');
      grad.addColorStop(1, 'rgba(21, 128, 61, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();

      // Billowing layered toxic smoke puffs
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 + now * 0.4 * (i % 2 === 0 ? 1 : -1);
        const dist = g.radius * 0.45 + Math.sin(now * 2 + i) * 6;
        const puffX = g.x + Math.cos(angle) * dist;
        const puffY = g.y + Math.sin(angle) * dist;
        const puffR = g.radius * 0.42 + Math.cos(now * 2 + i) * 5;

        ctx.fillStyle = i % 2 === 0 ? 'rgba(74, 222, 128, 0.22)' : 'rgba(163, 230, 53, 0.2)';
        ctx.beginPath();
        ctx.arc(puffX, puffY, puffR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center floating biohazard flask symbol
      ctx.fillStyle = '#bef264';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧪', g.x, g.y + Math.sin(now * 3) * 3);

      ctx.restore();
    });
  }

  private renderPickups(ctx: CanvasRenderingContext2D, pickups: MapData['pickups'], time: number) {
    pickups.forEach((pk) => {
      if (!pk.isAvailable) {
        // Respawn ring indicator
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(pk.x, pk.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      }

      const bobY = pk.y + Math.sin(time * 3 + pk.x) * 4;

      ctx.save();
      // Platform pedestal shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(pk.x, pk.y + 16, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pickup Box with bold doodle outline
      ctx.fillStyle =
        pk.type === 'medkit'
          ? '#16a34a'
          : pk.type === 'grenade'
          ? '#d97706'
          : pk.type === 'stun_grenade'
          ? '#0284c7'
          : pk.type === 'gas_grenade'
          ? '#15803d'
          : '#0284c7';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(pk.x - 14, bobY - 14, 28, 28, [6]);
      ctx.fill();
      ctx.stroke();

      // Subtle glint sheen sweep
      const glintCycle = (time * 1.4 + pk.x * 0.05) % 2.2;
      if (glintCycle < 0.5) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pk.x - 14, bobY - 14, 28, 28, [6]);
        ctx.clip();
        const gx = pk.x - 24 + (glintCycle / 0.5) * 48;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillRect(gx - 4, bobY - 14, 8, 28);
        ctx.restore();
      }

      // Icon & Label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      if (pk.type === 'medkit') {
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('✚', pk.x, bobY);
      } else if (pk.type === 'grenade') {
        ctx.font = '14px sans-serif';
        ctx.fillText('💣', pk.x, bobY);
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.fillText('FRAG', pk.x, bobY - 18);
      } else if (pk.type === 'stun_grenade') {
        ctx.font = '14px sans-serif';
        ctx.fillText('⚡', pk.x, bobY);
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('EMP STUN', pk.x, bobY - 18);
      } else if (pk.type === 'gas_grenade') {
        ctx.font = '14px sans-serif';
        ctx.fillText('🧪', pk.x, bobY);
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#a3e635';
        ctx.fillText('TOXIC GAS', pk.x, bobY - 18);
      } else if (pk.weaponType) {
        const weapon = WEAPONS[pk.weaponType];
        ctx.font = '14px sans-serif';
        ctx.fillText(weapon?.icon || '🔫', pk.x, bobY);

        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(weapon.name, pk.x, bobY - 19);
      }

      ctx.restore();
    });
  }

  private renderDoodleSoldier(ctx: CanvasRenderingContext2D, player: PlayerState, isLocal: boolean, time: number) {
    if (player.isDead) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    const facingRight = !player.facingLeft;
    const bodyScaleX = facingRight ? 1 : -1;

    // Jetpack Thruster Flame - dynamic thrust scaling
    if (player.isJetpacking && player.fuel > 0) {
      ctx.save();
      const thrusterX = facingRight ? -14 : 14;
      ctx.translate(thrusterX, 6);

      // Flame length grows with vertical thrust speed
      const thrustFactor = Math.min(2.0, 1.0 + Math.max(0, -player.vy) / 220);
      const flameH = (15 + Math.random() * 9) * thrustFactor;
      const flameW = 6 * thrustFactor;

      // Outer roaring flame
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-flameW, 0);
      ctx.lineTo(flameW, 0);
      ctx.lineTo(0, flameH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White/Cyan hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-flameW * 0.4, 0);
      ctx.lineTo(flameW * 0.4, 0);
      ctx.lineTo(0, flameH * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Separate Body Parts Hierarchy
    ctx.save();
    ctx.scale(bodyScaleX, 1);

    // Body Tilt Calculation: tilts forward when running, tilts dynamically when flying
    const isMoving = Math.abs(player.vx) > 15 && player.isGrounded;
    const flyTilt = !player.isGrounded
      ? Math.max(-0.4, Math.min(0.4, (player.vx / 320) * 0.35 + (player.isJetpacking ? -0.15 : 0.12)))
      : (isMoving ? 0.08 : 0);
    const bodyTilt = player.bodyTilt !== undefined ? player.bodyTilt : flyTilt;

    // Crouch stance lowering
    const crouchOffset = player.isCrouching ? 7 : 0;

    // Leg Swings: Upper thigh, knee bend, calf, and tactical boot
    const legSwing = player.isCrouching
      ? 0.4
      : isMoving
      ? Math.sin(time * 16) * 0.55
      : (!player.isGrounded ? 0.28 : 0);

    // 1. BACK LEG (Thigh, Knee, Calf, Boot)
    ctx.save();
    ctx.translate(-4, 12 + crouchOffset * 0.4);
    ctx.rotate(player.isCrouching ? -0.55 : -legSwing);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, player.isCrouching ? 5 : 7);
    ctx.stroke();
    // Lower leg
    ctx.translate(0, player.isCrouching ? 5 : 7);
    ctx.rotate(player.isCrouching ? 0.9 : isMoving ? Math.max(0, legSwing * 0.7) : 0.1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, player.isCrouching ? 5 : 8);
    ctx.stroke();
    // Combat Boot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, player.isCrouching ? 3 : 6, 7, 4);
    ctx.restore();

    // 2. TORSO / BODY (Tilts dynamically in flight and run, lowers in crouch)
    ctx.save();
    ctx.translate(0, crouchOffset);
    ctx.rotate(bodyTilt);

    // Jetpack canister on back
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.fillRect(-18, -4, 8, 20);
    ctx.strokeRect(-18, -4, 8, 20);
    // Canister metallic nozzle
    ctx.fillStyle = '#334155';
    ctx.fillRect(-17, 16, 6, 4);

    // Soldier Torso / Camo Uniform
    const camoColor = this.getCamoColor(player.avatar?.camo || 'jungle');
    ctx.fillStyle = camoColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-10, -6, 20, 20, [4]);
    ctx.fill();
    ctx.stroke();

    // Tactical utility belt & pouch
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-9, 10, 18, 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, 10, 4, 4);
    ctx.fillRect(2, 10, 4, 4);
    ctx.restore(); // end torso tilt

    // 3. FRONT LEG (Thigh, Knee, Calf, Boot)
    ctx.save();
    ctx.translate(4, 12 + crouchOffset * 0.4);
    ctx.rotate(player.isCrouching ? 0.55 : legSwing);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, player.isCrouching ? 5 : 7);
    ctx.stroke();
    // Lower leg
    ctx.translate(0, player.isCrouching ? 5 : 7);
    ctx.rotate(player.isCrouching ? -0.85 : isMoving ? Math.max(0, -legSwing * 0.7) : 0.1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, player.isCrouching ? 5 : 8);
    ctx.stroke();
    // Combat Boot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, player.isCrouching ? 3 : 6, 7, 4);
    ctx.restore();

    // 4. HEAD (Separated, with running bob and aim tracking tilt)
    ctx.save();
    const headBob = isMoving ? Math.abs(Math.sin(time * 16)) * 2 : 0;
    ctx.translate(0, -14 - headBob + crouchOffset);
    const skinColor = player.avatar?.skinTone || '#fde047';
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Doodle Cartoon Face: Eye & Eyebrow
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(4, -1, 2.5, 0, Math.PI * 2); // eye
    ctx.fill();
    // Determined eyebrow
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, -5);
    ctx.lineTo(7, -3);
    ctx.stroke();

    // Custom Headwear (Helmet, Beret, Bandana, Beanie, etc.)
    this.renderHeadwear(ctx, player.avatar?.headwear || 'helmet', camoColor);
    ctx.restore(); // end head

    ctx.restore(); // end flip scale

    // Small Shield Icon above crouching player
    if (player.isCrouching && !player.isDead) {
      ctx.save();
      const shieldY = -48 + Math.sin(time * 8) * 2;
      ctx.translate(0, shieldY);

      // Neon-cyan defensive aura
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // Shield outline
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, -4);
      ctx.lineTo(5, 4);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 4);
      ctx.lineTo(-7, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mini shield emoji / graphic
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', 0, 0);
      ctx.restore();
    }

    // 5. ARMS & WEAPON: Aiming along aimAngle + Gun Recoil
    this.renderWeapon(ctx, player, facingRight, time);

    // EMP Stun electric shock visual effect
    if (player.stunTimer && player.stunTimer > 0) {
      ctx.save();
      // Draw crackling jagged electric arcs around the soldier
      ctx.strokeStyle = Math.sin(time * 30) > 0 ? '#38bdf8' : '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let arc = 0; arc < 4; arc++) {
        const baseA = (arc * Math.PI) / 2 + time * 6;
        const r1 = 15 + Math.random() * 8;
        const r2 = 24 + Math.random() * 8;
        ctx.moveTo(Math.cos(baseA) * r1, Math.sin(baseA) * r1);
        ctx.lineTo(Math.cos(baseA + 0.3) * (r1 + r2) * 0.5, Math.sin(baseA + 0.3) * (r1 + r2) * 0.5);
        ctx.lineTo(Math.cos(baseA + 0.6) * r2, Math.sin(baseA + 0.6) * r2);
      }
      ctx.stroke();

      // Pulsing ⚡ icon above head
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, -42 + Math.sin(time * 12) * 3);
      ctx.restore();
    }

    // Burning visual effect
    if (player.burnTimer && player.burnTimer > 0) {
      ctx.save();
      for (let f = 0; f < 3; f++) {
        const fx = (f - 1) * 8 + Math.sin(time * 15 + f) * 3;
        const fy = -8 + Math.cos(time * 15 + f) * 5;
        ctx.fillStyle = f % 2 === 0 ? '#f97316' : '#ef4444';
        ctx.beginPath();
        ctx.arc(fx, fy, 4 + Math.sin(time * 20 + f) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Melee Punch Arc
    if (player.isMeleeing) {
      this.renderMeleeArc(ctx, facingRight);
    }

    // Mini Overhead Name & Health HUD
    this.renderPlayerOverheadHUD(ctx, player, isLocal, time);

    ctx.restore();
  }

  private getCamoColor(camo: string): string {
    switch (camo) {
      case 'jungle':
        return '#15803d'; // Olive jungle green
      case 'desert':
        return '#d97706'; // Desert tan
      case 'urban':
        return '#2563eb'; // Urban navy
      case 'arctic':
        return '#94a3b8'; // Arctic gray
      case 'blackops':
        return '#1e293b'; // Midnight black
      case 'crimson':
        return '#dc2626'; // Crimson red
      default:
        return '#15803d';
    }
  }

  private renderHeadwear(ctx: CanvasRenderingContext2D, headwear: string, camoColor: string) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';

    switch (headwear) {
      case 'beret':
        // Military side-tilted beret
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(0, -22, 13, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Beret badge
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(5, -22, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bandana':
        // Commando forehead bandana with trailing knot
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-10, -18, 20, 5);
        ctx.strokeRect(-10, -18, 20, 5);
        // Knot ribbons
        ctx.beginPath();
        ctx.moveTo(-10, -16);
        ctx.lineTo(-16, -10);
        ctx.lineTo(-10, -14);
        ctx.fill();
        break;

      case 'beanie':
        // Winter ribbed beanie
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-10, -26, 20, 14, [6]);
        ctx.fill();
        ctx.stroke();
        break;

      case 'boonie':
        // Jungle wide-brim hat
        ctx.fillStyle = camoColor;
        ctx.fillRect(-8, -25, 16, 12);
        ctx.strokeRect(-8, -25, 16, 12);
        // Brim
        ctx.beginPath();
        ctx.ellipse(0, -18, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'aviator':
        // Pilot cap with goggles
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(0, -16, 11, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Goggles
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-2, -18, 9, 5);
        ctx.strokeRect(-2, -18, 9, 5);
        break;

      case 'helmet':
      default:
        // Steel combat pot helmet
        ctx.fillStyle = camoColor;
        ctx.beginPath();
        ctx.arc(0, -16, 12, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Rim
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-12, -16, 24, 3);
        break;
    }
  }

  private renderWeapon(ctx: CanvasRenderingContext2D, player: PlayerState, facingRight: boolean, time: number) {
    const config = WEAPONS[player.currentWeapon] || WEAPONS.pistol;

    ctx.save();
    ctx.rotate(player.aimAngle);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';

    const skinColor = player.avatar?.skinTone || '#fde047';

    // Gun Recoil kicking back along aim direction when firing
    const recoil = player.isShooting && player.ammo > 0 && !player.isReloading
      ? Math.abs(Math.sin(time * 35)) * 4.5
      : 0;
    ctx.translate(-recoil, 0);

    // Back Arm (from back shoulder to rear grip)
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(2, 4);
    ctx.stroke();
    ctx.restore();

    const renderSingleGun = (yOffset: number) => {
      ctx.save();
      ctx.translate(0, yOffset);
      ctx.fillStyle = config.color;

      switch (player.currentWeapon) {
        case 'pistol':
          ctx.fillRect(4, -3, 14, 6);
          ctx.strokeRect(4, -3, 14, 6);
          ctx.fillStyle = '#334155';
          ctx.fillRect(2, 2, 5, 6);
          break;

        case 'revolver':
          // Heavy .44 Magnum revolver
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(4, -4, 18, 6);
          ctx.strokeRect(4, -4, 18, 6);
          // Cylinder
          ctx.fillStyle = '#475569';
          ctx.fillRect(5, -2, 7, 7);
          ctx.strokeRect(5, -2, 7, 7);
          // Hammer
          ctx.fillStyle = '#334155';
          ctx.fillRect(3, -7, 3, 4);
          // Wooden grip
          ctx.fillStyle = '#78350f';
          ctx.fillRect(1, 2, 6, 7);
          ctx.strokeRect(1, 2, 6, 7);
          break;

        case 'smg':
          ctx.fillRect(3, -4, 18, 8);
          ctx.strokeRect(3, -4, 18, 8);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(8, 4, 5, 8); // magazine
          break;

        case 'minigun':
          // Heavy rotary minigun chassis
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-2, -6, 20, 12);
          ctx.strokeRect(-2, -6, 20, 12);
          // Multi-barrel spindle
          ctx.fillStyle = '#475569';
          ctx.fillRect(18, -5, 16, 10);
          ctx.strokeRect(18, -5, 16, 10);
          // Barrel clamps
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(24, -6, 3, 12);
          ctx.fillRect(32, -6, 3, 12);
          // Ammo drum underneath
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(8, 7, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;

        case 'flamethrower':
          // Heavy industrial flamethrower
          ctx.fillStyle = '#c2410c';
          ctx.fillRect(0, -5, 22, 10);
          ctx.strokeRect(0, -5, 22, 10);
          // Twin fuel tanks
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(4, 5, 12, 8);
          ctx.strokeRect(4, 5, 12, 8);
          // Hazard stripe
          ctx.fillStyle = '#facc15';
          ctx.fillRect(7, 7, 6, 4);
          // Nozzle
          ctx.fillStyle = '#334155';
          ctx.fillRect(22, -2, 10, 4);
          ctx.strokeRect(22, -2, 10, 4);
          // Pilot flame
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(33, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'plasma':
          // Sci-Fi plasma carbine
          ctx.fillStyle = '#0891b2';
          ctx.fillRect(2, -5, 26, 10);
          ctx.strokeRect(2, -5, 26, 10);
          // Glowing energy core
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(10, -3, 9, 6);
          ctx.strokeRect(10, -3, 9, 6);
          // Dual emitter tips
          ctx.fillStyle = '#0e7490';
          ctx.fillRect(28, -6, 6, 3);
          ctx.fillRect(28, 3, 6, 3);
          break;

        case 'saw':
          // Heavy mechanical saw launcher
          ctx.fillStyle = '#475569';
          ctx.fillRect(-2, -6, 22, 12);
          ctx.strokeRect(-2, -6, 22, 12);
          // Exposed circular saw blade mount
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(22, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Red hub
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(22, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'rifle':
          ctx.fillRect(2, -4, 24, 8);
          ctx.strokeRect(2, -4, 24, 8);
          // Curved banana magazine
          ctx.fillStyle = '#78350f';
          ctx.fillRect(10, 4, 6, 9);
          // Barrel tip
          ctx.fillStyle = '#334155';
          ctx.fillRect(26, -2, 6, 4);
          break;

        case 'shotgun':
          ctx.fillRect(0, -5, 26, 9);
          ctx.strokeRect(0, -5, 26, 9);
          // Pump slide
          ctx.fillStyle = '#78350f';
          ctx.fillRect(10, -2, 8, 6);
          break;

        case 'sniper':
          ctx.fillRect(2, -4, 34, 7);
          ctx.strokeRect(2, -4, 34, 7);
          // Scope
          ctx.fillStyle = '#065f46';
          ctx.fillRect(10, -8, 14, 4);
          ctx.strokeRect(10, -8, 14, 4);
          break;

        case 'rocket':
          ctx.fillRect(-4, -7, 28, 13);
          ctx.strokeRect(-4, -7, 28, 13);
          // Conical rocket head
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(24, -7);
          ctx.lineTo(32, 0);
          ctx.lineTo(24, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
      }

      // Muzzle flash when firing (multi-pointed bright starburst)
      if (player.isShooting && player.ammo > 0 && !player.isReloading) {
        let tipX = 24;
        if (player.currentWeapon === 'sniper') tipX = 38;
        else if (player.currentWeapon === 'rocket') tipX = 32;
        else if (player.currentWeapon === 'minigun') tipX = 35;
        else if (player.currentWeapon === 'flamethrower') tipX = 32;
        else if (player.currentWeapon === 'plasma') tipX = 34;
        else if (player.currentWeapon === 'saw') tipX = 30;
        else if (player.currentWeapon === 'rifle') tipX = 32;

        ctx.save();
        ctx.translate(tipX + 4, 0);
        const flashColor = player.currentWeapon === 'plasma' ? '#38bdf8' : player.currentWeapon === 'flamethrower' ? '#f97316' : '#facc15';
        ctx.fillStyle = flashColor;
        ctx.beginPath();
        const flashSize = 10 + Math.random() * 5;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? flashSize : flashSize * 0.4;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        // Hot white core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, flashSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    };

    if (player.isDualWielding) {
      renderSingleGun(-6);
      renderSingleGun(6);
    } else {
      renderSingleGun(0);
    }

    // Front Arm (reaching forward to gun foregrip)
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(8, 2);
    ctx.stroke();

    // Hand holding the gun
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(8, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private renderMeleeArc(ctx: CanvasRenderingContext2D, facingRight: boolean) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const startA = facingRight ? -Math.PI / 3 : (Math.PI * 4) / 3;
    const endA = facingRight ? Math.PI / 3 : (Math.PI * 2) / 3;
    ctx.arc(facingRight ? 24 : -24, 0, 32, startA, endA, !facingRight);
    ctx.stroke();
    ctx.restore();
  }

  private renderSniperLaser(ctx: CanvasRenderingContext2D, player: PlayerState, map: MapData) {
    ctx.save();
    const startX = player.x + Math.cos(player.aimAngle) * 26;
    const startY = player.y + Math.sin(player.aimAngle) * 26;
    const dirX = Math.cos(player.aimAngle);
    const dirY = Math.sin(player.aimAngle);

    let maxDist = 800;
    // Step ray to find wall intersection
    for (let d = 20; d < maxDist; d += 25) {
      const rx = startX + dirX * d;
      const ry = startY + dirY * d;
      for (const p of map.platforms) {
        if (rx >= p.x && rx <= p.x + p.w && ry >= p.y && ry <= p.y + p.h) {
          maxDist = d;
          break;
        }
      }
    }

    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + dirX * maxDist, startY + dirY * maxDist);
    ctx.stroke();
    ctx.restore();
  }

  private renderPlayerOverheadHUD(ctx: CanvasRenderingContext2D, player: PlayerState, isLocal: boolean, time: number) {
    const barW = 38;
    const barH = 5;
    const hudY = -34;

    ctx.save();
    ctx.font = isLocal ? 'bold 11px sans-serif' : '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isLocal ? '#38bdf8' : '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const label = `${player.name}${player.isBot ? ' [BOT]' : ''}`;
    ctx.strokeText(label, 0, hudY - 3);
    ctx.fillText(label, 0, hudY - 3);

    // Health bar (Purple or pulsing Emerald Green during passive regeneration)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(-barW / 2 - 1, hudY, barW + 2, barH + 2);

    const hpRatio = Math.max(0, player.health / player.maxHealth);
    if (player.isRegeneratingHealth) {
      // Emerald green pulse during passive health regeneration
      ctx.fillStyle = Math.sin(time * 12) > 0 ? '#22c55e' : '#4ade80';
    } else {
      ctx.fillStyle = '#a855f7'; // Standard purple health
    }
    ctx.fillRect(-barW / 2, hudY + 1, barW * hpRatio, barH);

    // Dual wield overhead badge, stun indicator, or health regen indicator
    if (player.stunTimer && player.stunTimer > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('⚡ STUNNED', 0, hudY - 14);
    } else if (player.isRegeneratingHealth) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.fillText('+ RECOVERING', 0, hudY - 14);
    } else if (player.isDualWielding) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('x2 DUAL', 0, hudY - 14);
    }

    // Floating Comic Emote & Speech Bubble
    if (player.activeEmote && player.activeEmote.expiresAt > Date.now()) {
      const remainingMs = player.activeEmote.expiresAt - Date.now();
      const alpha = Math.min(1, Math.max(0, remainingMs / 500));
      const elapsedMs = 3500 - remainingMs;
      // Spring bounce entrance animation
      const scale = elapsedMs < 200 ? 0.3 + (elapsedMs / 200) * 0.75 : 1.0 + Math.sin(time * 6) * 0.03;
      const bobY = Math.sin(time * 4) * 2.5;

      const bubbleY = hudY - 18 + bobY;
      const hasText = !!player.activeEmote.text && player.activeEmote.text.trim().length > 0;
      const bubbleW = hasText ? Math.max(48, player.activeEmote.text!.length * 6.5 + 26) : 34;
      const bubbleH = hasText ? 32 : 26;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, bubbleY);
      ctx.scale(scale, scale);

      // Bubble background and comic black border
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(-bubbleW / 2, -bubbleH, bubbleW, bubbleH, [8]);
      ctx.fill();
      ctx.stroke();

      // Tail pointing downwards to player
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Clear seam
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -1.5, 6, 2);

      // Content inside bubble
      if (hasText) {
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.activeEmote.emote, 0, -16);

        ctx.font = 'bold 7.5px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(player.activeEmote.text!, 0, -5);
      } else {
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.activeEmote.emote, 0, -6);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private renderCorpses(ctx: CanvasRenderingContext2D, corpses: RagdollCorpse[]) {
    corpses.forEach((c) => {
      ctx.save();
      // Tumbling body
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = this.getCamoColor(c.camo);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-10, -8, 20, 16, [4]);
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.fillStyle = c.skinTone;
      ctx.beginPath();
      ctx.arc(0, -12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Detached flying helmet bouncing separately
      ctx.save();
      ctx.translate(c.helmetX, c.helmetY);
      ctx.rotate(c.helmetAngle);
      this.renderHeadwear(ctx, c.headwear, this.getCamoColor(c.camo));
      ctx.restore();

      ctx.restore();
    });
  }

  private renderBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[], time: number) {
    bullets.forEach((b) => {
      ctx.save();

      if (b.weaponType === 'grenade') {
        ctx.translate(b.x, b.y);
        ctx.rotate(time * 12);

        if (b.grenadeType === 'stun') {
          // Electric EMP Stun Grenade
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-7, -7, 14, 14, [4]);
          ctx.fill();
          ctx.stroke();

          // Glowing cyan center band
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-5, -2, 10, 4);

          // Lightning symbol
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', 0, 0);
        } else if (b.grenadeType === 'gas') {
          // Toxic Gas Grenade canister
          ctx.fillStyle = '#15803d';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-6, -8, 12, 16, [3]);
          ctx.fill();
          ctx.stroke();

          // Toxic yellow warning stripe
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-6, -2, 12, 4);

          // Valve tip
          ctx.fillStyle = '#334155';
          ctx.fillRect(-3, -11, 6, 3);
        } else {
          // Classic Frag Grenade
          ctx.fillStyle = '#166534';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Pineapple grid
          ctx.strokeStyle = '#052e16';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-b.radius * 0.7, 0);
          ctx.lineTo(b.radius * 0.7, 0);
          ctx.moveTo(0, -b.radius * 0.7);
          ctx.lineTo(0, b.radius * 0.7);
          ctx.stroke();
        }
      } else if (b.weaponType === 'saw') {
        // High-speed spinning buzzsaw blade
        ctx.translate(b.x, b.y);
        ctx.rotate(time * 28 * (b.vx >= 0 ? 1 : -1));

        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 8 Sharp serrated saw teeth around perimeter
        ctx.fillStyle = '#94a3b8';
        for (let t = 0; t < 8; t++) {
          const a = (t * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * b.radius, Math.sin(a) * b.radius);
          ctx.lineTo(Math.cos(a + 0.3) * (b.radius + 4), Math.sin(a + 0.3) * (b.radius + 4));
          ctx.lineTo(Math.cos(a + 0.4) * b.radius, Math.sin(a + 0.4) * b.radius);
          ctx.closePath();
          ctx.fill();
        }

        // Center red hub
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.weaponType === 'plasma') {
        // High-tech glowing cyan plasma orb
        ctx.translate(b.x, b.y);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // White hot center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.weaponType === 'flamethrower') {
        // Fiery napalm flame burst
        ctx.translate(b.x, b.y);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.weaponType === 'rocket') {
        // Heavy rocket with glowing fin
        ctx.translate(b.x, b.y);
        const angle = Math.atan2(b.vy, b.vx);
        ctx.rotate(angle);
        ctx.fillStyle = '#7c3aed';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.fillRect(-10, -4, 20, 8);
        ctx.strokeRect(-10, -4, 20, 8);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(10, -4);
        ctx.lineTo(16, 0);
        ctx.lineTo(10, 4);
        ctx.closePath();
        ctx.fill();
      } else {
        // High speed bullet tracer
        const speed = Math.hypot(b.vx, b.vy);
        const dirX = b.vx / (speed || 1);
        const dirY = b.vy / (speed || 1);
        const tailLen = Math.min(22, speed * 0.025);

        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - dirX * tailLen, b.y - dirY * tailLen);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  private renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    // Keep batch fast on mobile
    particles.forEach((p) => {
      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.type === 'casing') {
        ctx.fillStyle = p.color || '#fbbf24';
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(p.x - 2, p.y - 1, 4, 2, [0.5]);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
    texts.forEach((t) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }
}
