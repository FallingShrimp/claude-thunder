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
export function createSummon(type: SummonType, context: CreateSummonContext): SummonPlane {
    switch (type) {
        case "gunner":
            return new GunnerSummon(context);
        case "cannon":
            return new CannonSummon(context);
        case "assault":
            return new AssaultSummon(context);
    }
}

/** 生成一台机枪手小飞机。 */
export function createGunnerSummon(context: CreateSummonContext): GunnerSummon {
    return new GunnerSummon(context);
}

/** 生成一台炮台小飞机。 */
export function createCannonSummon(context: CreateSummonContext): CannonSummon {
    return new CannonSummon(context);
}

/** 生成一台突击者小飞机。 */
export function createAssaultSummon(context: CreateSummonContext): AssaultSummon {
    return new AssaultSummon(context);
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
