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
            "攻击力 +3",
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
            "攻击速度 +0.25",
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
            "暴击率 +4%",
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
            "暴击伤害 +25%",
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
            "散射 -0.5°",
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
            "多重射击 +0.1",
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
            "攻击速度 +1\n散射 +2°",
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

export const items = [
    AttackPowerUpgradeItem,
    AttackSpeedUpgradeItem,
    CriticalRateUpgradeItem,
    CriticalDamageUpgradeItem,
    ShootOffsetUpgradeItem,
    MultipleShootUpgradeItem,
    EpicShoot
];
