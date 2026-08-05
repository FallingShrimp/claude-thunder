import type { StatsData, StatsFormats } from "../../core/stats";
import { Item } from "../../entities/item";
import type { Player } from "../../entities/player";
import {
    PLAYER_STATS_FORMATS,
    type PlayerStats,
} from "../player-plane";
import { getQualityColor, Quality } from "./quality";

export abstract class PlayerStatUpgradeItem<T extends StatsData>
    extends Item<Quality> {
    public constructor(
        displayName: string,
        avatarSource: string,
        quality: Quality,
        public readonly statsSlot: StatsFormats<T>,
        public readonly statsValue: Partial<T>,
    ) {
        super(
            crypto.randomUUID(),
            { x: 0, y: 280 },
            { width: 96, height: 128 },
            { shape: "rectangle", color: getQualityColor(quality) },
            displayName,
            avatarSource,
            quality,
        );

        this.zIndex = 100;
    }

    public override ai(delta: number): void {
        void delta;
    }

    public override apply(player: Player): void {
        const playerStats = player.statsValue as StatsData;

        for (const key of Object.keys(this.statsValue) as (keyof T)[]) {
            const increment = this.statsValue[key];

            if (
                typeof key === "string"
                && typeof increment === "number"
                && key in playerStats
            ) {
                playerStats[key] += increment;
            }
        }
    }

    public override getEntityType(): "item" {
        return "item";
    }
}

export class AttackPowerUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "伤害增加",
            "./items/attack-power.svg",
            Quality.NORMAL,
            PLAYER_STATS_FORMATS,
            { ATK: 3 },
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
            { ATK_SPD: 0.25 },
        );
    }
}

export class CriticalRateUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "有机会产生暴击",
            "./items/critical-rate.svg",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { CRIT_RATE: 0.04 },
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
            { CRIT_DMG: 0.25 },
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
            { SHOOT_OFFSET: -0.5 }
        );
    }
}

export class MultipleShootUpgradeItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "有概率多重射击",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { MULTIPLE_SHOOT: 0.1 }
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
                ATK_SPD: 1,
                SHOOT_OFFSET: 2
            }
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
                LUCK: 2
            }
        );
    }
}

export class CounterAttack extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "更强大的反击",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            {
                COUNTER_MULTIPLIER: 0.4
            }
        );
    }
}

export class CounterCount extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "额外反击一个敌人",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            {
                COUNTER_COUNT: 1
            }
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
            }
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
            }
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
            }
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
            }
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
            }
        );
    }
}

export const items = [
    AttackPowerUpgradeItem,
    AttackSpeedUpgradeItem,
    CriticalRateUpgradeItem,
    CriticalDamageUpgradeItem,
    ShootOffsetUpgradeItem,
    MultipleShootUpgradeItem,
    EpicShoot,
    Luck,
    CounterAttack,
    CounterCount,
    ChainCounter,
    ThunderSplit,
    ThunderChain,
    ThunderPower
];
