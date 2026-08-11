import type { GameSystem } from "../../logic/game-system";
import type { GameWorld } from "../../logic/game-world";
import type { PlayerPlane } from "../player-plane";
import {
    createRandomSummon,
    findNearestEnemy,
    isSummon,
} from "../summons";

export interface SummonControllerOptions {
    player: PlayerPlane;
    spawnEntity: (entity: unknown) => void;
}

/**
 * 召唤物控制器：维护召唤物数量上限（SUMMON_COUNT），
 * 不足时自动随机补召一台小飞机。
 */
export class SummonControllerSystem implements GameSystem {
    private readonly player: PlayerPlane;
    private readonly spawnEntity: (entity: unknown) => void;

    public constructor(options: SummonControllerOptions) {
        this.player = options.player;
        this.spawnEntity = options.spawnEntity;
    }

    public update(world: GameWorld, deltaTime: number): void {
        void deltaTime;
        const targetCount = Math.max(
            0,
            Math.floor(this.player.readStat("SUMMON_COUNT")),
        );
        const activeSummons = world.entities.filter(
            (entity) => isSummon(entity) && entity.active,
        ).length;

        if (activeSummons >= targetCount) {
            return;
        }

        const summon = createRandomSummon({
            player: this.player,
            spawnEntity: this.spawnEntity,
            findNearestEnemy: () => findNearestEnemy(world.entities, summon),
        });

        this.spawnEntity(summon);
    }
}
