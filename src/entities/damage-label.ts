import { BaseEntity } from "../core/entity";
import type { Vector2 } from "../core/geometry";

export class DamageLabel extends BaseEntity {
    public readonly damage: number;
    public readonly prefix: string;
    public readonly suffix: string;
    public remainingLifetime: number;
    public readonly totalLifetime: number;

    public constructor(
        damage: number,
        position: Vector2,
        color: string = "#ffffff",
        prefix: string = "",
        suffix: string = "",
    ) {
        super(
            crypto.randomUUID(),
            position,
            { width: 80, height: 24 },
            { shape: "rectangle", color },
        );

        this.damage = Math.max(0, damage);
        this.prefix = prefix;
        this.suffix = suffix;
        this.totalLifetime = 0.8;
        this.remainingLifetime = this.totalLifetime;
        this.velocity.y = -48;
        this.zIndex = 200;
    }

    public override ai(delta: number): void {
        this.position.y += this.velocity.y * delta;
        this.remainingLifetime = Math.max(0, this.remainingLifetime - delta);
        this.opacity = this.remainingLifetime / this.totalLifetime;

        if (this.remainingLifetime === 0) {
            this.active = false;
        }
    }

    public override getEntityType(): "damage-label" {
        return "damage-label";
    }
}
