import type { BaseEntity } from "../core/entity";
import { Player } from "../entities/player";

interface CriticalStatsLike {
    CRIT_RATE?: number;
    CRIT_DMG?: number;
}

/**
 * 从伤害来源解析出暴击属性来源（玩家本体或其召唤物），取其暴击属性。
 * 召唤物通过公开的 player 字段（duck typing，避免循环依赖）回溯到玩家。
 */
function resolveCriticalStats(
    launcher: BaseEntity | undefined,
): { rate: number; dmg: number } | undefined {
    if (launcher === undefined) {
        return undefined;
    }

    const player = launcher instanceof Player
        ? launcher
        : (launcher as { player?: Player }).player;

    if (!(player instanceof Player)) {
        return undefined;
    }

    const stats = player.statsValue as CriticalStatsLike;
    return {
        rate: stats.CRIT_RATE ?? 0,
        dmg: stats.CRIT_DMG ?? 1,
    };
}

/**
 * 统一的暴击判定：玩家及其召唤物造成的所有伤害均可暴击。
 * 返回 [是否暴击, 实际伤害]；非玩家来源固定返回不暴击。
 */
export function rollCritical(
    launcher: BaseEntity | undefined,
    damage: number,
): [boolean, number] {
    const source = resolveCriticalStats(launcher);

    if (source === undefined) {
        return [false, damage];
    }

    const state = Math.random() < source.rate;
    return [state, damage * (state ? source.dmg * (1 + Math.max(0, source.rate - 1)) : 1)];
}
