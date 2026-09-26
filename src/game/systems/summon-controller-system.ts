import type { Enemy } from "../../entities/enemy";
import type { GameSystem } from "../../logic/game-system";
import type { GameWorld } from "../../logic/game-world";
import type { PlayerPlane } from "../player-plane";
import {
    createAssaultSummon,
    createCannonSummon,
    createGunnerSummon,
    findNearestEnemy,
    isSummon,
    type SummonPlane,
} from "../summons";

export interface SummonControllerOptions {
    player: PlayerPlane;
    spawnEntity: (entity: unknown) => void;
}

interface SummonKind {
    statKey: "SUMMON_GUNNER_COUNT" | "SUMMON_CANNON_COUNT" | "SUMMON_ASSAULT_COUNT";
    matches: (summon: SummonPlane) => boolean;
    create: (context: {
        player: PlayerPlane;
        spawnEntity: (entity: unknown) => void;
        findNearestEnemy: () => Enemy | undefined;
    }) => SummonPlane;
}

const SUMMON_KINDS: readonly SummonKind[] = [
    {
        statKey: "SUMMON_GUNNER_COUNT",
        matches: (summon) => summon.summonType === "gunner",
        create: createGunnerSummon,
    },
    {
        statKey: "SUMMON_CANNON_COUNT",
        matches: (summon) => summon.summonType === "cannon",
        create: createCannonSummon,
    },
    {
        statKey: "SUMMON_ASSAULT_COUNT",
        matches: (summon) => summon.summonType === "assault",
        create: createAssaultSummon,
    },
];

/**
 * 召唤物控制器：分别维护三型小飞机的数量上限
 * （SUMMON_GUNNER_COUNT / SUMMON_CANNON_COUNT / SUMMON_ASSAULT_COUNT），
 * 某一型数量不足时自动补召对应的那一型小飞机。
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

        for (const kind of SUMMON_KINDS) {
            const targetCount = Math.max(0, Math.floor(this.player.readStat(kind.statKey)));
            const activeCount = world.entities.filter(
                (entity) => isSummon(entity) && entity.active && kind.matches(entity),
            ).length;

            if (activeCount >= targetCount) {
                continue;
            }

            const summon = kind.create({
                player: this.player,
                spawnEntity: this.spawnEntity,
                findNearestEnemy: () => findNearestEnemy(world.entities, summon),
            });

            this.spawnEntity(summon);
        }
    }
}
