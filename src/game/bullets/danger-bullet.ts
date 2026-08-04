import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export type DangerBulletOptions = BasicBulletOptions;

export class DangerBullet extends BasicBullet {
    public constructor(options: DangerBulletOptions) {
        super({
            ...options,
            faction: "enemy",
            damage: 5
        });

        this.appearance = { shape: "rectangle", color: "#ff3030" };
    }

    override judgeCritical(): [boolean, number] {
        return [false, this.damage];
    }
}
