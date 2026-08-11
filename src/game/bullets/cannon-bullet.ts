import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export type CannonBulletOptions = BasicBulletOptions;

/**
 * 炮台召唤物发射的大体积火球弹。
 * 球形外观（正方形尺寸使 ellipse 渲染为正圆），并带有与火球相同的火焰拖尾；
 * 飞行速度较慢（火球速度的一半），伤害由炮台按 SUMMON_DAMAGE 与 SUMMON_CANNON_DAMAGE 计算。
 */
export class CannonBullet extends BasicBullet {
    public constructor(options: CannonBulletOptions) {
        super({
            ...options,
            speed: options.speed ?? 160,
            damage: options.damage ?? 60,
        });

        this.size = { width: 28, height: 28 };
        this.collisionBounds.size = { ...this.size };
        this.appearance = { shape: "ellipse", color: "#ff6b1a" };
        this.canParry = false;
    }

    // 继承 BasicBullet 的 judgeCritical：炮台子弹同样参与玩家暴击判定。
}
