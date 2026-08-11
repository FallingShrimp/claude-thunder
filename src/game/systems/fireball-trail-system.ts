import type { BaseEntity } from "../../core/entity";
import type { GameSystem } from "../../logic/game-system";
import type { GameWorld } from "../../logic/game-world";
import type { ParticleSystem } from "../../logic/systems/particle-system";
import { CannonBullet } from "../bullets/cannon-bullet";
import { FireballBullet } from "../bullets/fireball-bullet";

const EMISSION_RATE = 90;
const FLAME_COLORS = ["#fff3a3", "#ffb21a", "#ff5a0a", "#c92b08"] as const;

/** 拖尾缩放配置：火球与炮台火球均满规模。 */
interface TrailConfig {
    /** 每秒发射粒子数。 */
    emissionRate: number;
    /** 尾部偏移、扩散幅度、粒子尺寸、后退速度的缩放系数。 */
    scale: number;
}

const TRAIL_CONFIGS = new WeakMap<BaseEntity, TrailConfig>();

export class FireballTrailSystem implements GameSystem {
    private readonly emissionRemainders = new WeakMap<BaseEntity, number>();

    public update(world: GameWorld, delta: number): void {
        for (const entity of world.entities) {
            if (!entity.active) {
                continue;
            }

            const config = FireballTrailSystem.resolveConfig(entity);
            if (config === undefined) {
                continue;
            }

            this.emitTrail(world.particles, entity, config, delta);
        }
    }

    private static resolveConfig(
        entity: BaseEntity,
    ): TrailConfig | undefined {
        const cached = TRAIL_CONFIGS.get(entity);
        if (cached !== undefined) {
            return cached;
        }

        if (entity instanceof FireballBullet) {
            const config = { emissionRate: EMISSION_RATE, scale: 1 };
            TRAIL_CONFIGS.set(entity, config);
            return config;
        }

        if (entity instanceof CannonBullet) {
            const config = { emissionRate: EMISSION_RATE, scale: 1 };
            TRAIL_CONFIGS.set(entity, config);
            return config;
        }

        return undefined;
    }

    private emitTrail(
        particles: ParticleSystem,
        entity: BaseEntity,
        config: TrailConfig,
        delta: number,
    ): void {
        const emission = (this.emissionRemainders.get(entity) ?? 0)
            + config.emissionRate * delta;
        const count = Math.floor(emission);
        this.emissionRemainders.set(entity, emission - count);

        if (count === 0) {
            return;
        }

        const centerX = entity.position.x + entity.size.width / 2;
        const centerY = entity.position.y + entity.size.height / 2;
        const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
        const directionX = speed === 0 ? 0 : entity.velocity.x / speed;
        const directionY = speed === 0 ? -1 : entity.velocity.y / speed;
        const tailX = centerX - directionX * entity.size.width * 0.38 * config.scale;
        const tailY = centerY - directionY * entity.size.width * 0.38 * config.scale;
        const perpendicularX = -directionY;
        const perpendicularY = directionX;

        for (let index = 0; index < count; index++) {
            const spread = (Math.random() - 0.5)
                * entity.size.height * 0.55 * config.scale;
            const backwardSpeed = (55 + Math.random() * 125) * config.scale;

            particles.emit({
                x: tailX + perpendicularX * spread,
                y: tailY + perpendicularY * spread,
                velocityX: -directionX * backwardSpeed
                    + perpendicularX * spread * 2,
                velocityY: -directionY * backwardSpeed
                    + perpendicularY * spread * 2,
                drag: 2.8,
                size: (7 + Math.random() * 10) * config.scale,
                endSize: 0,
                lifetime: (0.18 + Math.random() * 0.32) * config.scale,
                color: FLAME_COLORS[
                    Math.floor(Math.random() * FLAME_COLORS.length)
                ],
            });
        }
    }
}
