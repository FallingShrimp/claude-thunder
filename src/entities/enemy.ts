import { Plane } from "./plane";

export abstract class Enemy extends Plane {
    public scoreValue: number = 0;
    public pathProgress: number = 0;

    public abstract override getEntityType(): "enemy";
}
