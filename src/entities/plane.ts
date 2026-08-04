import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";
import type { Bullet } from "./bullet";

export abstract class Plane extends BaseEntity {
    public health: number;
    public maxHealth: number;
    public speed: number;
    public fireCooldown: number;

    protected constructor(
        id: string,
        position: Vector2,
        size: Size2D,
        appearance: RenderAppearance,
        maxHealth: number,
    ) {
        super(id, position, size, appearance);
        this.health = maxHealth;
        this.maxHealth = maxHealth;
        this.speed = 0;
        this.fireCooldown = 0;
    }

    public takeDamage(damage: number, critical: boolean, bullet?: Bullet): void {
        void bullet;

        if (!this.active || !Number.isFinite(damage) || damage <= 0) {
            return;
        }

        const finalDamage = critical ? damage * 2 : damage;
        this.health = Math.max(0, this.health - finalDamage);

        if (this.health === 0) {
            this.active = false;
        }
    }
}
