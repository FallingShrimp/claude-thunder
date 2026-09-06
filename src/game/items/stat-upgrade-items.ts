import {
    PLAYER_STATS_FORMATS,
    type PlayerStats,
} from "../player-plane";
import type { Player } from "../../entities/player";
import { Quality } from "./quality";
import { PlayerStatUpgradeItem } from "./stat-upgrade-item-base";
import {
    AssaultDamageItem,
    AssaultSpeedItem,
    CannonDamageItem,
    CannonMultishotItem,
    GunnerMultishotItem,
    GunnerRateItem,
    SummonArmyItem,
    SummonAssaultItem,
    SummonCannonItem,
    SummonCountItem,
    SummonDamageBigItem,
    SummonDamageItem,
    SummonGunnerItem,
    SummonHealthItem,
    SummonOrbitItem,
    SummonOverloadItem,
    SummonRegenItem,
    SummonSacrificeItem,
} from "./summon-upgrade-items";
import {
    DodgeLaserItem,
    LaserAimItem,
    LaserDamageItem,
    LaserRefractionCountItem,
    LaserRefractionItem,
    LaserRefractionPowerItem,
} from "./laser-upgrade-items";

/** 闪避充能加快：DODGE_CHARGE +1（通用标签）。 */
export class DodgeChargeItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "闪避充能加快",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { DODGE_CHARGE: 1 },
            ["通用"]
        );
    }
}

/** 能量倍率提高：ENERGY_DMG_MULTIPLIER +0.25（通用标签）。 */
export class EnergyMultiplierItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "充能速度更快",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { ENERGY_DMG_MULTIPLIER: 0.4 },
            ["充能"]
        );
    }
}


export class EnergyCapItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "可储存更多能量",
            ".",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { ENERGY_CAP: 20 },
            ["充能"]
        );
    }
}

/** 能量弹穿透增加：ENERGY_PIERCE +1（通用标签）。 */
export class EnergyPierceItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "电磁陨星可穿透敌人",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { ENERGY_PIERCE: 1 },
            ["充能"]
        );
    }
}

export class EnergySavingItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "能量利用效率提高",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            { ENERGY_SAVING: 0.5 },
            ["充能"]
        );
    }
}

export class AttackPowerUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "攻击力小幅提高",
            "./items/attack-power.svg",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { ATK: 5 },
            ["通用"]
        );
    }
}

export class AttackSpeedUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "射速小幅提高",
            "./items/attack-speed.svg",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { ATK_SPD: 0.4 },
            ["通用"]
        );
    }
}

export class CriticalRateUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "暴击率提高",
            "./items/critical-rate.svg",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { CRIT_RATE: 0.1 },
            ["暴击"]
        );
    }
}

export class CriticalDamageUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "暴击伤害大幅增加",
            "./items/critical-damage.svg",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { CRIT_DMG: 0.3 },
            ["暴击"],
            (player) => player.readStat("CRIT_RATE") > 0
        );
    }
}

export class ShootOffsetUpgradeItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "射击更加精准",
            ".",
            Quality.WASTE,
            PLAYER_STATS_FORMATS,
            { SHOOT_OFFSET: -0.5 },
            ["通用"]
        );
    }
}

export class MultipleShootUpgradeItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "有概率额外射出子弹",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { MULTIPLE_SHOOT: 0.4 },
            ["通用"]
        );
    }
}

export class MultipleShoot2 extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "更多弹道",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            { MULTIPLE_SHOOT: 2 },
            ["通用"]
        );
    }
}

export class EpicShoot extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "射速大幅提高但精准度降低",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            {
                ATK_SPD: 2,
                SHOOT_OFFSET: 4
            },
            ["通用"]
        );
    }
}

export class Luck extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "变得更加幸运",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                LUCK: 5
            },
            ["通用"]
        );
    }
}

export class CounterAttack extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "小幅强化反击",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                COUNTER_MULTIPLIER: 0.4
            },
            ["反击"]
        );
    }
}

