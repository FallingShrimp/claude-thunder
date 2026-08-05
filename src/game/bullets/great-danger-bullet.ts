import { DangerBullet, type DangerBulletOptions } from "./danger-bullet";

export type GreatDangerBulletOptions = DangerBulletOptions;

export class GreatDangerBullet extends DangerBullet {
    public constructor(options: GreatDangerBulletOptions) {
        super({
            ...options,
            speed: 360,
            damage: 10,
        });

        this.speed = 360;
        this.damage = 10;
        this.size = { width: 10, height: 20 };
        this.collisionBounds.size = { ...this.size };
        this.appearance = { shape: "rectangle", color: "#a855f7" };
    }
}
