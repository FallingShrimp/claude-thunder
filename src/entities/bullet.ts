import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";
import { Enemy } from "./enemy";
import { Plane } from "./plane";
import { Player } from "./player";

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

    public canDamage(target: Plane): boolean {
        return (this.launcher instanceof Player && target instanceof Enemy)
            || (this.launcher instanceof Enemy && target instanceof Player);
    }
    public hit(target: Plane): boolean {
        if (!this.active || !target.active || !this.canDamage(target)) {
            return false;
        }

        target.takeDamage(this.damage, this.judgeCritical(), this);
        this.active = false;
        return true;
    }

    public abstract override getEntityType(): "bullet";

    public abstract judgeCritical(): boolean
}
