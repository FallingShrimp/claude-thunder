import { Enemy } from "../entities/enemy";
import type { GameWorld } from "./game-world";
import type { Wave } from "./wave";

export class WaveSystem {
    public static readonly maxEnemyCount: number = 5;

    public currentIndex: number = 0;

    private nextWaveIndex: number = 0;

    public constructor(
        private readonly world: GameWorld,
        private readonly waves: ReadonlySet<Wave>,
        /** Boss 波判定：返回 true 时仅激活 isBoss 波，普通波暂停刷怪。 */
        private readonly isBossWave: (index: number) => boolean = () => false,
    ) { }

    public switchTo(index: number): void {
        if (!Number.isInteger(index) || index < 0) {
            throw new RangeError("Wave index must be a non-negative integer.");
        }

        this.currentIndex = index;
        this.queueEnemies();
        this.spawnEnemies();
    }

    public update(): void {
        this.spawnEnemies();
    }

    public hasPendingEnemies(): boolean {
        for (const wave of this.waves) {
            if (this.isSuitable(wave) && wave.spawnProgress >= 100) {
                return true;
            }
        }

        return false;
    }

    private queueEnemies(): void {
        for (const wave of this.waves) {
            if (this.isSuitable(wave)) {
                wave.spawnProgress += wave.spawnValue;
            }
        }
    }

    private spawnEnemies(): void {
        let enemyCount = this.world.entities.filter(
            (entity) => entity.active && entity instanceof Enemy,
        ).length;
        const suitableWaves = [...this.waves].filter(
            (wave) => this.isSuitable(wave),
        );

        if (suitableWaves.length === 0) {
            return;
        }

        while (enemyCount < WaveSystem.maxEnemyCount) {
            let spawnedInThisPass = false;
            const passStartIndex = this.nextWaveIndex % suitableWaves.length;

            for (let offset = 0; offset < suitableWaves.length; offset += 1) {
                const waveIndex = (passStartIndex + offset) % suitableWaves.length;
                const wave = suitableWaves[waveIndex];

                if (wave.spawnProgress < 100) {
                    continue;
                }

                const enemy = wave.spawnEnemy();

                for (
                    let upgradeCount = 0;
                    upgradeCount < this.currentIndex;
                    upgradeCount += 1
                ) {
                    enemy.upgrade();
                }

                this.world.addEntity(enemy);
                wave.spawnProgress -= 100;
                enemyCount += 1;
                spawnedInThisPass = true;
                this.nextWaveIndex = (waveIndex + 1) % suitableWaves.length;

                if (enemyCount >= WaveSystem.maxEnemyCount) {
                    return;
                }
            }

            if (!spawnedInThisPass) {
                return;
            }
        }
    }

    private isSuitable(wave: Wave): boolean {
        const bossActive = this.isBossWave(this.currentIndex);

        if (wave.isBoss === true) {
            return bossActive && this.currentIndex >= wave.startIndex;
        }

        return !bossActive
            && this.currentIndex >= wave.startIndex
            && this.currentIndex <= wave.endIndex;
    }
}
