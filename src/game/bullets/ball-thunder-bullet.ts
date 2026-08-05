import type { Plane } from "../../entities/plane";
import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export interface BallThunderBulletOptions
    extends Omit<BasicBulletOptions, "speed"> {
    remainingChains?: number;
    chainTargetIds?: ReadonlySet<string>;
}

export class BallThunderBullet extends BasicBullet {
    public remainingChains: number;
    public readonly chainTargetIds: Set<string>;

    public constructor(options: BallThunderBulletOptions) {
        super({
            ...options,
            speed: BasicBullet.defaultSpeed * 0.5,
        });

        this.remainingChains = Math.max(
            0,
            Math.floor(options.remainingChains ?? 0),
        );
        this.chainTargetIds = new Set(options.chainTargetIds);
        this.appearance = { shape: "ellipse", color: "#67f5ff" };
        this.size = { width: 24, height: 24 };
        this.collisionBounds.size = { ...this.size };
        this.canParry = false;
        this.penetrate = Number.POSITIVE_INFINITY;
        this.zIndex = 15;
    }

    public override canDamage(target: Plane): boolean {
        return !this.chainTargetIds.has(target.id) && super.canDamage(target);
    }

    public override judgeCritical(): [boolean, number] {
        return [false, this.damage];
    }
}
