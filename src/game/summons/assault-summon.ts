import { Enemy } from "../../entities/enemy";
import {
    SummonPlane,
    type SummonPlaneOptions,
} from "./summon-plane";

/**
 * 突击者召唤物：每 0.5 秒向最近敌人冲刺一次，命中造成 90 碰撞伤害。
 * 冲刺伤害 = (90 + SUMMON_ASSAULT_DAMAGE) × SUMMON_DAMAGE；
 * 冲刺冷却受 SUMMON_ASSAULT_SPEED 缩减。
 *
 * 冲刺期间的命中判定由 GameCollisionSystem 读取 `assaulting` 标记与
 * `assaultDamage` 完成。
 */
export class AssaultSummon extends SummonPlane {
    public static readonly baseAssaultInterval: number = 0.5;
    public static readonly baseAssaultDamage: number = 90;
    public static readonly assaultDuration: number = 0.18;

    public assaulting: boolean = false;
    public assaultDamage: number = 0;

    private assaultCooldown: number = 0;
    private assaultRemaining: number = 0;
    private assaultDirection: number = 0;

    public constructor(options: SummonPlaneOptions) {
        super(
            "assault",
            { width: 30, height: 28 },
            { shape: "triangle", color: "#ff7a59" },
            options,
        );

        this.rotation = Math.PI / 2;
    }

    protected override attack(delta: number, target: Enemy | undefined): void {
        this.assaultCooldown = Math.max(0, this.assaultCooldown - delta);

        if (this.assaulting) {
            this.assaultRemaining -= delta;
            const speed = 520;
            this.position.x += Math.cos(this.assaultDirection) * speed * delta;
            this.position.y += Math.sin(this.assaultDirection) * speed * delta;
            this.rotation = this.assaultDirection + Math.PI / 2;

            if (this.assaultRemaining <= 0) {
                this.assaulting = false;
            }

            return;
        }

        if (target === undefined || this.assaultCooldown > 0) {
            return;
        }

        const cooldownReduction = Math.max(
            0,
            this.player.readStat("SUMMON_ASSAULT_SPEED"),
        );
        this.assaultCooldown = AssaultSummon.baseAssaultInterval
            / (1 + cooldownReduction);
        this.assaultDamage = Math.max(
            0,
            (AssaultSummon.baseAssaultDamage
                + this.player.readStat("SUMMON_ASSAULT_DAMAGE"))
            * this.getDamageMultiplier(),
        );
        this.assaulting = true;
        this.assaultRemaining = AssaultSummon.assaultDuration;
        const sourceCenter = this.getPlayerCenter();
        const targetCenter = this.getTargetCenter(target);
        this.assaultDirection = Math.atan2(
            targetCenter.y - sourceCenter.y,
            targetCenter.x - sourceCenter.x,
        );
    }
}
