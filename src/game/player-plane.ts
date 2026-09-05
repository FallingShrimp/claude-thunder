import type { AudioSystem } from "../audio/audio-system";
import type { BaseEntity } from "../core/entity";
import type { Vector2 } from "../core/geometry";
import { DataFormat, defineStats } from "../core/stats";
import { Afterimage } from "../entities/afterimage";
import type { Bullet } from "../entities/bullet";
import type { DamageLabel } from "../entities/damage-label";
import { Enemy } from "../entities/enemy";
import type { Plane } from "../entities/plane";
import { Player } from "../entities/player";
import { radians } from "../util/math";
import { randomFloat, rate } from "../util/random";
import { GAME_AUDIO_SOURCES } from "./audio-assets";
import { BallThunderBullet } from "./bullets/ball-thunder-bullet";
import { BasicBullet } from "./bullets/basic-bullet";
import { FireballBullet } from "./bullets/fireball-bullet";
import { LaserBullet } from "./bullets/laser-bullet";
import { ThunderBullet } from "./bullets/thunder-bullet";
import type { KeyboardInput } from "./keyboard-input";
import type { TouchInput } from "./touch-input";

export type PlayerStats = {
    ATK: number;
    ATK_SPD: number;
    CRIT_RATE: number;
    CRIT_DMG: number;
    COUNTER_MULTIPLIER: number;
    COUNTER_COUNT: number;
    COUNTER_REFRACTION: number;
    COUNTER_TRACE: number;
    THUNDER_SPLIT_COUNT: number;
    THUNDER_CHAIN_COUNT: number;
    THUNDER_MULTIPLIER: number;
    THUNDER_RANGE: number;
    THUNDER_BALL_TRACE: number;
    MULTIPLE_SHOOT: number;
    SHOOT_OFFSET: number;
    LUCK: number;
    SUMMON_GUNNER_COUNT: number;
    SUMMON_CANNON_COUNT: number;
    SUMMON_ASSAULT_COUNT: number;
    SUMMON_DAMAGE: number;
    SUMMON_HEALTH: number;
    SUMMON_REGEN: number;
    SUMMON_ORBIT_SPEED: number;
    SUMMON_RANGE: number;
    SUMMON_GUNNER_RATE: number;
    SUMMON_GUNNER_MULTISHOT: number;
    SUMMON_CANNON_DAMAGE: number;
    SUMMON_CANNON_MULTISHOT: number;
    SUMMON_ASSAULT_DAMAGE: number;
    SUMMON_ASSAULT_SPEED: number;
    SUMMON_OVERLOAD: number;
    SUMMON_SACRIFICE: number;
    LASER_COUNT: number;
    LASER_REFRACTION_TARGETS: number;
    LASER_REFRACTION_COUNT: number;
    LASER_REFRACTION_DECAY: number;
    LASER_AIM_ANGLE: number;
    LASER_DAMAGE: number;
    DODGE_CHARGE: number;
};

export const PLAYER_STATS_FORMATS = defineStats<PlayerStats>({
    ATK: DataFormat.VALUE,
    ATK_SPD: DataFormat.FREQUENCY,
    CRIT_RATE: DataFormat.PERCENT,
    CRIT_DMG: DataFormat.PERCENT,
    COUNTER_MULTIPLIER: DataFormat.PERCENT,
    COUNTER_COUNT: DataFormat.VALUE,
    COUNTER_REFRACTION: DataFormat.VALUE,
    COUNTER_TRACE: DataFormat.ANGLE,
    THUNDER_SPLIT_COUNT: DataFormat.VALUE,
    THUNDER_CHAIN_COUNT: DataFormat.VALUE,
    THUNDER_MULTIPLIER: DataFormat.PERCENT,
    THUNDER_RANGE: DataFormat.VALUE,
    THUNDER_BALL_TRACE: DataFormat.ANGLE,
    MULTIPLE_SHOOT: DataFormat.VALUE,
    SHOOT_OFFSET: DataFormat.ANGLE,
    LUCK: DataFormat.VALUE,
    SUMMON_GUNNER_COUNT: DataFormat.VALUE,
    SUMMON_CANNON_COUNT: DataFormat.VALUE,
    SUMMON_ASSAULT_COUNT: DataFormat.VALUE,
    SUMMON_DAMAGE: DataFormat.PERCENT,
    SUMMON_HEALTH: DataFormat.VALUE,
    SUMMON_REGEN: DataFormat.VALUE,
    SUMMON_ORBIT_SPEED: DataFormat.PERCENT,
    SUMMON_RANGE: DataFormat.PERCENT,
    SUMMON_GUNNER_RATE: DataFormat.PERCENT,
    SUMMON_GUNNER_MULTISHOT: DataFormat.VALUE,
    SUMMON_CANNON_DAMAGE: DataFormat.VALUE,
    SUMMON_CANNON_MULTISHOT: DataFormat.VALUE,
    SUMMON_ASSAULT_DAMAGE: DataFormat.VALUE,
    SUMMON_ASSAULT_SPEED: DataFormat.PERCENT,
    SUMMON_OVERLOAD: DataFormat.PERCENT,
    SUMMON_SACRIFICE: DataFormat.VALUE,
    LASER_COUNT: DataFormat.VALUE,
    LASER_REFRACTION_TARGETS: DataFormat.VALUE,
    LASER_REFRACTION_COUNT: DataFormat.VALUE,
    LASER_REFRACTION_DECAY: DataFormat.PERCENT,
    LASER_AIM_ANGLE: DataFormat.ANGLE,
    LASER_DAMAGE: DataFormat.PERCENT,
    DODGE_CHARGE: DataFormat.PERCENT,
});

