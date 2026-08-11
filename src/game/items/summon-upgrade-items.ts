import {
    PLAYER_STATS_FORMATS,
    type PlayerStats,
} from "../player-plane";
import { Quality } from "./quality";
import { PlayerStatUpgradeItem } from "./stat-upgrade-item-base";

// ===== 流派入口（分别召唤三型小飞机）=====

/** 召唤机枪手：SUMMON_GUNNER_COUNT +1，召唤一台机枪手。 */
export class SummonGunnerItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "召唤机枪手",
            ".",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { SUMMON_GUNNER_COUNT: 1 },
            ["召唤"],
        );
    }
}

/** 召唤炮台：SUMMON_CANNON_COUNT +1，召唤一台炮台。 */
export class SummonCannonItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "召唤炮台",
            ".",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { SUMMON_CANNON_COUNT: 1 },
            ["召唤"],
        );
    }
}

/** 召唤突击者：SUMMON_ASSAULT_COUNT +1，召唤一台突击者。 */
export class SummonAssaultItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "召唤突击者",
            ".",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { SUMMON_ASSAULT_COUNT: 1 },
            ["召唤"],
        );
    }
}

// ===== 数量成长 =====

/** 援军到来：三型小飞机各 +1。 */
export class SummonCountItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "援军到来",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                SUMMON_GUNNER_COUNT: 1,
                SUMMON_CANNON_COUNT: 1,
                SUMMON_ASSAULT_COUNT: 1,
            },
            ["召唤"],
        );
    }
}

/** 召唤大军：三型小飞机各 +2（数量流上限）。 */
export class SummonArmyItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "召唤大军",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            {
                SUMMON_GUNNER_COUNT: 2,
                SUMMON_CANNON_COUNT: 2,
                SUMMON_ASSAULT_COUNT: 2,
            },
            ["召唤"],
        );
    }
}

// ===== 通用乘区 =====

/** 召唤强化：SUMMON_DAMAGE +30%。 */
export class SummonDamageItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "召唤强化",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { SUMMON_DAMAGE: 0.3 },
            ["召唤"],
        );
    }
}

/** 召唤再强化：SUMMON_DAMAGE +60%。 */
export class SummonDamageBigItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "召唤再强化",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            { SUMMON_DAMAGE: 0.6 },
            ["召唤"],
        );
    }
}

/** 合金机身：SUMMON_HEALTH +30。 */
export class SummonHealthItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "合金机身",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { SUMMON_HEALTH: 30 },
            ["召唤"],
        );
    }
}

/** 纳米修复：SUMMON_REGEN +1.5。 */
export class SummonRegenItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "纳米修复",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { SUMMON_REGEN: 1.5 },
            ["召唤"],
        );
    }
}

/** 环形编队：SUMMON_ORBIT_SPEED +40%。 */
export class SummonOrbitItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "环形编队",
            ".",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { SUMMON_ORBIT_SPEED: 0.4 },
            ["召唤"],
        );
    }
}

// ===== 三型专属强化 =====

/** 速射核心：机枪手射速 +40%。 */
export class GunnerRateItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "速射核心",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { SUMMON_GUNNER_RATE: 0.4 },
            ["召唤"],
        );
    }
}

/** 双管机枪：机枪手每次齐射额外 1 颗。 */
export class GunnerMultishotItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "双管机枪",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { SUMMON_GUNNER_MULTISHOT: 1 },
            ["召唤"],
        );
    }
}

/** 重炮核心：炮台大子弹伤害 +30。 */
export class CannonDamageItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "重炮核心",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { SUMMON_CANNON_DAMAGE: 30 },
            ["召唤"],
        );
    }
}

/** 三发齐射：炮台每轮齐射 +1 颗。 */
export class CannonMultishotItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "三发齐射",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { SUMMON_CANNON_MULTISHOT: 1 },
            ["召唤"],
        );
    }
}

/** 突进核心：突击者冲刺伤害 +40。 */
export class AssaultDamageItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "突进核心",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { SUMMON_ASSAULT_DAMAGE: 40 },
            ["召唤"],
        );
    }
}

/** 连续突进：突击者冲刺冷却 -30%。 */
export class AssaultSpeedItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "连续突进",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { SUMMON_ASSAULT_SPEED: 0.3 },
            ["召唤"],
        );
    }
}

// ===== 传说质变 =====

/** 殉爆：召唤物被击毁时爆炸，对周围敌人造成范围伤害。 */
export class SummonSacrificeItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "殉爆",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            { SUMMON_SACRIFICE: 1 },
            ["召唤"],
        );
    }
}

/** 共振过载：所有召唤物伤害与攻速再 +25%。 */
export class SummonOverloadItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "共振过载",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            { SUMMON_OVERLOAD: 0.25 },
            ["召唤"],
        );
    }
}

export const summonItems = [
    SummonGunnerItem,
    SummonCannonItem,
    SummonAssaultItem,
    SummonCountItem,
    SummonArmyItem,
    SummonDamageItem,
    SummonDamageBigItem,
    SummonHealthItem,
    SummonRegenItem,
    SummonOrbitItem,
    GunnerRateItem,
    GunnerMultishotItem,
    CannonDamageItem,
    CannonMultishotItem,
    AssaultDamageItem,
    AssaultSpeedItem,
    SummonSacrificeItem,
    SummonOverloadItem,
];
