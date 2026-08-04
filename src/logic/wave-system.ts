import { Enemy } from "../entities/enemy";
import type { GameWorld } from "./game-world";
import type { Wave } from "./wave";

export class WaveSystem {
    public static readonly maxEnemyCount: number = 5;

    public currentIndex: number = 0;

    public constructor(
        private readonly world: GameWorld,
        private readonly waves: ReadonlySet<Wave>,
    ) { }

    public switchTo(index: number): void {
        if (!Number.isInteger(index) || index < 0) {
            throw new RangeError("Wave index must be a non-negative integer.");
        }

        this.currentIndex = index;
        this.spawnEnemies();
    }

    private spawnEnemies(): void {
        let enemyCount = this.world.entities.filter(
            (entity) => entity.active && entity instanceof Enemy,
        ).length;

        for (const wave of this.waves) {
            if (enemyCount >= WaveSystem.maxEnemyCount) {
                return;
            }

            if (!this.isSuitable(wave)) {
                continue;
            }

            wave.spawnProgress += wave.spawnValue;

            while (
                wave.spawnProgress >= 100
                && enemyCount < WaveSystem.maxEnemyCount
            ) {
                this.world.addEntity(wave.spawnEnemy());
                wave.spawnProgress -= 100;
                enemyCount += 1;
            }
        }
    }

    private isSuitable(wave: Wave): boolean {
        return this.currentIndex >= wave.startIndex
            && this.currentIndex <= wave.endIndex;
    }
}
