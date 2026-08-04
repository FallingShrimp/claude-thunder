import type { BaseEntity } from "../../core/entity";
import { Bullet } from "../../entities/bullet";
import { Plane } from "../../entities/plane";
import { CollisionSystem } from "../../logic/collision-system";
import type { GameWorld } from "../../logic/game-world";

export class GameCollisionSystem extends CollisionSystem {
    protected override shouldTest(
        left: BaseEntity,
        right: BaseEntity,
    ): boolean {
        return this.getBulletAndPlane(left, right) !== undefined;
    }

    protected override onCollision(
        world: GameWorld,
        left: BaseEntity,
        right: BaseEntity,
        deltaTime: number,
    ): void {
        void deltaTime;

        const pair = this.getBulletAndPlane(left, right);

        if (pair === undefined || pair.plane === pair.bullet.launcher) {
            return;
        }

        const damageLabel = pair.bullet.hit(pair.plane);

        if (damageLabel !== undefined) {
            world.addEntity(damageLabel);
        }
    }

    private getBulletAndPlane(
        left: BaseEntity,
        right: BaseEntity,
    ): { bullet: Bullet; plane: Plane } | undefined {
        if (left instanceof Bullet && right instanceof Plane) {
            return { bullet: left, plane: right };
        }

        if (right instanceof Bullet && left instanceof Plane) {
            return { bullet: right, plane: left };
        }

        return undefined;
    }
}
