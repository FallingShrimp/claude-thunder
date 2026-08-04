import type { Size2D, Vector2 } from "./geometry";
import type { RenderAppearance } from "./render-appearance";
import { RenderableTarget } from "./renderable-target";

export interface CollisionBounds {
    offset: Vector2;
    size: Size2D;
}

export abstract class BaseEntity extends RenderableTarget {
    public readonly id: string;
    public velocity: Vector2;
    public active: boolean;
    public collisionBounds: CollisionBounds;

    protected constructor(
        id: string,
        position: Vector2,
        size: Size2D,
        appearance: RenderAppearance,
    ) {
        super(position, size, appearance);
        this.id = id;
        this.velocity = { x: 0, y: 0 };
        this.active = true;
        this.collisionBounds = {
            offset: { x: 0, y: 0 },
            size: { ...size },
        };
    }

    public abstract ai(delta: number): void;

    public abstract getEntityType(): string;
}
