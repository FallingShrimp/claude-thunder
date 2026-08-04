import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";

export type BulletFaction = "player" | "enemy";

export abstract class Bullet extends BaseEntity {
    public readonly launcher: BaseEntity;
    public damage: number = 0;
    public faction: BulletFaction = "player";
    public remainingLifetime: number = 0;

    protected constructor(
        id: string,
        position: Vector2,
        size: Size2D,
        appearance: RenderAppearance,
        launcher: BaseEntity,
    ) {
        super(id, position, size, appearance);
        this.launcher = launcher;
    }

    public abstract override getEntityType(): "bullet";
}
