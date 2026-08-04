import type { BaseEntity } from "../core/entity";

export interface CollisionPair {
    first: BaseEntity;
    second: BaseEntity;
}

export interface CollisionRule {
    test(first: BaseEntity, second: BaseEntity): boolean;
}
