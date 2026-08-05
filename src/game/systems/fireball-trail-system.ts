import type { GameSystem } from "../../logic/game-system";
import type { GameWorld } from "../../logic/game-world";
import { FireballBullet } from "../bullets/fireball-bullet";

const EMISSION_RATE = 90;
const FLAME_COLORS = ["#fff3a3", "#ffb21a", "#ff5a0a", "#c92b08"] as const;

export class FireballTrailSystem implements GameSystem {
    private readonly emissionRemainders = new WeakMap<FireballBullet, number>();

    public update(world: GameWorld, delta: number): void {
        for (const entity of world.entities) {
            if (!(entity instanceof FireballBullet) || !entity.active) {
                continue;
            }

            const emission = (this.emissionRemainders.get(entity) ?? 0)
                + EMISSION_RATE * delta;
            const count = Math.floor(emission);
            this.emissionRemainders.set(entity, emission - count);

            if (count === 0) {
                continue;
            }

            const centerX = entity.position.x + entity.size.width / 2;
            const centerY = entity.position.y + entity.size.height / 2;
            const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
            const directionX = speed === 0 ? 0 : entity.velocity.x / speed;
            const directionY = speed === 0 ? -1 : entity.velocity.y / speed;
            const tailX = centerX - directionX * entity.size.width * 0.38;
            const tailY = centerY - directionY * entity.size.width * 0.38;

            for (let index = 0; index < count; index++) {
                const spread = (Math.random() - 0.5) * entity.size.height * 0.55;
                const backwardSpeed = 55 + Math.random() * 125;
                const perpendicularX = -directionY;
                const perpendicularY = directionX;

                world.particles.emit({
                    x: tailX + perpendicularX * spread,
                    y: tailY + perpendicularY * spread,
                    velocityX: -directionX * backwardSpeed
                        + perpendicularX * spread * 2,
                    velocityY: -directionY * backwardSpeed
                        + perpendicularY * spread * 2,
                    drag: 2.8,
                    size: 7 + Math.random() * 10,
                    endSize: 0,
                    lifetime: 0.18 + Math.random() * 0.32,
                    color: FLAME_COLORS[
                        Math.floor(Math.random() * FLAME_COLORS.length)
                    ],
                });
            }
        }
    }
}