export type ParryResult = "none" | "guard" | "perfect";

export class PlayerPlane extends Player<PlayerStats> {
    public static readonly guardDuration: number = 2;
    public static readonly perfectParryDuration: number = 1;
    public static readonly guardCooldownBase: number = 1;
    public static readonly guardCooldownPenalty: number = 1.5;
    public static readonly damageInvincibilityDuration: number = 1;
    public static readonly perfectParryInvincibilityDuration: number = 2;
    public static readonly guardInvincibilityDuration: number = 0.5;
    public static readonly dodgeDuration: number = 0.18;
    public static readonly dodgeSpeed: number = 960;
    public static readonly dodgeCooldown: number = 0.8;
    public static readonly dodgeAfterimageInterval: number = 0.03;
    public static readonly dodgeAfterimageLifetime: number = 0.28;
    /** 三角形机头在局部 +X 方向，旋转 -90° 后朝上。 */
    private static readonly baseRotation: number = -Math.PI / 2;

    public guardElapsed: number = 0;
    public guardCooldown: number = 0;
    public guarding: boolean = false;

    private controlsEnabled: boolean = true;
    private previousGuardKey: boolean = false;
    private touchActivated: boolean = false;
    private dodging: boolean = false;
    private dodgeElapsed: number = 0;
    private dodgeCooldown: number = 0;
    private dodgeDirection: Vector2 = { x: 0, y: 1 };
    private dodgeAfterimageTimer: number = 0;
    private previousDodgeKey: boolean = false;

    public constructor(
        private readonly input: KeyboardInput,
        private readonly audioSystem: AudioSystem,
        private readonly spawnEntity: (entity: BaseEntity) => void,
        private readonly touch?: TouchInput,
        /** 调试/瞄准用：获取场上最近敌人的回调（供激光角度修正）。 */
        private readonly findTarget?: () => Plane | undefined,
    ) {
        super(
            "player",
            {
                x: (touch?.canvas.width ?? 480) / 2 - 24,
                y: (touch?.canvas.height ?? 720) - 80,
            },
            { width: 48, height: 56 },
            { shape: "triangle", color: "#4da6ff" },
            100,
            10,
            PLAYER_STATS_FORMATS,
            {
                ATK: 10,
                ATK_SPD: 3,
                CRIT_RATE: 0.05,
                CRIT_DMG: 2,
                COUNTER_MULTIPLIER: 2,
                COUNTER_COUNT: 3,
                COUNTER_REFRACTION: 0,
                COUNTER_TRACE: 0,
                THUNDER_SPLIT_COUNT: 0,
                THUNDER_CHAIN_COUNT: 0,
                THUNDER_MULTIPLIER: 1,
                THUNDER_RANGE: 320,
                THUNDER_BALL_TRACE: 0,
                MULTIPLE_SHOOT: 0,
                SHOOT_OFFSET: 3,
                LUCK: 0,
                SUMMON_GUNNER_COUNT: 0,
                SUMMON_CANNON_COUNT: 0,
                SUMMON_ASSAULT_COUNT: 0,
                SUMMON_DAMAGE: 1,
                SUMMON_HEALTH: 0,
                SUMMON_REGEN: 0,
                SUMMON_ORBIT_SPEED: 1,
                SUMMON_RANGE: 1,
                SUMMON_GUNNER_RATE: 0,
                SUMMON_GUNNER_MULTISHOT: 0,
                SUMMON_CANNON_DAMAGE: 0,
                SUMMON_CANNON_MULTISHOT: 0,
                SUMMON_ASSAULT_DAMAGE: 0,
                SUMMON_ASSAULT_SPEED: 0,
                SUMMON_OVERLOAD: 0,
                SUMMON_SACRIFICE: 0,
                LASER_COUNT: 0,
                LASER_REFRACTION_TARGETS: 0,
                LASER_REFRACTION_COUNT: 0,
                LASER_REFRACTION_DECAY: 0.75,
                LASER_AIM_ANGLE: 0,
                LASER_DAMAGE: 5,
                DODGE_CHARGE: 1,
            },
        );

        this.speed = 360;
        this.lives = 3;
        this.fireCooldown = 0;
        this.rotation = PlayerPlane.baseRotation;
    }

