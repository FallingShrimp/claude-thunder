import type { BaseEntity } from "../core/entity";
import type { Plane } from "../entities/plane";

export interface DamageResult {
    targetHealth: number;
    destroyed: boolean;
}

export interface DamageRule {
    calculate(target: Plane, source: BaseEntity, damage: number): DamageResult;
}
