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
import { EnergyStarBullet } from "./bullets/energy-star-bullet";
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
    SUMMON_CAP: number;
    LASER_COUNT: number;
    LASER_REFRACTION_TARGETS: number;
    LASER_REFRACTION_COUNT: number;
    LASER_REFRACTION_DECAY: number;
    LASER_AIM_ANGLE: number;
    LASER_DAMAGE: number;
    DODGE_CHARGE: number;
    ENERGY_CAP: number;
    ENERGY_DMG_MULTIPLIER: number;
    ENERGY_PIERCE: number;
    ENERGY_SAVING: number;
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
    SUMMON_CAP: DataFormat.VALUE,
    LASER_COUNT: DataFormat.VALUE,
    LASER_REFRACTION_TARGETS: DataFormat.VALUE,
    LASER_REFRACTION_COUNT: DataFormat.VALUE,
    LASER_REFRACTION_DECAY: DataFormat.PERCENT,
    LASER_AIM_ANGLE: DataFormat.ANGLE,
    LASER_DAMAGE: DataFormat.VALUE,
    DODGE_CHARGE: DataFormat.PERCENT,
    ENERGY_CAP: DataFormat.VALUE,
    ENERGY_DMG_MULTIPLIER: DataFormat.PERCENT,
    ENERGY_PIERCE: DataFormat.VALUE,
    ENERGY_SAVING: DataFormat.PERCENT,
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
    /** 贴图没有固有朝向，静止时机身保持零旋转。 */
    private static readonly baseRotation: number = 0;
    /** 玩家贴图资源路径，供加载界面预加载使用。 */
    public static readonly textureSource: string = "./assets/texture/claude.ico";

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
    private laserCooldown: number = 0;
    /** 当前能量值（上限 ENERGY_CAP）。 */
    public energy: number = 0;
    /** 是否正在蓄力（按住 I）。 */
    public charging: boolean = false;
    private chargeConsumed: number = 0;
    private previousChargeKey: boolean = false;

    public constructor(
        private readonly input: KeyboardInput,
        private readonly audioSystem: AudioSystem,
        private readonly spawnEntity: (entity: BaseEntity) => void,
        private readonly touch?: TouchInput,
        /** 瞄准用：返回场上全部敌人（供激光选取偏转角最小者）。 */
        private readonly findTargets?: () => readonly Plane[],
    ) {
        super(
            "player",
            {
                x: (touch?.canvas.width ?? 480) / 2 - 24,
                y: (touch?.canvas.height ?? 720) - 80,
            },
            { width: 48, height: 56 },
            { shape: "sprite", color: "#4da6ff", spriteSource: PlayerPlane.textureSource },
            100,
            Number.MAX_SAFE_INTEGER,
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
                SUMMON_CAP: 1,
                LASER_COUNT: 0,
                LASER_REFRACTION_TARGETS: 0,
                LASER_REFRACTION_COUNT: 0,
                LASER_REFRACTION_DECAY: 0.75,
                LASER_AIM_ANGLE: 0,
                LASER_DAMAGE: 5,
                DODGE_CHARGE: 1,
                ENERGY_CAP: 100,
                ENERGY_DMG_MULTIPLIER: 0.5,
                ENERGY_PIERCE: 1,
                ENERGY_SAVING: 0,
            },
        );

        this.speed = 360;
        this.lives = 3;
        this.fireCooldown = 0;
        this.rotation = PlayerPlane.baseRotation;
    }

    public override ai(delta: number): void {
        this.fireCooldown = Math.max(0, this.fireCooldown - delta);
        this.laserCooldown = Math.max(0, this.laserCooldown - delta);
        this.guardCooldown = Math.max(0, this.guardCooldown - delta);
        this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);

        if (!this.controlsEnabled) {
            this.velocity = { x: 0, y: 0 };
            this.dodging = false;
            this.endGuard(PlayerPlane.guardCooldownBase);
            this.previousGuardKey = this.input.isPressed("KeyK");
            this.previousChargeKey = this.input.isPressed("KeyI");
            return;
        }

        // 蓄力状态机必须每帧无条件更新：它原本只在键盘移动分支被调用，
        // 冲刺或触摸分支会提前 return，导致蓄力期间能量消耗忽停忽续。
        // 放在分支切换之前，保证冲刺/触摸/键盘任意状态下都按 delta 平滑消耗。
        this.updateCharging(delta);

        // 按住空格即可持续冲刺：冷却结束自动再次触发，无需重新按下。
        const dodgeHeld = this.input.isPressed("Space");

        // 键盘操控优先：只要有任何方向/攻击/格挡键活跃，就用键盘分支，
        // 从而保证桌面端不受触摸输入影响（TouchInput 始终存在）。
        // KeyI 也要算作键盘活跃：只按住 I 蓄力时不能落入触摸分支，
        // 否则蓄力状态机整帧跳过，能量消耗会出现断断续续的现象。
        const keyboardActive = this.input.isPressed("KeyW")
            || this.input.isPressed("KeyA")
            || this.input.isPressed("KeyS")
            || this.input.isPressed("KeyD")
            || this.input.isPressed("KeyJ")
            || this.input.isPressed("KeyK")
            || this.input.isPressed("KeyI");

        const horizontal = Number(this.input.isPressed("KeyD"))
            - Number(this.input.isPressed("KeyA"));
        const vertical = Number(this.input.isPressed("KeyS"))
            - Number(this.input.isPressed("KeyW"));

        // 按空格闪避：移动中朝移动方向；无触摸拖动时向下冲刺。
        if (dodgeHeld && (horizontal !== 0 || vertical !== 0)) {
            this.startDodge(horizontal, vertical);
        } else if (dodgeHeld && !this.isTouchDragging()) {
            this.startDodge(0, 1);
        }

        // 冲刺期间：位移完全由冲刺接管，忽略移动输入，仅保留攻击/格挡。
        // 必须在键盘/触摸分支切换之前处理，否则松开按键会导致冲刺冻结。
        if (this.dodging) {
            this.updateDodge(delta);

            if (this.touch !== undefined && !keyboardActive) {
                this.attack();
            } else {
                if (this.input.isPressed("KeyJ")) {
                    this.attack();
                }

                this.updateGuard(delta);
            }

            return;
        }

        if (this.touch !== undefined && !keyboardActive) {
            this.updateTouchControl(delta, dodgeHeld);
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
    private updateTouchControl(delta: number, dodgeHeld: boolean): void {
        const touch = this.touch as TouchInput;

        if (touch.isDown) {
            this.touchActivated = true;
            const centerX = this.position.x + this.size.width / 2;
            const centerY = this.position.y + this.size.height / 2;
            const dx = touch.targetX - centerX;
            const dy = touch.targetY - centerY;
            const distance = Math.hypot(dx, dy);

            if (distance > 1 && dodgeHeld) {
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

    /** 是否正处于触摸拖动状态（手指按下且偏离机体中心）。 */
    private isTouchDragging(): boolean {
        if (this.touch === undefined || !this.touch.isDown) {
            return false;
        }

        const centerX = this.position.x + this.size.width / 2;
        const centerY = this.position.y + this.size.height / 2;

        return Math.hypot(
            this.touch.targetX - centerX,
            this.touch.targetY - centerY,
        ) > 1;
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
    }

    /** 获取能量：所有能量获取都会乘以攻击速度加成。 */
    public gainEnergy(base: number): void {
        this.energy = Math.min(
            Math.max(0, this.readStat("ENERGY_CAP")),
            this.energy + base * this.readStat("ATK_SPD"),
        );
    }

    /**
     * 蓄力状态机（按住 I）：
     * - 开始：能量大于 0 时按下 I；
     * - 期间：按 delta 平滑消耗能量（每 0.5 秒消耗 50 点），攻击被封锁；
     * - 能量耗尽：不自动发射，保持蓄力等待（无能量可消耗）；
     * - 结束：松开 I 时发射金色四角星炮弹。
     */
    private updateCharging(delta: number): void {
        const chargeKey = this.input.isPressed("KeyI");
        const chargePressed = chargeKey && !this.previousChargeKey;
        const chargeReleased = !chargeKey && this.previousChargeKey;

        this.previousChargeKey = chargeKey;

        if (this.charging) {
            // 能量耗尽时不自动退出蓄力：保持等待直到松开 I，
            // 此时 consumed 恒为 0，不会继续消耗（期间若重新获得能量则继续消耗）。
            const consumed = Math.min(this.energy, 100 * delta);

            this.energy -= consumed;
            // 节能：本次蓄力按 (1 + 节能) 放大结算值，
            // 逐帧累加保证总效果等价于总消耗 × (1 + 节能) 且不产生复利。
            this.chargeConsumed
                += consumed * (1 + Math.max(0, this.readStat("ENERGY_SAVING")));

            if (chargeReleased) {
                this.fireEnergyStar();
            }

            return;
        }

        if (chargePressed && this.energy > 0) {
            this.charging = true;
            this.chargeConsumed = 0;
            this.playSound(GAME_AUDIO_SOURCES.chargeStart);
        }
    }

    /** 发射金色旋转四角星炮弹：伤害 = 攻击力 × 本次消耗能量 × 伤害倍率。 */
    private fireEnergyStar(): void {
        this.charging = false;

        const consumed = this.chargeConsumed;

        this.chargeConsumed = 0;

        if (consumed <= 0) {
            return;
        }

        this.playSound(GAME_AUDIO_SOURCES.energyStar);

        this.spawnEntity(new EnergyStarBullet({
            launcher: this,
            x: this.position.x + this.size.width / 2 - 10,
            y: this.position.y + this.size.height / 2 - 10,
            rotation: -Math.PI / 2,
            damage: this.readStat("ATK")
                * consumed
                * Math.max(0, this.readStat("ENERGY_DMG_MULTIPLIER")),
            penetrate: Math.max(0, this.readStat("ENERGY_PIERCE")),
            findTarget: this.findTargets ?? (() => []),
            spawnEntity: this.spawnEntity,
        }));
    }

    /** 攻击时发射激光（需持有冲刺激光道具）：始终向上，并朝预期偏转角最小的敌人修正。 */
    private fireLasers(): void {
        const laserCount = Math.max(
            0,
            Math.floor(this.readStat("LASER_COUNT")),
        );

        if (laserCount === 0) {
            return;
        }

        // 激光始终向上发射（画布 y 轴向下，上方为 -90°）。
        const baseRotation = -Math.PI / 2;
        // 激光角度修正：从所有敌人中选取与正上方夹角最小者，
        // 修正量钳制在 LASER_AIM_ANGLE（度）内。
        const maxCorrection = radians(
            Math.max(0, this.readStat("LASER_AIM_ANGLE")),
        );
        const candidates = maxCorrection > 0
            ? this.findTargets?.() ?? []
            : [];
        let aimRotation = baseRotation;
        let bestDiff = Number.POSITIVE_INFINITY;

        for (const target of candidates) {
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

            if (Math.abs(diff) < Math.abs(bestDiff)) {
                bestDiff = diff;
            }
        }

        if (Number.isFinite(bestDiff)) {
            const clamped = Math.max(
                -maxCorrection,
                Math.min(maxCorrection, bestDiff),
            );

            aimRotation = baseRotation + clamped;
        }

        const originX = this.position.x + this.size.width / 2;
        const originY = this.position.y + this.size.height / 2;

        // 多条激光平行排布：水平方向每 10px 一条，走向相同。
        for (let index = 0; index < laserCount; index++) {
            const offset = (index - (laserCount - 1) / 2) * 10;

            this.spawnEntity(new LaserBullet({
                launcher: this,
                originX: originX + offset,
                originY,
                rotation: aimRotation,
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

    /** 格挡条进度：格挡中显示剩余格挡时间（满格递减至 0），否则显示冷却恢复。 */
    public getGuardCooldownProgress(): number {
        if (this.guarding) {
            if (PlayerPlane.guardDuration <= 0) {
                return 0;
            }

            return 1 - Math.min(
                1,
                this.guardElapsed / PlayerPlane.guardDuration,
            );
        }

        if (PlayerPlane.guardCooldownBase <= 0) {
            return 1;
        }

        return 1 - Math.min(
            1,
            this.guardCooldown / PlayerPlane.guardCooldownBase,
        );
    }

    /** 冲刺冷却恢复进度（0 = 刚触发，1 = 就绪），冷却总时长受闪避充能影响。 */
    public getDodgeCooldownProgress(): number {
        const charge = Math.max(0.1, this.readStat("DODGE_CHARGE"));
        const totalCooldown = PlayerPlane.dodgeCooldown / charge;

        if (totalCooldown <= 0) {
            return 1;
        }

        return 1 - Math.min(1, this.dodgeCooldown / totalCooldown);
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

    /** 蓄力期间禁止普通攻击与激光。 */
    private attack(): void {
        if (this.charging) {
            return;
        }

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

        // 按住攻击时发射激光：冷却基值为子弹冷却的 500%，
        // 攻击速度加成同样加速激光。
        if (this.laserCooldown === 0 && this.readStat("LASER_COUNT") > 0) {
            this.fireLasers();
            this.laserCooldown = 5 / this.readStat("ATK_SPD");
        }
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
