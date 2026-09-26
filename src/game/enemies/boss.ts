import type { AudioSystem } from "../../audio/audio-system";
import { BaseEntity } from "../../core/entity";
import { defineStats } from "../../core/stats";
import { Bullet } from "../../entities/bullet";
import type { DamageLabel } from "../../entities/damage-label";
import { Enemy } from "../../entities/enemy";
import { Healthbar } from "../../entities/healthbar";
import type { Player } from "../../entities/player";
import type { ParticleSystem } from "../../logic/systems/particle-system";
import { GAME_AUDIO_SOURCES } from "../audio-assets";
import { DangerBullet } from "../bullets/danger-bullet";
import { MissileBullet } from "../bullets/missile-bullet";
import { emitBurst } from "../particles/burst";
import { emitRing } from "../particles/ring";
import { Brown } from "./brown";

type BossStats = Record<never, number>;

const BOSS_STATS_FORMATS = defineStats<BossStats>({});

/** 警戒线实体：竖向半透明红条，用于蓄能激光预警，超时后自动消失。 */
class WarningBeam extends BaseEntity {
    private remaining: number;

    public constructor(
        x: number,
        width: number,
        height: number,
        duration: number,
        color: string = "#ff3030",
    ) {
        super(crypto.randomUUID(), { x, y: 0 }, { width, height }, { shape: "rectangle", color });

        this.remaining = duration;
        this.opacity = 0.3;
        this.zIndex = 15;
    }

    public override ai(delta: number): void {
        this.remaining = Math.max(0, this.remaining - delta);
        this.opacity = 0.18 + 0.3 * Math.abs(Math.sin(this.remaining * 18));

        if (this.remaining === 0) {
            this.active = false;
        }
    }

    public override getEntityType(): "effect" {
        return "effect";
    }
}

/** Boss 专属贯穿激光：整列 AABB 光束，不可格挡，出现后短暂停留并淡出。 */
class HulkLaser extends Bullet {
    private static readonly duration: number = 0.55;

    private elapsed: number = 0;

    public constructor(
        launcher: BaseEntity,
        x: number,
        width: number,
        height: number,
        damage: number,
    ) {
        super(
            crypto.randomUUID(),
            { x, y: -20 },
            { width, height: height + 40 },
            { shape: "rectangle", color: "#ff5040" },
            launcher,
        );

        this.damage = damage;
        this.faction = "enemy";
        this.remainingLifetime = HulkLaser.duration;
        this.zIndex = 18;
    }

    public override ai(delta: number): void {
        this.elapsed += delta;
        this.remainingLifetime = Math.max(0, HulkLaser.duration - this.elapsed);
        this.opacity = 0.35 + 0.6 * (this.remainingLifetime / HulkLaser.duration);

        if (this.remainingLifetime === 0) {
            this.active = false;
        }
    }

    public override judgeCritical(): [boolean, number] {
        return [false, this.damage];
    }

    public override getEntityType(): "bullet" {
        return "bullet";
    }
}

type BossState =
    | { kind: "entry" }
    | { kind: "reposition" }
    | {
          kind: "shift";
          remaining: number;
          duration: number;
          fromX: number;
          fromY: number;
          toX: number;
      }
    | { kind: "idle"; remaining: number }
    | { kind: "fan"; volleys: number; cooldown: number }
    | { kind: "summon"; remaining: number; cooldown: number }
    | { kind: "chargeWarn"; remaining: number }
    | { kind: "chargeDash"; direction: number }
    | { kind: "spiral"; remaining: number; cooldown: number; angle: number }
    | { kind: "laserWarn"; remaining: number; beamX: number }
    | { kind: "converge"; waves: number; cooldown: number }
    | { kind: "dying"; remaining: number; explosionTimer: number };

type BossAttackKind =
    | "fan"
    | "summon"
    | "charge"
    | "spiral"
    | "missiles"
    | "laser"
    | "petal"
    | "converge";

