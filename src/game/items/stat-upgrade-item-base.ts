import type { StatsData, StatsFormats } from "../../core/stats";
import { Item } from "../../entities/item";
import type { Player } from "../../entities/player";
import { getQualityColor, Quality } from "./quality";

/**
 * 属性升级道具基类：通过向玩家 statsValue 叠加数值生效。
 * 独立成文件以避免道具实现之间形成循环依赖。
 */
export abstract class PlayerStatUpgradeItem<T extends StatsData> extends Item<Quality> {
    public constructor(
        displayName: string,
        avatarSource: string,
        quality: Quality,
        public readonly statsSlot: StatsFormats<T>,
        public readonly statsValue: Partial<T>,
        labels: string[] = [],
        displayCondition?: (player: Player) => boolean,
    ) {
        super(
            crypto.randomUUID(),
            { x: 0, y: 280 },
            { width: 96, height: 128 },
            { shape: "rectangle", color: getQualityColor(quality) },
            displayName,
            avatarSource,
            quality,
            labels,
        );

        if (displayCondition !== undefined) {
            this.displayCondition = displayCondition;
        }
        this.zIndex = 100;
    }

    public override ai(delta: number): void {
        void delta;
    }

    public override apply(player: Player): void {
        const playerStats = player.statsValue as StatsData;

        for (const key of Object.keys(this.statsValue) as (keyof T)[]) {
            const increment = this.statsValue[key];

            if (typeof key === "string" && typeof increment === "number" && key in playerStats) {
                playerStats[key] += increment;
            }
        }
    }

    public override getEntityType(): "item" {
        return "item";
    }
}