    public override ai(delta: number): void {
        this.fireCooldown = Math.max(0, this.fireCooldown - delta);
        this.guardCooldown = Math.max(0, this.guardCooldown - delta);
        this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);

        if (!this.controlsEnabled) {
            this.velocity = { x: 0, y: 0 };
            this.dodging = false;
            this.endGuard(PlayerPlane.guardCooldownBase);
            this.previousGuardKey = this.input.isPressed("KeyK");
            this.previousDodgeKey = this.input.isPressed("Space");
            return;
        }

        const dodgeKey = this.input.isPressed("Space");
        const dodgePressed = dodgeKey && !this.previousDodgeKey;
        this.previousDodgeKey = dodgeKey;

        // 键盘操控优先：只要有任何方向/攻击/格挡键活跃，就用键盘分支，
        // 从而保证桌面端不受触摸输入影响（TouchInput 始终存在）。
        const keyboardActive = this.input.isPressed("KeyW")
            || this.input.isPressed("KeyA")
            || this.input.isPressed("KeyS")
            || this.input.isPressed("KeyD")
            || this.input.isPressed("KeyJ")
            || this.input.isPressed("KeyK");

        if (this.touch !== undefined && !keyboardActive) {
            this.updateTouchControl(delta, dodgePressed);
            return;
        }

        const horizontal = Number(this.input.isPressed("KeyD"))
            - Number(this.input.isPressed("KeyA"));
        const vertical = Number(this.input.isPressed("KeyS"))
            - Number(this.input.isPressed("KeyW"));

        // 移动中按空格：朝当前移动方向闪避。
        if (dodgePressed && (horizontal !== 0 || vertical !== 0)) {
            this.startDodge(horizontal, vertical);
        }

        if (this.dodging) {
            this.updateDodge(delta);

            if (this.input.isPressed("KeyJ")) {
                this.attack();
            }

            this.updateGuard(delta);
            return;
        }

        this.restorePose(delta);

        this.velocity.x = horizontal * this.speed;
        this.velocity.y = vertical * this.speed;
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.clampToCanvas();

        if (this.input.isPressed("KeyJ")) {
            this.attack();
        }

