import { BaseEntity } from "../core/entity";
import type { Player } from "./player";

export abstract class Item extends BaseEntity {
    public value: number = 0;
    public remainingLifetime: number = 0;

    public abstract apply(player: Player): void;

    public abstract override getEntityType(): "item";
}
