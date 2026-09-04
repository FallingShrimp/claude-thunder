import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";

/** 残影：记录实体某个瞬间的外观快照，随时间淡出后自动消失。 */
export class Afterimage extends BaseEntity {
    private remainingLifetime: number;
    private readonly totalLifetime: number;
    private readonly baseOpacity: number;

    public constructor(
        position: Vector2,
        size: Size2D,
        appearance: RenderAppearance,
        rotation: number = 0,
        scale: Vector2 = { x: 1, y: 1 },
        lifetime: number = 0.28,
        baseOpacity: number = 0.6,
    ) {
        super(crypto.randomUUID(), { ...position }, { ...size }, appearance);

        this.remainingLifetime = lifetime;
        this.totalLifetime = lifetime;
        this.baseOpacity = baseOpacity;
        this.rotation = rotation;
        this.scale = { ...scale };
        this.opacity = baseOpacity;
    }

    public override ai(delta: number): void {
        this.remainingLifetime = Math.max(0, this.remainingLifetime - delta);
        this.opacity = this.baseOpacity
            * (this.remainingLifetime / this.totalLifetime);

        if (this.remainingLifetime === 0) {
            this.active = false;
        }
    }

    public override getEntityType(): "afterimage" {
        return "afterimage";
    }
}
