import { Plane } from "./plane";

export abstract class Player extends Plane {
    public score: number = 0;
    public lives: number = 0;
    public powerLevel: number = 1;

    public abstract override getEntityType(): "player";
}