        this.updateGuard(delta);
    }

    /** 将玩家限制在画布范围内，避免移动到屏幕外。 */
    private clampToCanvas(): void {
        const canvasWidth = this.touch?.canvas.width
            ?? document.querySelector<HTMLCanvasElement>("#game-canvas")?.width
            ?? 480;
        const canvasHeight = this.touch?.canvas.height
            ?? document.querySelector<HTMLCanvasElement>("#game-canvas")?.height
            ?? 720;

        this.position.x = Math.max(
            0,
            Math.min(canvasWidth - this.size.width, this.position.x),
        );
        this.position.y = Math.max(
            0,
            Math.min(canvasHeight - this.size.height, this.position.y),
        );
    }

    /**
     * 移动端触控：按住屏幕时飞机平滑移向手指位置并持续攻击；
     * 松开屏幕时保持格挡。首次触碰后才进入「松开即格挡」状态。
     * 按住且正在移动时触发闪避，冲刺方向为手指相对飞机的方向。
     */
    private updateTouchControl(delta: number, dodgePressed: boolean): void {
        const touch = this.touch as TouchInput;

        if (touch.isDown) {
            this.touchActivated = true;
            const centerX = this.position.x + this.size.width / 2;
            const centerY = this.position.y + this.size.height / 2;
            const dx = touch.targetX - centerX;
            const dy = touch.targetY - centerY;
            const distance = Math.hypot(dx, dy);

            if (distance > 1 && dodgePressed) {
                this.startDodge(dx, dy);
            }

            if (this.dodging) {
                this.updateDodge(delta);
                this.attack();
                return;
            }

            if (distance > 1) {
                const step = Math.min(distance, this.speed * delta);
                this.position.x += (dx / distance) * step;
                this.position.y += (dy / distance) * step;
                this.clampToCanvas();
            }

            if (this.guarding) {
                this.endGuard(0);
            }

            this.attack();
            return;
        }

        if (!this.touchActivated) {
            return;
        }

        // 松开屏幕：保持格挡。
        if (!this.guarding) {
            this.guarding = true;
            this.guardElapsed = 0;
        } else {
            this.guardElapsed += delta;

            if (this.guardElapsed >= PlayerPlane.guardDuration) {
                this.endGuard(PlayerPlane.guardCooldownBase);
            }
        }
    }

    /** 触发闪避：朝给定方向冲刺，冲刺期间无敌。 */
    private startDodge(directionX: number, directionY: number): void {
        if (this.dodging || this.dodgeCooldown > 0) {
            return;
        }

        const length = Math.hypot(directionX, directionY);

        if (length === 0) {
            return;
        }

        this.dodging = true;
        this.dodgeElapsed = 0;
        this.dodgeAfterimageTimer = 0;
        this.dodgeDirection = { x: directionX / length, y: directionY / length };
        this.invincible(PlayerPlane.dodgeDuration);
        this.playSound(GAME_AUDIO_SOURCES.dash);
        this.fireDodgeLasers();
    }

    /** 冲刺时沿机头方向发射激光（需持有冲刺激光道具）。 */
    private fireDodgeLasers(): void {
        const laserCount = Math.max(
            0,
            Math.floor(this.readStat("LASER_COUNT")),
        );

        if (laserCount === 0) {
            return;
        }

        const baseRotation = Math.atan2(
            this.dodgeDirection.y,
            this.dodgeDirection.x,
        );
        // 激光角度修正：冲刺方向不变，发射角度朝最近敌人偏转，
        // 最大偏转角由 LASER_AIM_ANGLE 限制（度）。
        const maxCorrection = radians(
            Math.max(0, this.readStat("LASER_AIM_ANGLE")),
        );
        const target = maxCorrection > 0 ? this.findTarget?.() : undefined;
        let aimRotation = baseRotation;

        if (target !== undefined) {
            const targetAngle = Math.atan2(
                target.position.y + target.size.height / 2 - (this.position.y
                    + this.size.height / 2),
                target.position.x + target.size.width / 2 - (this.position.x
                    + this.size.width / 2),
            );
            let diff = targetAngle - baseRotation;

            if (diff > Math.PI) {
                diff -= Math.PI * 2;
            } else if (diff < -Math.PI) {
                diff += Math.PI * 2;
            }

            const clamped = Math.max(
                -maxCorrection,
                Math.min(maxCorrection, diff),
            );

            aimRotation = baseRotation + clamped;
        }

        const originX = this.position.x + this.size.width / 2;
        const originY = this.position.y + this.size.height / 2;
        const spread = LaserBullet.spreadAngle;

        for (let index = 0; index < laserCount; index++) {
            const offset = laserCount === 1
                ? 0
                : (index - (laserCount - 1) / 2) * spread;

            this.spawnEntity(new LaserBullet({
                launcher: this,
                originX,
                originY,
                rotation: aimRotation + offset,
                damage: this.readStat("ATK")
                    * this.readStat("LASER_DAMAGE"),
                faction: "player",
                remainingRefractions: 1 + Math.max(
                    0,
                    Math.floor(this.readStat("LASER_REFRACTION_COUNT")),
                ),
            }));
        }

        this.playSound(GAME_AUDIO_SOURCES.laserShot);
    }

    /** 冲刺位移 + 冲刺拉伸形变 + 残影拖尾。 */
    private updateDodge(delta: number): void {
        this.dodgeElapsed += delta;
        this.position.x += this.dodgeDirection.x * PlayerPlane.dodgeSpeed * delta;
        this.position.y += this.dodgeDirection.y * PlayerPlane.dodgeSpeed * delta;
        this.clampToCanvas();

        // 冲刺姿态：机头转向冲刺方向，沿机身轴拉长、横向压扁。
        this.rotation = Math.atan2(this.dodgeDirection.y, this.dodgeDirection.x);
        this.scale = { x: 1.35, y: 0.8 };

        this.dodgeAfterimageTimer -= delta;

        if (this.dodgeAfterimageTimer <= 0) {
            this.dodgeAfterimageTimer = PlayerPlane.dodgeAfterimageInterval;
            this.spawnEntity(new Afterimage(
                { ...this.position },
                { ...this.size },
                { shape: "rectangle", color: "#8fd8ff" },
                this.rotation,
                this.scale,
                PlayerPlane.dodgeAfterimageLifetime,
            ));
        }

        if (this.dodgeElapsed >= PlayerPlane.dodgeDuration) {
            this.dodging = false;
            // 实际冷却 = 基值 / 闪避充能，充能越高闪避越频繁。
            const charge = Math.max(
                0.1,
                this.readStat("DODGE_CHARGE"),
            );
            this.dodgeCooldown = PlayerPlane.dodgeCooldown / charge;
        }
    }

    /** 非冲刺时将冲刺姿态（机头朝向与形变）平滑恢复为默认状态。 */
    private restorePose(delta: number): void {
        const t = Math.min(1, delta * 12);
        this.scale.x += (1 - this.scale.x) * t;
        this.scale.y += (1 - this.scale.y) * t;

        // 按最短弧插值回默认朝向，避免 180° 附近绕远路。
        let rotationDiff = PlayerPlane.baseRotation - this.rotation;

        if (rotationDiff > Math.PI) {
            rotationDiff -= Math.PI * 2;
        } else if (rotationDiff < -Math.PI) {
            rotationDiff += Math.PI * 2;
        }

        this.rotation += rotationDiff * t;
    }

    public override upgrade(): void {
        // 玩家通过道具升级，波次系统只升级敌机。
    }

    public override takeDamage(
        damage: number,
        isCritical: boolean,
        bullet?: Bullet,
    ): DamageLabel | undefined {
        const damageLabel = super.takeDamage(damage, isCritical, bullet);

        if (damageLabel !== undefined) {
            this.invincible(PlayerPlane.damageInvincibilityDuration);
        }

        return damageLabel;
    }

    public takeGuardDamage(
        damage: number,
        isCritical: boolean,
        bullet?: Bullet,
    ): DamageLabel | undefined {
        const damageLabel = super.takeDamage(damage, isCritical, bullet);
        this.invincible(PlayerPlane.guardInvincibilityDuration);
        return damageLabel;
    }

    public counterAttack(
        target: BaseEntity,
        findTraceTarget?: (source: FireballBullet) => Enemy | undefined,
    ): void {
        const centerX = this.position.x + this.size.width / 2;
        const centerY = this.position.y + this.size.height / 2;
        const targetCenterX = target.position.x + target.size.width / 2;
        const targetCenterY = target.position.y + target.size.height / 2;

        this.counterAttackAtAngle(
            Math.atan2(targetCenterY - centerY, targetCenterX - centerX),
            target instanceof Enemy ? target : undefined,
            findTraceTarget,
        );
    }

    public counterAttackAtAngle(
        rotation: number,
        traceTarget?: Enemy,
        findTraceTarget?: (source: FireballBullet) => Enemy | undefined,
    ): void {
        const bulletWidth = 40;
        const bulletHeight = 32;
        const centerX = this.position.x + this.size.width / 2;
        const centerY = this.position.y + this.size.height / 2;

        this.spawnEntity(new FireballBullet({
            launcher: this,
            x: centerX - bulletWidth / 2,
            y: centerY - bulletHeight / 2,
            rotation,
            damage: this.readStat("ATK")
                * (1 + this.readStat("COUNTER_MULTIPLIER")),
            faction: "player",
            traceAngle: this.readStat("COUNTER_TRACE"),
            traceTarget,
            findTraceTarget,
            remainingRefractions: Math.max(
                0,
                Math.floor(this.readStat("COUNTER_REFRACTION")),
            ),
        }));
    }

    public emitThunder(
        originX: number,
        originY: number,
        rotation: number,
        length: number = ThunderBullet.splitLength,
        remainingChains: number = Math.max(
            0,
            Math.floor(this.readStat("THUNDER_CHAIN_COUNT")),
        ),
        chainTargetIds?: ReadonlySet<string>,
    ): ThunderBullet {
        const thunder = new ThunderBullet({
            launcher: this,
            originX,
            originY,
            rotation,
            length,
            damage: this.readStat("ATK")
                * this.readStat("THUNDER_MULTIPLIER"),
            faction: "player",
            remainingChains,
            chainTargetIds,
        });

        this.spawnEntity(thunder);
        return thunder;
    }

    public emitBallThunder(
        centerX: number,
        centerY: number,
        rotation: number,
        chainTargetIds?: ReadonlySet<string>,
        traceTarget?: Enemy,
        findTraceTarget?: (source: BallThunderBullet) => Enemy | undefined,
    ): BallThunderBullet {
        const size = 24;
        const thunder = new BallThunderBullet({
            launcher: this,
            x: centerX - size / 2,
            y: centerY - size / 2,
            rotation,
            damage: this.readStat("ATK")
                * this.readStat("THUNDER_MULTIPLIER"),
            faction: "player",
            traceAngle: this.readStat("THUNDER_BALL_TRACE"),
            traceTarget,
            findTraceTarget,
            remainingChains: Math.max(
                0,
                Math.floor(this.readStat("THUNDER_CHAIN_COUNT")),
            ),
            chainTargetIds,
        });

        this.spawnEntity(thunder);
        return thunder;
    }

    public setControlsEnabled(enabled: boolean): void {
        this.controlsEnabled = enabled;
    }

    public resolveParry(canParry: boolean = true): ParryResult {
        if (!this.guarding || !canParry) {
            return "none";
        }

        if (this.guardElapsed <= PlayerPlane.perfectParryDuration) {
            this.endGuard(0);
            this.invincible(PlayerPlane.perfectParryInvincibilityDuration);
            void this.playParryAudio(GAME_AUDIO_SOURCES.perfectParry);
            return "perfect";
        }

        this.endGuard(
            PlayerPlane.guardCooldownBase * PlayerPlane.guardCooldownPenalty,
        );
        void this.playParryAudio(GAME_AUDIO_SOURCES.unexactParry);
        return "guard";
    }

    public override getEntityType(): "player" {
        return "player";
    }

    private attack(): void {
        if (this.fireCooldown > 0) {
            return;
        }

        const bulletWidth = 6;
        const bulletHeight = 16;
        const centerX = this.position.x + this.size.width / 2;

        const { MULTIPLE_SHOOT } = this.statsValue;
        const bulletCount = 1 + Math.floor(MULTIPLE_SHOOT) + Number(rate(MULTIPLE_SHOOT - Math.floor(MULTIPLE_SHOOT)));
        for (let i = 0; i < bulletCount; i++) {
            this.spawnEntity(new BasicBullet({
                launcher: this,
                x: centerX - bulletWidth / 2,
                y: this.position.y - bulletHeight,
                rotation: -Math.PI / 2 + radians(randomFloat(-1, 1) * this.readStat("SHOOT_OFFSET")),
                damage: this.readStat("ATK"),
                faction: "player",
            }));
        }
        void this.audioSystem.playAudio(GAME_AUDIO_SOURCES.pew).catch(() => {
            // 浏览器可能在用户交互前禁止播放音频，静默忽略即可。
        });
        this.fireCooldown = 1 / this.readStat("ATK_SPD");
    }

    private updateGuard(delta: number): void {
        const guardKey = this.input.isPressed("KeyK");

        if (
            guardKey
            && !this.previousGuardKey
            && !this.guarding
            && this.guardCooldown === 0
        ) {
            this.guarding = true;
            this.guardElapsed = 0;
        }

        if (this.guarding) {
            if (!guardKey) {
                this.endGuard(PlayerPlane.guardCooldownBase);
            } else {
                this.guardElapsed += delta;

                if (this.guardElapsed >= PlayerPlane.guardDuration) {
                    this.endGuard(PlayerPlane.guardCooldownBase);
                }
            }
        }

        this.previousGuardKey = guardKey;
    }

    private endGuard(cooldown: number): void {
        if (!this.guarding) {
            return;
        }

        this.guarding = false;
        this.guardElapsed = 0;
        this.guardCooldown = cooldown;
    }

    /** 播放一次音效（供召唤物等附属单位调用），失败静默忽略。 */
    public playSound(source: string): void {
        void this.audioSystem.playAudio(source).catch(() => {
            // 浏览器可能在用户交互前禁止播放音频，静默忽略即可。
        });
    }

    private async playParryAudio(source: string): Promise<void> {
        try {
            await this.audioSystem.playAudio(source);
        } catch {
            // 浏览器可能在用户交互前禁止播放音频，静默忽略即可。
        }
    }
}
