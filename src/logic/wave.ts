import type { Enemy } from "../entities/enemy";

export interface Wave {
    readonly startIndex: number;
    readonly endIndex: number;
    readonly spawnValue: number;
    spawnProgress: number;

    spawnEnemy(): Enemy;
}
