import { Item } from "../../entities/item";
import type { Player } from "../../entities/player";

export abstract class PlaceholderItem extends Item {
    public constructor(
        id: string,
        x: number,
        color: string,
    ) {
        super(
            id,
            { x, y: 280 },
            { width: 96, height: 128 },
            { shape: "rectangle", color },
            "占位道具",
            "",
        );

        this.zIndex = 100;
    }

    public override ai(delta: number): void {
        void delta;
    }

    public override getEntityType(): "item" {
        return "item";
    }
}

export class PlaceholderItemRed extends PlaceholderItem {
    public constructor(x: number = 0) {
        super(crypto.randomUUID(), x, "#d84a4a");
    }

    public override apply(player: Player): void {
        void player;
    }
}

export class PlaceholderItemGreen extends PlaceholderItem {
    public constructor(x: number = 0) {
        super(crypto.randomUUID(), x, "#45b96b");
    }

    public override apply(player: Player): void {
        void player;
    }
}

export class PlaceholderItemBlue extends PlaceholderItem {
    public constructor(x: number = 0) {
        super(crypto.randomUUID(), x, "#478ee0");
    }

    public override apply(player: Player): void {
        void player;
    }
}
