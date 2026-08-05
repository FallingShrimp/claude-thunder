import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";
import type { DamageLabel } from "./damage-label";
import { Enemy } from "./enemy";
import type { Plane } from "./plane";
import { Player } from "./player";

export type BulletFaction = "player" | "enemy";

export abstract class Bullet extends BaseEntity {
    public readonly launcher: BaseEntity;
    public damage: number = 0;
    public faction: BulletFaction = "player";
    public remainingLifetime: number = 0;
    public canParry: boolean = false;
    public penetrate: number = 0;

    private readonly hitTargets = new Set<string>();

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
        return !this.hitTargets.has(target.id) && this.isOpposingTarget(target);
    }

    public hit(target: Plane): DamageLabel | undefined {
        if (!this.canDamage(target)) {
            return undefined;
        }

        const damageLabel = this.resolveHit(target);

        if (this.penetrate > 0) {
            this.penetrate--;
        } else {
            this.active = false;
        }

        return damageLabel;
    }

    public hitOnSpawn(target: Plane): DamageLabel | undefined {
        if (
            this.hitTargets.has(target.id)
            || !this.isOpposingTarget(target)
        ) {
            return undefined;
        }

        return this.resolveHit(target);
    }

    private isOpposingTarget(target: Plane): boolean {
        return (this.launcher instanceof Player && target instanceof Enemy)
            || (this.launcher instanceof Enemy && target instanceof Player);
    }

    private resolveHit(target: Plane): DamageLabel | undefined {
        if (!this.active || !target.active) {
            return undefined;
        }

        this.hitTargets.add(target.id);
        const [critical, dmg] = this.judgeCritical();
        const damageLabel = target.takeDamage(
            dmg,
            critical,
            this,
        );

        return damageLabel;
    }

    public abstract override getEntityType(): "bullet";

    public abstract judgeCritical(): [boolean, number];
}