/**
 * Boss「熔核运输舰 CRIMSON HULK」：
 * 三阶段状态机（100%~66% 护航 / 66%~33% 火力全开 / 33%~0% 自毁协议）。
 * 弹幕大多可格挡（鼓励完美格挡攒能量），冲撞与蓄能激光不可格挡（鼓励冲刺无敌）。
 * 护卫（Brown）被击杀时 Boss 受 3% 最大生命连带伤害。
 */
export class Boss extends Enemy<BossStats> {
    private static readonly width: number = 220;
    private static readonly height: number = 120;
    private static readonly hoverY: number = 110;
    private static readonly driftAmplitude: number = 55;
    private static readonly chargeSpeed: number = 640;
    /** 基础血量：与普通小怪一致地按波次 upgrade() 成长（×1.2/波）。 */
    private static readonly baseHealth: number = 600;
    /** 护卫死亡反伤：每阶段提高 3%（阶段一 3% / 二 6% / 三 9%）。 */
    private static readonly guardReflectPerPhase: number = 0.03;

    public elapsed: number = 0;

    private readonly canvasWidth: number;
    private readonly canvasHeight: number;
    private readonly particles: ParticleSystem;
    private readonly audioSystem: AudioSystem;
    private readonly shake: (
        amplitude: number,
        duration: number,
        frequency?: number,
        decay?: number,
    ) => void;
    private readonly guards: Brown[] = [];
    private anchorX: number;
    private state: BossState;
    private phase: number = 1;
    private attackIndex: number = 0;
    private dyingChargesRemaining: number = 3;
    private debrisTimer: number = 0;

    public constructor(
        canvasWidth: number,
        canvasHeight: number,
        private readonly player: Player,
        private readonly spawnEntity: (entity: BaseEntity) => void,
        private readonly findEntities: () => readonly BaseEntity[],
        particles: ParticleSystem,
        audioSystem: AudioSystem,
        shake: (amplitude: number, duration: number, frequency?: number, decay?: number) => void,
    ) {
        super(
            crypto.randomUUID(),
            { x: canvasWidth / 2 - Boss.width / 2, y: -Boss.height - 24 },
            { width: Boss.width, height: Boss.height },
            { shape: "rectangle", color: "#8c3b2e" },
            Boss.baseHealth,
            26,
            BOSS_STATS_FORMATS,
            {},
        );

        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.particles = particles;
        this.audioSystem = audioSystem;
        this.shake = shake;
        this.anchorX = canvasWidth / 2;
        this.scoreValue = 5000;
        this.state = { kind: "entry" };
        // 入场压入期间无敌。
        this.invincible(2.4);
    }

    public override ai(delta: number): void {
        this.elapsed += delta;
        this.updateGuards();
        this.updatePhaseLogic(delta);

        switch (this.state.kind) {
            case "entry":
                this.position.y += 150 * delta;

                if (this.position.y >= Boss.hoverY) {
                    this.position.y = Boss.hoverY;
                    this.enterIdle(0.8);
                }
                break;
            case "reposition":
                this.position.y += 220 * delta;

                if (this.position.y >= Boss.hoverY) {
                    this.position.y = Boss.hoverY;
                    this.enterIdle(0.5);
                }
                break;
            case "shift":
                this.updateShift(delta);
                break;
            case "idle":
                this.applyDrift();
                this.updateIdle(delta);
                break;
            case "fan":
                this.applyDrift();
                this.updateFan(delta);
                break;
            case "summon":
                this.applyDrift();
                this.updateSummon(delta);
                break;
            case "chargeWarn":
                this.updateChargeWarn(delta);
                break;
            case "chargeDash":
                this.updateChargeDash(delta);
                break;
            case "spiral":
                this.applyDrift();
                this.updateSpiral(delta);
                break;
            case "laserWarn":
                this.applyDrift();
                this.updateLaserWarn(delta);
                break;
            case "converge":
                this.applyDrift();
                this.updateConverge(delta);
                break;
            case "dying":
                this.updateDying(delta);
                break;
        }
    }

