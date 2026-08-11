import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";
import type { Player } from "./player";

export abstract class Item<TQuality = unknown> extends BaseEntity {
    public value: number = 0;
    public remainingLifetime: number = 0;

    /**
     * 显示条件：只有满足该条件的道具才能进入本次随机抽取的道具池。
     * 例如尚未获得球状闪电时，不应出现强化连锁/追踪的道具。
     */
    public displayCondition: (player: Player) => boolean = () => true;

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
