import { BaseEntity } from "../core/entity";

export abstract class Item extends BaseEntity {
    public value: number = 0;
    public remainingLifetime: number = 0;

    public abstract override getEntityType(): "item";
}