export class CounterAttackBig extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "大幅强化反击",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            {
                COUNTER_MULTIPLIER: 2,
                COUNTER_REFRACTION: 3
            },
            ["反击"]
        );
    }
}

export class CounterCount extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "额外产生反击火球",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            {
                COUNTER_COUNT: 1
            },
            ["反击"]
        );
    }
}

export class ChainCounter extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "反击火球在敌人间弹射",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                COUNTER_REFRACTION: 1
            },
            ["反击"]
        );
    }
}

export class CounterTrace extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "反击火球可追踪敌人",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                COUNTER_TRACE: 0.25
            },
            ["反击"]
        );
    }
}

export class ThunderSplit extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "攻击产生球状闪电",
            ".",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            {
                THUNDER_SPLIT_COUNT: 1
            },
            ["雷电"]
        );
    }
}

export class ThunderChain extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "球状闪电可连锁放电",
            ".",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            {
                THUNDER_CHAIN_COUNT: 1
            },
            ["雷电"],
            (player) => player.readStat("THUNDER_SPLIT_COUNT") > 0
        );
    }
}

export class ThunderPower extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "提高雷电伤害",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                THUNDER_MULTIPLIER: 0.35
            },
            ["雷电"],
            (player) => player.readStat("THUNDER_SPLIT_COUNT") > 0
        );
    }
}

export class ThunderRange extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "连锁雷电的距离更长",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                THUNDER_RANGE: 30
            },
            ["雷电"],
            (player) => player.readStat("THUNDER_SPLIT_COUNT") > 0
        );
    }
}

export class ThunderTrace extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "球状闪电可追踪敌人",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                THUNDER_BALL_TRACE: 0.25
            },
            ["雷电"],
            (player) => player.readStat("THUNDER_SPLIT_COUNT") > 0
        );
    }
}

/** 传说暴击：暴击率 +20% 且暴击伤害 +50%（暴击标签）。 */
export class CriticalSurgeItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "暴击涌动",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            {
                CRIT_RATE: 0.25,
                CRIT_DMG: 0.5
            },
            ["暴击"]
        );
    }
}

/** 生命上限提高：上限 +20，并立即回复等量生命（生命标签）。 */
export class MaxHealthItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "生命上限提高",
            ".",
            Quality.LEGENDARY,
            PLAYER_STATS_FORMATS,
            {},
            ["通用"]
        );
    }

    public override apply(player: Player): void {
        super.apply(player);
        player.maxHealth += 20;
        player.health = Math.min(player.maxHealth, player.health + 20);
    }
}

/** 立即治疗：回复 30 点生命，满血时不显示（生命标签）。 */
export class HealItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "修复机体",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            {},
            ["通用"],
            (player) => player.health < player.maxHealth
        );
    }

    public override apply(player: Player): void {
        super.apply(player);
        player.health = Math.min(player.maxHealth, player.health + 30);
    }
}

export const items = [
    AttackPowerUpgradeItem,
    AttackSpeedUpgradeItem,
    CriticalRateUpgradeItem,
    CriticalDamageUpgradeItem,
    ShootOffsetUpgradeItem,
    MultipleShootUpgradeItem,
    MultipleShoot2,
    EpicShoot,
    Luck,
    CounterAttack,
    CounterCount,
    CounterAttackBig,
    ChainCounter,
    CounterTrace,
    ThunderSplit,
    ThunderChain,
    ThunderPower,
    ThunderRange,
    ThunderTrace,
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
    DodgeLaserItem,
    LaserAimItem,
    LaserRefractionItem,
    LaserRefractionCountItem,
    LaserRefractionPowerItem,
    LaserDamageItem,
    DodgeChargeItem,
    EnergyMultiplierItem,
    EnergyPierceItem,
    EnergyCapItem,
    EnergySavingItem,
    MaxHealthItem,
    HealItem,
    CriticalSurgeItem
];
