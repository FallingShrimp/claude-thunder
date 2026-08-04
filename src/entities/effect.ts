import { BaseEntity } from "../core/entity";

export abstract class Effect extends BaseEntity {
    public elapsedTime: number = 0;
    public duration: number = 0;
    public frameIndex: number = 0;

    public abstract override getEntityType(): "effect";
}
