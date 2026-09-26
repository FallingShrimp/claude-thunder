import type { Vector2 } from "../../core/geometry";
import { GAME_AUDIO_SOURCES } from "../audio-assets";
import { Enemy } from "../../entities/enemy";
import { SummonPlane, type SummonPlaneOptions } from "./summon-plane";

/**
 * 突击者召唤物：非冲刺时以玩家两倍速度移动——距离目标过远则先移向目标，
 * 距离足够后围绕目标环绕；只有「正在环绕目标」且冷却完毕时才发起冲刺，
 * 命中造成碰撞伤害。无目标时沿玩家周围轨道移动。
 * 冲刺伤害 = (玩家 ATK × 3000% + SUMMON_ASSAULT_DAMAGE) × SUMMON_DAMAGE；
 * 冲刺间隔 2 秒，受 SUMMON_ASSAULT_SPEED 缩减。
 *
 * 移动采用速度追踪而非基类的瞬移环绕（shouldOrbit 返回 false），
 * 避免切换环绕中心时位置跳变。
 * 冲刺期间的命中判定由 GameCollisionSystem 读取 `assaulting` 标记与
 * `assaultDamage` 完成。
 */
export class AssaultSummon extends SummonPlane {
    public static readonly baseAssaultInterval: number = 2;
    /** 冲刺伤害系数：玩家攻击力的 3000%（×30）。 */
    public static readonly baseAssaultDamageFactor: number = 30;
    public static readonly assaultDuration: number = 0.18;
    /** 非冲刺移动速度：玩家基础速度（240）× 2。 */
    public static readonly baseMoveSpeed: number = 480;
    /** 环绕目标的理想半径：小于等于该距离时进入环绕状态。 */
    public static readonly targetOrbitRadius: number = 110;

    public assaulting: boolean = false;
    public assaultDamage: number = 0;

    private assaultCooldown: number = 0;
    private assaultRemaining: number = 0;
    private assaultDirection: number = 0;
    /** 是否正在环绕目标（距离已进入 targetOrbitRadius 范围）。 */
    private orbitingTarget: boolean = false;

    public constructor(options: SummonPlaneOptions) {
        super(
            "assault",
            { width: 30, height: 28 },
            { shape: "triangle", color: "#ff7a59" },
            options,
        );

        this.rotation = Math.PI / 2;
    }

    protected override shouldOrbit(): boolean {
        // 突击者禁用基座的瞬移环绕，改为速度追踪移动（见 updateMovement）。
        return false;
    }

    protected override attack(delta: number, target: Enemy | undefined): void {
        this.assaultCooldown = Math.max(0, this.assaultCooldown - delta);

        if (this.assaulting) {
            this.assaultRemaining -= delta;
            const speed = 520;
            this.position.x += Math.cos(this.assaultDirection) * speed * delta;
            this.position.y += Math.sin(this.assaultDirection) * speed * delta;
            // 尖端（+x）指向冲刺方向。
            this.rotation = this.assaultDirection;

            if (this.assaultRemaining <= 0) {
                this.assaulting = false;
            }

            return;
        }

        this.updateMovement(delta, target);

        // 只有正在环绕目标且冷却完毕时才可发起冲刺攻击。
        if (target === undefined || this.assaultCooldown > 0 || !this.orbitingTarget) {
            return;
        }

        const cooldownReduction = Math.max(0, this.player.readStat("SUMMON_ASSAULT_SPEED"));
        this.assaultCooldown = AssaultSummon.baseAssaultInterval / (1 + cooldownReduction);
        this.assaultDamage = Math.max(
            0,
            (this.player.readStat("ATK") * AssaultSummon.baseAssaultDamageFactor +
                this.player.readStat("SUMMON_ASSAULT_DAMAGE")) *
                this.getDamageMultiplier(),
        );
        this.assaulting = true;
        this.assaultRemaining = AssaultSummon.assaultDuration;
        this.player.playSound(GAME_AUDIO_SOURCES.laserShot);
        const sourceCenter: Vector2 = {
            x: this.position.x + this.size.width / 2,
            y: this.position.y + this.size.height / 2,
        };
        const targetCenter = this.getTargetCenter(target);
        this.assaultDirection = Math.atan2(
            targetCenter.y - sourceCenter.y,
            targetCenter.x - sourceCenter.x,
        );
    }

    /**
     * 非冲刺移动：以玩家两倍速度移动。
     * - 有存活目标：距离过远则径向移向目标，距离足够则切向环绕目标
     *   （进入环绕状态 orbitingTarget，冲刺攻击的前置条件）。
     * - 无目标：沿玩家周围的轨道点移动，避免原地悬停。
     */
    private updateMovement(delta: number, target: Enemy | undefined): void {
        const speed = AssaultSummon.baseMoveSpeed;
        const sourceCenterX = this.position.x + this.size.width / 2;
        const sourceCenterY = this.position.y + this.size.height / 2;

        if (target !== undefined && target.active) {
            const targetCenter = this.getTargetCenter(target);
            const dx = targetCenter.x - sourceCenterX;
            const dy = targetCenter.y - sourceCenterY;
            const distance = Math.hypot(dx, dy);
            const step = speed * delta;

            if (distance > AssaultSummon.targetOrbitRadius) {
                // 距离不足以环绕，先移向目标。
                this.orbitingTarget = false;
                if (distance < 1) {
                    return;
                }
                this.position.x += (dx / distance) * step;
                this.position.y += (dy / distance) * step;
                // 尖端（+x）指向目标。
                this.rotation = Math.atan2(dy, dx);
            } else {
                // 距离足够，沿切线方向环绕目标；尖端（+x）始终对准目标。
                this.orbitingTarget = true;
                if (distance < 1) {
                    return;
                }
                const tangentX = -dy / distance;
                const tangentY = dx / distance;
                this.position.x += tangentX * step;
                this.position.y += tangentY * step;
                this.rotation = Math.atan2(dy, dx);
            }
            return;
        }

        // 无目标：沿玩家周围轨道点移动。
        this.orbitingTarget = false;
        const orbitSpeed =
            SummonPlane.baseOrbitSpeed * Math.max(0.1, this.player.readStat("SUMMON_ORBIT_SPEED"));
        this.orbitAngle += orbitSpeed * delta;
        const playerCenter = this.getPlayerCenter();
        const goalX = playerCenter.x + Math.cos(this.orbitAngle) * this.baseRadius;
        const goalY = playerCenter.y + Math.sin(this.orbitAngle) * this.baseRadius;
        const dx = goalX - sourceCenterX;
        const dy = goalY - sourceCenterY;
        const distance = Math.hypot(dx, dy);
        if (distance < 1) {
            return;
        }
        const step = speed * delta;
        this.position.x += (dx / distance) * step;
        this.position.y += (dy / distance) * step;
        // 尖端（+x）指向轨道目标点。
        this.rotation = Math.atan2(dy, dx);
    }
}
