import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";
import type { Player } from "./player";

export abstract class Item<TQuality = unknown> extends BaseEntity {
    public value: number = 0;
    public remainingLifetime: number = 0;

    protected constructor(
        id: string,
        position: Vector2,
        size: Size2D,
        appearance: RenderAppearance,
        public readonly displayName: string,
        public readonly avatarSource: string,
        public readonly quality: TQuality,
        public readonly labels: string[] = [],
    ) {
        super(id, position, size, appearance);
        this.labels = [...new Set(labels)];
    }

    public abstract apply(player: Player): void;

    public abstract override getEntityType(): "item";
}
