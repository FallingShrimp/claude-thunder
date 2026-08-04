import type { StatsData } from "../core/stats";
import { Plane } from "./plane";

export abstract class Player<
    T extends StatsData = StatsData,
> extends Plane<T> {
    public score: number = 0;
    public lives: number = 0;
    public powerLevel: number = 1;

    public abstract override getEntityType(): "player";
}