    /** 波次系统对 Boss 不做逐波 upgrade，成长全部由 powerIndex 决定。 */
    public override upgrade(): void {
        // Boss 强度在构造时按出场次数一次性设定。
        this.maxHealth *= 1.2;
        this.health = this.maxHealth;
        this.scoreValue += 50;
    }

    public override getEntityType(): "enemy" {
        return "enemy";
    }

    public override takeDamage(
        damage: number,
        isCritical: boolean,
        bullet?: Bullet,
    ): DamageLabel | undefined {
        if (this.state.kind === "dying") {
            return undefined;
        }

        const damageLabel = super.takeDamage(damage, isCritical, bullet);

        // 血量归零时不立即消失：进入自毁爆炸序列，演出结束再销毁。
        if (damageLabel !== undefined && this.health === 0) {
            this.active = true;
            this.enterDying();
        }

        return damageLabel;
    }

    // ---------------------------------------------------------------- 通用

    private get centerX(): number {
        return this.position.x + this.size.width / 2;
    }

    private get centerY(): number {
        return this.position.y + this.size.height / 2;
    }

    private applyDrift(): void {
        const offset = Math.sin(this.elapsed * 0.85) * Boss.driftAmplitude;
        const x = this.anchorX + offset - Boss.width / 2;

        this.position.x = Math.max(6, Math.min(this.canvasWidth - Boss.width - 6, x));
    }

    private randomAnchorX(): number {
        const margin = Boss.width / 2 + 24;

        return margin + Math.random() * (this.canvasWidth - margin * 2);
    }

    private enterIdle(duration: number): void {
        this.state = { kind: "idle", remaining: duration };
    }

    private playAudio(source: string): void {
        void this.audioSystem.playAudio(source).catch(() => {
            // 浏览器可能在用户交互前禁止播放音频，静默忽略即可。
        });
    }

    // ---------------------------------------------------------- 阶段与循环

    private updatePhaseLogic(delta: number): void {
        if (this.state.kind === "dying" || this.state.kind === "shift") {
            return;
        }

        const fraction = this.health / this.maxHealth;
        const targetPhase = fraction > 2 / 3 ? 1 : fraction > 1 / 3 ? 2 : 3;

        if (targetPhase > this.phase && this.state.kind !== "entry") {
            this.beginShift(targetPhase);
            return;
        }

        // 濒死冲锋（HP < 10%）：优先于常规循环执行连续冲撞。
        if (
            this.phase === 3 &&
            fraction < 0.1 &&
            this.dyingChargesRemaining > 0 &&
            this.state.kind === "idle"
        ) {
            this.dyingChargesRemaining -= 1;
            this.state = { kind: "chargeWarn", remaining: 0.45 };
            return;
        }

        // 濒死阶段周期掉落可格挡燃烧残骸。
        if (this.phase === 3 && fraction < 0.1) {
            this.debrisTimer -= delta;

            if (this.debrisTimer <= 0) {
                this.debrisTimer = 0.9;
                this.fireDebris();
            }
        }
    }

    private beginShift(targetPhase: number): void {
        this.phase = targetPhase;
        this.attackIndex = 0;
        this.dyingChargesRemaining = 3;
        this.debrisTimer = 0;
        this.clearEnemyBullets();
        this.invincible(1.2);
        this.opacity = 1;
        this.shake(12, 0.5, 20, 2);
        emitRing(this.particles, {
            x: this.centerX,
            y: this.centerY,
            count: 48,
            color: "#ff7a3c",
            speed: 360,
            lifetime: 0.6,
            size: 6,
            endSize: 0,
            drag: 1.4,
        });
        this.state = {
            kind: "shift",
            remaining: 1,
            duration: 1,
            fromX: this.position.x,
            fromY: this.position.y,
            toX: this.randomAnchorX(),
        };
    }

