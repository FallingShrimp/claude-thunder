import { Enemy } from "../../entities/enemy";
import { AssaultSummon } from "./assault-summon";
import { CannonSummon } from "./cannon-summon";
import { GunnerSummon } from "./gunner-summon";
import { SummonPlane, type SummonPlaneOptions, type SummonType } from "./summon-plane";

export { AssaultSummon } from "./assault-summon";
export { CannonSummon } from "./cannon-summon";
export { GunnerSummon } from "./gunner-summon";
export { SummonPlane } from "./summon-plane";
export type { SummonPlaneOptions } from "./summon-plane";
export type { SummonType } from "./summon-plane";

export type CreateSummonContext = Omit<SummonPlaneOptions, "orbitAngle">;

/** 按指定类型生成一台小飞机。 */
export function createSummon(
    type: SummonType,
    context: CreateSummonContext,
): SummonPlane {
    switch (type) {
        case "gunner":
            return new GunnerSummon(context);
        case "cannon":
            return new CannonSummon(context);
        case "assault":
            return new AssaultSummon(context);
    }
}

/** 随机三选一生成一台小飞机。 */
export function createRandomSummon(context: CreateSummonContext): SummonPlane {
    const types: readonly SummonType[] = ["gunner", "cannon", "assault"];
    const type = types[Math.floor(Math.random() * types.length)];
    return createSummon(type, context);
}

/** 类型守卫：判断实体是否为召唤物。 */
export function isSummon(entity: unknown): entity is SummonPlane {
    return entity instanceof SummonPlane;
}

/** 取最近敌人（供召唤物索敌查询注入）。 */
export function findNearestEnemy(
    entities: readonly unknown[],
    summon: SummonPlane,
): Enemy | undefined {
    const sourceX = summon.position.x + summon.size.width / 2;
    const sourceY = summon.position.y + summon.size.height / 2;
    let nearest: Enemy | undefined;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const entity of entities) {
        if (!(entity instanceof Enemy) || !entity.active) {
            continue;
        }

        const targetX = entity.position.x + entity.size.width / 2;
        const targetY = entity.position.y + entity.size.height / 2;
        const offsetX = targetX - sourceX;
        const offsetY = targetY - sourceY;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;

        if (distanceSquared < nearestDistanceSquared) {
            nearest = entity;
            nearestDistanceSquared = distanceSquared;
        }
    }

    return nearest;
}
