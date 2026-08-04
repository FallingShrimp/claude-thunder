import type { BaseEntity } from "../../core/entity";
import { Plane } from "../../entities/plane";
import { CollisionSystem } from "../../logic/collision-system";
import { BasicBullet } from "../bullets/basic-bullet";

export class GameCollisionSystem extends CollisionSystem {
    protected override shouldTest(
        left: BaseEntity,
        right: BaseEntity,
    ): boolean {
        return this.getBulletAndPlane(left, right) !== undefined;
    }

    protected override onCollision(
        left: BaseEntity,
        right: BaseEntity,
        deltaTime: number,
    ): void {
        void deltaTime;

        const pair = this.getBulletAndPlane(left, right);

        if (pair !== undefined && pair.plane !== pair.bullet.launcher) {
            pair.bullet.hit(pair.plane);
        }
    }

    private getBulletAndPlane(
        left: BaseEntity,
        right: BaseEntity,
    ): { bullet: BasicBullet; plane: Plane } | undefined {
        if (left instanceof BasicBullet && right instanceof Plane) {
            return { bullet: left, plane: right };
        }

        if (right instanceof BasicBullet && left instanceof Plane) {
            return { bullet: right, plane: left };
        }

        return undefined;
    }
}
