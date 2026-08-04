import type { StatsData, StatsFormats } from "../../core/stats";
import { Item } from "../../entities/item";
import type { Player } from "../../entities/player";
import {
    PLAYER_STATS_FORMATS,
    type PlayerStats,
} from "../player-plane";

export abstract class PlayerStatUpgradeItem<T extends StatsData> extends Item {
    public constructor(
        displayName: string,
        avatarSource: string,
        color: string,
        public readonly statsSlot: StatsFormats<T>,
        public readonly statsValue: Partial<T>,
    ) {
        super(
            crypto.randomUUID(),
            { x: 0, y: 280 },
            { width: 96, height: 128 },
            { shape: "rectangle", color },
            displayName,
            avatarSource,
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
            "强袭核心 +2",
            "./items/attack-power.svg",
            "#b74444",
            PLAYER_STATS_FORMATS,
            { ATK: 2 },
        );
    }
}

export class AttackSpeedUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "疾射模块 +0.1",
            "./items/attack-speed.svg",
            "#b88732",
            PLAYER_STATS_FORMATS,
            { ATK_SPD: 0.1 },
        );
    }
}

export class CriticalRateUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "精准镜片 +2%",
            "./items/critical-rate.svg",
            "#3d8f68",
            PLAYER_STATS_FORMATS,
            { CRIT_RATE: 0.02 },
        );
    }
}

export class CriticalDamageUpgradeItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "毁灭棱镜 +5%",
            "./items/critical-damage.svg",
            "#6652ad",
            PLAYER_STATS_FORMATS,
            { CRIT_DMG: 0.05 },
        );
    }
}
