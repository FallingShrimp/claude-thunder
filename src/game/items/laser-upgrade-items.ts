import {
    PLAYER_STATS_FORMATS,
    type PlayerStats,
} from "../player-plane";
import { Quality } from "./quality";
import { PlayerStatUpgradeItem } from "./stat-upgrade-item-base";

export class DodgeLaserItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "冲刺时向前发射激光",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { LASER_COUNT: 1 },
            ["闪避"]
        );
    }
}

export class LaserRefractionItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "激光命中后向最近敌人折射",
            ".",
            Quality.EPIC,
            PLAYER_STATS_FORMATS,
            { LASER_REFRACTION_TARGETS: 1 },
            ["闪避"],
            (player) => player.readStat("LASER_COUNT") > 0
        );
    }
}

export class LaserRefractionCountItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "激光可折射的次数增加",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { LASER_REFRACTION_COUNT: 1 },
            ["闪避"],
            (player) => player.readStat("LASER_COUNT") > 0
        );
    }
}

export class LaserAimItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "激光自动瞄准",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { LASER_AIM_ANGLE: 3 },
            ["闪避"],
            (player) => player.readStat("LASER_COUNT") > 0
        );
    }
}

export class LaserRefractionPowerItem
    extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "激光折射后伤害提高",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { LASER_REFRACTION_DECAY: 0.05 },
            ["闪避"],
            (player) => player.readStat("LASER_COUNT") > 0
        );
    }
}

export class LaserDamageItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "激光伤害提高",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { LASER_DAMAGE: 0.2 },
            ["闪避"],
            (player) => player.readStat("LASER_COUNT") > 0
        );
    }
}

export class DodgeChargeItem extends PlayerStatUpgradeItem<PlayerStats> {
    public constructor() {
        super(
            "闪避充能加快",
            ".",
            Quality.RARE,
            PLAYER_STATS_FORMATS,
            { DODGE_CHARGE: 0.2 },
            ["闪避"]
        );
    }
}