    private updateShift(delta: number): void {
        const state = this.state;

        if (state.kind !== "shift") {
            return;
        }

        state.remaining = Math.max(0, state.remaining - delta);
        const t = 1 - state.remaining / state.duration;

        this.position.x = state.fromX + (state.toX - Boss.width / 2 - state.fromX) * t;
        this.position.y = state.fromY + (Boss.hoverY - state.fromY) * t;

        if (state.remaining === 0) {
            this.anchorX = state.toX;
            this.enterIdle(0.8);
        }
    }

    private updateIdle(delta: number): void {
        const state = this.state;

        if (state.kind !== "idle") {
            return;
        }

        state.remaining -= delta;

        if (state.remaining <= 0) {
            this.enterNextAttack();
        }
    }

    private phaseAttacks(): readonly BossAttackKind[] {
        switch (this.phase) {
            case 1:
                return ["fan", "summon", "charge"];
            case 2:
                return ["spiral", "missiles", "laser", "summon"];
            default:
                return ["petal", "converge", "charge", "missiles"];
        }
    }

    private enterNextAttack(): void {
        const queue = this.phaseAttacks();
        const kind = queue[this.attackIndex % queue.length];

        this.attackIndex += 1;

        switch (kind) {
            case "fan":
                this.state = { kind: "fan", volleys: 3, cooldown: 0.25 };
                break;
            case "summon":
                this.state = {
                    kind: "summon",
                    remaining: this.phase === 1 ? 2 : 3,
                    cooldown: 0.3,
                };
                break;
            case "charge":
                this.state = { kind: "chargeWarn", remaining: 0.8 };
                break;
            case "spiral":
                this.state = {
                    kind: "spiral",
                    remaining: 3,
                    cooldown: 0,
                    angle: Math.random() * Math.PI * 2,
                };
                break;
            case "missiles":
                this.fireMissiles();
                this.enterIdle(1);
                break;
            case "laser": {
                const beamX = this.player.position.x + this.player.size.width / 2 - 13;

                this.spawnEntity(new WarningBeam(beamX, 26, this.canvasHeight, 1));
                this.state = { kind: "laserWarn", remaining: 1, beamX };
                break;
            }
            case "petal":
                this.firePetal();
                this.enterIdle(1.1);
                break;
            case "converge":
                this.state = { kind: "converge", waves: 2, cooldown: 0.25 };
                break;
        }
    }

    // -------------------------------------------------------------- 攻击

    private fireBulletFrom(
        x: number,
        y: number,
        rotation: number,
        speed: number,
        options?: { size?: number; color?: string; damage?: number },
    ): void {
        const size = options?.size ?? 14;
        const bullet = new DangerBullet({
            launcher: this,
            x: x - size / 2,
            y: y - size / 2,
            rotation,
            speed,
            damage: options?.damage ?? 6,
        });

        bullet.size = { width: size, height: size };
        bullet.collisionBounds.size = { ...bullet.size };
        bullet.appearance = {
            shape: "ellipse",
            color: options?.color ?? "#ff8c3a",
        };
        this.spawnEntity(bullet);
    }

    private updateFan(delta: number): void {
        const state = this.state;

        if (state.kind !== "fan") {
            return;
        }

        state.cooldown -= delta;

        while (state.cooldown <= 0 && state.volleys > 0) {
            this.fireFan();
            state.volleys -= 1;
            state.cooldown += 1.2;
        }

        if (state.volleys === 0) {
            this.enterIdle(0.9);
        }
    }

    private fireFan(): void {
        if (!this.player.active) {
            return;
        }

        const originX = this.centerX;
        const originY = this.position.y + this.size.height;
        const baseRotation = Math.atan2(
            this.player.position.y + this.player.size.height / 2 - originY,
            this.player.position.x + this.player.size.width / 2 - originX,
        );

        for (let index = 0; index < 7; index += 1) {
            this.fireBulletFrom(originX, originY, baseRotation + (index - 3) * 0.11, 240);
        }
    }

