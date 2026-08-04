import { Plane } from "../../entities/plane";
import type { GameSystem } from "../../logic/game-system";
import type { GameWorld } from "../../logic/game-world";
import { BasicBullet } from "../bullets/basic-bullet";

export class BasicBulletCollisionSystem implements GameSystem {
    public update(world: GameWorld, deltaTime: number): void {
        void deltaTime;

        const bullets = world.entities.filter(
            (entity): entity is BasicBullet => entity instanceof BasicBullet,
        );
        const planes = world.entities.filter(
            (entity): entity is Plane => entity instanceof Plane,
        );

        for (const bullet of bullets) {
            for (const plane of planes) {
                if (
                    plane !== bullet.launcher
                    && bullet.collidesWith(plane)
                    && bullet.hit(plane)
                ) {
                    break;
                }
            }
        }
    }
}
