import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export type CannonBulletOptions = BasicBulletOptions;

/**
 * 炮台召唤物发射的大体积重炮弹。
 * 体积显著大于 BasicBullet，伤害由炮台按 SUMMON_DAMAGE 与 SUMMON_CANNON_DAMAGE 计算。
 */
export class CannonBullet extends BasicBullet {
    public constructor(options: CannonBulletOptions) {
        super({
            ...options,
            speed: options.speed ?? 320,
            damage: options.damage ?? 60,
        });

        this.size = { width: 28, height: 16 };
        this.collisionBounds.size = { ...this.size };
        this.appearance = { shape: "ellipse", color: "#ffd166" };
        this.canParry = false;
    }

    public override judgeCritical(): [boolean, number] {
        // 特殊子弹不暴击，对齐雷电/反击规则。
        return [false, this.damage];
    }
}
