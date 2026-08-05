import type { Player } from "../../entities/player";
import { Item } from "../../entities/item";
import { getQualityColor, Quality } from "./quality";

export interface LabelWeightItemOptions {
    displayName: string;
    avatarSource: string;
    quality: Quality;
    targetLabel: string;
    weightIncrement: number;
    labels?: string[];
}

export class LabelWeightItem extends Item<Quality> {
    public readonly targetLabel: string;
    public readonly weightIncrement: number;

    public constructor(options: LabelWeightItemOptions) {
        if (options.targetLabel.length === 0) {
            throw new RangeError("The target item label must not be empty.");
        }

        if (
            !Number.isFinite(options.weightIncrement)
            || options.weightIncrement <= 0
        ) {
            throw new RangeError(
                "The label weight increment must be a positive finite number.",
            );
        }

        super(
            crypto.randomUUID(),
            { x: 0, y: 280 },
            { width: 96, height: 128 },
            { shape: "rectangle", color: getQualityColor(options.quality) },
            options.displayName,
            options.avatarSource,
            options.quality,
            options.labels,
        );

        this.targetLabel = options.targetLabel;
        this.weightIncrement = options.weightIncrement;
        this.zIndex = 100;
    }

    public override ai(delta: number): void {
        void delta;
    }

    public override apply(player: Player): void {
        void player;
    }

    public override getEntityType(): "item" {
        return "item";
    }
}
