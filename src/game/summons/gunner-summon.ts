import { Enemy } from "../../entities/enemy";
import { BasicBullet } from "../bullets/basic-bullet";
import {
    SummonPlane,
    type SummonPlaneOptions,
} from "./summon-plane";

/**
 * 机枪手召唤物：每 0.1 秒向当前目标发射 1 颗 BasicBullet。
 * 伤害 = SUMMON_DAMAGE × 玩家 ATK × 0.5；射速受 SUMMON_GUNNER_RATE 提升；
 * SUMMON_GUNNER_MULTISHOT 增加每次齐射的子弹数。
 */
export class GunnerSummon extends SummonPlane {
    public static readonly baseFireInterval: number = 0.1;
    public static readonly baseDamageFactor: number = 0.5;

    public constructor(options: SummonPlaneOptions) {
        super(
            "gunner",
            { width: 22, height: 26 },
            { shape: "triangle", color: "#ffe66d" },
            options,
        );

        this.rotation = Math.PI / 2;
    }

    protected override attack(delta: number, target: Enemy | undefined): void {
        this.fireCooldown = Math.max(0, this.fireCooldown - delta);

        if (target === undefined || this.fireCooldown > 0) {
            return;
        }

        const rate = Math.max(0, this.player.readStat("SUMMON_GUNNER_RATE"));
        this.fireCooldown = GunnerSummon.baseFireInterval / (1 + rate);

        const bulletCount = 1 + Math.max(
            0,
            Math.floor(this.player.readStat("SUMMON_GUNNER_MULTISHOT")),
        );
        const damage = Math.max(
            0,
            this.player.readStat("ATK")
            * GunnerSummon.baseDamageFactor
            * this.getDamageMultiplier(),
        );
        const bulletWidth = 6;
        const bulletHeight = 16;
        const sourceX = this.position.x + this.size.width / 2 - bulletWidth / 2;
        const sourceY = this.position.y + this.size.height / 2;
        const targetCenter = this.getTargetCenter(target);
        const baseRotation = Math.atan2(
            targetCenter.y - sourceY - bulletHeight / 2,
            targetCenter.x - sourceX,
        );

        for (let index = 0; index < bulletCount; index++) {
            const offset = (index - (bulletCount - 1) / 2) * 0.12;
            this.spawnEntity(new BasicBullet({
                launcher: this,
                x: sourceX,
                y: sourceY,
                rotation: baseRotation + offset,
                speed: BasicBullet.defaultSpeed,
                damage,
                faction: "player",
            }));
        }
    }
}
