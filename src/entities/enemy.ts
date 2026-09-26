import type { StatsData } from "../core/stats";
import { Plane } from "./plane";

export abstract class Enemy<T extends StatsData = StatsData> extends Plane<T> {
    public scoreValue: number = 0;
    public pathProgress: number = 0;

    public abstract override getEntityType(): "enemy";
}