    private updateSummon(delta: number): void {
        const state = this.state;

        if (state.kind !== "summon") {
            return;
        }

        const cap = this.phase === 1 ? 2 : 3;

        state.cooldown -= delta;

        while (state.cooldown <= 0 && state.remaining > 0) {
            state.remaining -= 1;
            state.cooldown += 0.55;

            if (this.guards.length >= cap) {
                state.remaining = 0;
                break;
            }

            const side = this.guards.length % 2 === 0 ? -1 : 1;
            const x = Math.max(
                4,
                Math.min(this.canvasWidth - 46, this.centerX + side * (this.size.width / 2 + 20)),
            );
            const guard = new Brown(x, this.canvasHeight, this.player, this.spawnEntity);

            this.guards.push(guard);
            this.spawnEntity(guard);
        }

        if (state.remaining === 0) {
            this.enterIdle(0.9);
        }
    }

    /** 护卫被击杀时 Boss 受 3% 最大生命连带伤害（不致死）。 */
    private updateGuards(): void {
        for (let index = this.guards.length - 1; index >= 0; index -= 1) {
            const guard = this.guards[index];

            if (guard === undefined || guard.active) {
                continue;
            }

            this.guards.splice(index, 1);

            if (this.state.kind !== "dying") {
                this.health = Math.max(
                    1,
                    this.health - this.maxHealth * Boss.guardReflectPerPhase * this.phase,
                );
                emitBurst(this.particles, {
                    x: this.centerX,
                    y: this.centerY,
                    count: 16,
                    color: "#ff5a3c",
                    speedMin: 60,
                    speedMax: 180,
                    lifetimeMin: 0.2,
                    lifetimeMax: 0.5,
                    sizeMin: 3,
                    sizeMax: 6,
                    drag: 1.8,
                });
            }
        }
    }

    private updateChargeWarn(delta: number): void {
        const state = this.state;

        if (state.kind !== "chargeWarn") {
            return;
        }

        state.remaining -= delta;
        this.opacity = 0.55 + 0.45 * Math.abs(Math.sin(this.elapsed * 16));

        if (state.remaining > 0) {
            return;
        }

        this.opacity = 1;
        const direction =
            this.player.position.x + this.player.size.width / 2 > this.centerX ? 1 : -1;

        this.state = { kind: "chargeDash", direction };
        this.playAudio(GAME_AUDIO_SOURCES.dash);
        this.shake(6, 0.3, 24, 2.4);
    }

    private updateChargeDash(delta: number): void {
        const state = this.state;

        if (state.kind !== "chargeDash") {
            return;
        }

        this.position.x += state.direction * Boss.chargeSpeed * delta;

        // 冲撞路径留火焰带（视觉演出）。
        for (let index = 0; index < 3; index += 1) {
            this.particles.emit({
                x: this.centerX + (Math.random() - 0.5) * this.size.width,
                y: this.position.y + Math.random() * this.size.height,
                velocityY: 60 + Math.random() * 80,
                drag: 2.4,
                size: 5 + Math.random() * 4,
                endSize: 0,
                lifetime: 0.5 + Math.random() * 0.6,
                color: Math.random() < 0.5 ? "#ff8c3a" : "#ffd84d",
            });
        }

        if (this.position.x > this.canvasWidth + 30 || this.position.x < -Boss.width - 30) {
            this.anchorX = this.randomAnchorX();
            this.position.x = this.anchorX - Boss.width / 2;
            this.position.y = -Boss.height - 30;
            this.invincible(0.8);
            this.state = { kind: "reposition" };
        }
    }

