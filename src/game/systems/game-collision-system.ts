import type { BaseEntity } from "../../core/entity";
import { Bullet } from "../../entities/bullet";
import { Enemy } from "../../entities/enemy";
import { Plane } from "../../entities/plane";
import { Player } from "../../entities/player";
import { CollisionSystem } from "../../logic/collision-system";
import type { GameWorld } from "../../logic/game-world";

export class GameCollisionSystem extends CollisionSystem {
    protected override shouldTest(
        left: BaseEntity,
        right: BaseEntity,
    ): boolean {
        return this.getBulletAndPlane(left, right) !== undefined
            || this.getOpposingPlanes(left, right) !== undefined;
    }

    protected override onCollision(
        world: GameWorld,
        left: BaseEntity,
        right: BaseEntity,
        deltaTime: number,
    ): void {
        void deltaTime;

        const bulletPair = this.getBulletAndPlane(left, right);

        if (bulletPair !== undefined) {
            if (bulletPair.plane === bulletPair.bullet.launcher) {
                return;
            }

            const damageLabel = bulletPair.bullet.hit(bulletPair.plane);

            if (damageLabel !== undefined) {
                world.addEntity(damageLabel);
            }

            return;
        }

        const planePair = this.getOpposingPlanes(left, right);

        if (planePair === undefined) {
            return;
        }

        const firstDamageLabel = planePair.first.takeDamage(
            planePair.second.collisionDamage,
            false,
        );
        const secondDamageLabel = planePair.second.takeDamage(
            planePair.first.collisionDamage,
            false,
        );

        if (firstDamageLabel !== undefined) {
            world.addEntity(firstDamageLabel);
        }

        if (secondDamageLabel !== undefined) {
            world.addEntity(secondDamageLabel);
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

    private getOpposingPlanes(
        left: BaseEntity,
        right: BaseEntity,
    ): { first: Plane; second: Plane } | undefined {
        if (
            (left instanceof Player && right instanceof Enemy)
            || (left instanceof Enemy && right instanceof Player)
        ) {
            return { first: left, second: right };
        }

        return undefined;
    }
}
