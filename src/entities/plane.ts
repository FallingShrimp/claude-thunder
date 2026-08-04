import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";
import { BaseEntity } from "../core/entity";

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
}