    private updateSpiral(delta: number): void {
        const state = this.state;

        if (state.kind !== "spiral") {
            return;
        }

        state.remaining -= delta;
        state.cooldown -= delta;

        const originX = this.centerX;
        const originY = this.centerY;

        while (state.cooldown <= 0) {
            this.fireBulletFrom(originX, originY, state.angle, 180, {
                size: 12,
                color: "#ffb03a",
                damage: 5,
            });
            this.fireBulletFrom(originX, originY, state.angle + Math.PI, 180, {
                size: 12,
                color: "#ffb03a",
                damage: 5,
            });
            state.angle += 0.45;
            state.cooldown += 0.085;
        }

        if (state.remaining <= 0) {
            this.enterIdle(1);
        }
    }

    private updateLaserWarn(delta: number): void {
        const state = this.state;

        if (state.kind !== "laserWarn") {
            return;
        }

        state.remaining -= delta;

        if (state.remaining > 0) {
            return;
        }

        this.spawnEntity(new HulkLaser(this, state.beamX, 26, this.canvasHeight, 22));
        this.playAudio(GAME_AUDIO_SOURCES.laserShot);
        this.shake(8, 0.4, 26, 2.2);
        this.enterIdle(1);
    }

    private updateConverge(delta: number): void {
        const state = this.state;

        if (state.kind !== "converge") {
            return;
        }

        state.cooldown -= delta;

        while (state.cooldown <= 0 && state.waves > 0) {
            state.waves -= 1;
            state.cooldown += 1.2;
            this.fireConvergeWave();
        }

        if (state.waves === 0) {
            this.enterIdle(0.9);
        }
    }

    /** 全屏收束波：从屏幕四角向 Boss 收束的弹流（呼应玩家擦弹收束特效）。 */
    private fireConvergeWave(): void {
        const targetX = this.centerX;
        const targetY = this.centerY;
        const corners: readonly [number, number][] = [
            [-30, -30],
            [this.canvasWidth + 30, -30],
            [-30, this.canvasHeight + 30],
            [this.canvasWidth + 30, this.canvasHeight + 30],
        ];

        for (const [cornerX, cornerY] of corners) {
            const baseRotation = Math.atan2(targetY - cornerY, targetX - cornerX);

            for (let index = 0; index < 8; index += 1) {
                this.fireBulletFrom(cornerX, cornerY, baseRotation + (index - 3.5) * 0.06, 210, {
                    size: 12,
                    color: "#ff6a4a",
                    damage: 5,
                });
            }
        }
    }

    private firePetal(): void {
        const count = 26;
        const step = (Math.PI * 2) / count;
        const playerDirection = this.player.active
            ? Math.atan2(
                  this.player.position.y + this.player.size.height / 2 - this.centerY,
                  this.player.position.x + this.player.size.width / 2 - this.centerX,
              )
            : Math.PI / 2;

        for (let index = 0; index < count; index += 1) {
            const angle = index * step;
            let diff = angle - playerDirection;

            while (diff > Math.PI) {
                diff -= Math.PI * 2;
            }

            while (diff < -Math.PI) {
                diff += Math.PI * 2;
            }

            // 在玩家方向留出走位缝隙。
            if (Math.abs(diff) < step * 1.5) {
                continue;
            }

            this.fireBulletFrom(this.centerX, this.centerY, angle, 155 + (index % 3) * 14, {
                size: 13,
                color: "#ff7a3c",
                damage: 5,
            });
        }
    }

    private fireMissiles(): void {
        if (!this.player.active) {
            return;
        }

        const originX = this.centerX;
        const originY = this.position.y + this.size.height;
        const baseRotation = Math.atan2(
            this.player.position.y - originY,
            this.player.position.x - originX,
        );

        for (let index = 0; index < 3; index += 1) {
            this.spawnEntity(
                new MissileBullet({
                    launcher: this,
                    x: originX - 11 + (index - 1) * 46,
                    y: originY,
                    rotation: baseRotation + (index - 1) * 0.35,
                    speed: Math.max(200, this.player.speed),
                    findTarget: () => [this.player],
                }),
            );
        }
    }

