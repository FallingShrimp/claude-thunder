import { Enemy } from "../../entities/enemy";
import { CannonBullet } from "../bullets/cannon-bullet";
import {
    SummonPlane,
    type SummonPlaneOptions,
} from "./summon-plane";

/**
 * 炮台召唤物：每 1 秒向当前目标齐射 2 颗大体积 CannonBullet。
 * 每颗基础 60 伤害，受 SUMMON_DAMAGE 与 SUMMON_CANNON_DAMAGE 加成；
 * SUMMON_CANNON_MULTISHOT 增加每轮齐射数。
 */
export class CannonSummon extends SummonPlane {
    public static readonly baseFireInterval: number = 1;
    public static readonly baseShotCount: number = 2;
    public static readonly baseDamage: number = 60;

    private shotCooldown: number = 0;

    public constructor(options: SummonPlaneOptions) {
        super(
            "cannon",
            { width: 34, height: 30 },
            { shape: "rectangle", color: "#ffd166" },
            options,
        );

        this.rotation = Math.PI / 2;
    }

    protected override attack(delta: number, target: Enemy | undefined): void {
        this.shotCooldown = Math.max(0, this.shotCooldown - delta);

        if (target === undefined || this.shotCooldown > 0) {
            return;
        }

        this.shotCooldown = CannonSummon.baseFireInterval;

        const shotCount = CannonSummon.baseShotCount + Math.max(
            0,
            Math.floor(this.player.readStat("SUMMON_CANNON_MULTISHOT")),
        );
        const damage = Math.max(
            0,
            (CannonSummon.baseDamage + this.player.readStat("SUMMON_CANNON_DAMAGE"))
            * this.getDamageMultiplier(),
        );
        const bulletWidth = 28;
        const bulletHeight = 16;
        const sourceX = this.position.x + this.size.width / 2 - bulletWidth / 2;
        const sourceY = this.position.y + this.size.height / 2;
        const targetCenter = this.getTargetCenter(target);
        const baseRotation = Math.atan2(
            targetCenter.y - sourceY - bulletHeight / 2,
            targetCenter.x - sourceX,
        );

        for (let index = 0; index < shotCount; index++) {
            const offset = (index - (shotCount - 1) / 2) * 0.16;
            this.spawnEntity(new CannonBullet({
                launcher: this,
                x: sourceX,
                y: sourceY,
                rotation: baseRotation + offset,
                damage,
                faction: "player",
            }));
        }
    }
}