    private fireDebris(): void {
        for (let index = 0; index < 2; index += 1) {
            this.fireBulletFrom(
                20 + Math.random() * (this.canvasWidth - 40),
                -20,
                Math.PI / 2,
                185,
                { size: 13, color: "#ff5a2a", damage: 5 },
            );
        }
    }

    private clearEnemyBullets(): void {
        for (const entity of this.findEntities()) {
            if (entity instanceof Bullet && entity.faction === "enemy" && entity.active) {
                entity.active = false;
            }
        }
    }

    // -------------------------------------------------------------- 死亡

    private enterDying(): void {
        this.state = { kind: "dying", remaining: 2.4, explosionTimer: 0 };
        this.clearEnemyBullets();

        for (const guard of this.guards) {
            guard.active = false;
            emitBurst(this.particles, {
                x: guard.position.x + guard.size.width / 2,
                y: guard.position.y + guard.size.height / 2,
                count: 18,
                color: "#b5651d",
                speedMin: 60,
                speedMax: 200,
                lifetimeMin: 0.2,
                lifetimeMax: 0.55,
                sizeMin: 3,
                sizeMax: 6,
                drag: 1.8,
            });
        }

        this.guards.length = 0;
        this.invincible(99);
        this.opacity = 1;
    }

    private updateDying(delta: number): void {
        const state = this.state;

        if (state.kind !== "dying") {
            return;
        }

        state.remaining -= delta;
        state.explosionTimer -= delta;

        if (state.explosionTimer <= 0) {
            state.explosionTimer = 0.28;
            emitBurst(this.particles, {
                x: this.position.x + Math.random() * this.size.width,
                y: this.position.y + Math.random() * this.size.height,
                count: 26,
                color: Math.random() < 0.5 ? "#ff8c3a" : "#ffd84d",
                speedMin: 70,
                speedMax: 240,
                lifetimeMin: 0.2,
                lifetimeMax: 0.7,
                sizeMin: 3,
                sizeMax: 8,
                accelerationY: 30,
                drag: 1.8,
            });
            this.shake(9, 0.28, 22, 2.4);
            this.playAudio(GAME_AUDIO_SOURCES.cannon);
        }

        if (state.remaining > 0) {
            return;
        }

        // 终爆：大范围爆发 + 冲击环，随后销毁。
        emitBurst(this.particles, {
            x: this.centerX,
            y: this.centerY,
            count: 150,
            color: "#ffb13b",
            speedMin: 90,
            speedMax: 420,
            lifetimeMin: 0.3,
            lifetimeMax: 1.1,
            sizeMin: 3,
            sizeMax: 10,
            accelerationY: 40,
            drag: 1.4,
        });
        emitRing(this.particles, {
            x: this.centerX,
            y: this.centerY,
            count: 72,
            color: "#fff0d6",
            speed: 460,
            lifetime: 0.9,
            size: 9,
            endSize: 0,
            drag: 0.9,
        });
        this.playAudio(GAME_AUDIO_SOURCES.die);
        this.shake(26, 0.9, 18, 1.6);
        this.active = false;
    }
}

/** Boss 专用大血条：固定在屏幕顶部，带阶段分割线（66% / 33%）。 */
export class BossHealthbar extends Healthbar {
    public constructor(boss: Boss, screenWidth: number) {
        super(boss, Math.max(120, screenWidth - 40), 14);

        this.zIndex = 30;
        this.backgroundColor = "#1c0d0d";
        this.middleColor = "#f0b429";
        this.foregroundColor = "#ff5a3c";
        this.dividers = [1 / 3, 2 / 3];
    }

    public override ai(delta: number): void {
        super.ai(delta);
        this.position.x = 20;
        this.position.y = 10;
    }
}
