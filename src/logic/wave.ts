import type { Enemy } from "../entities/enemy";

export interface Wave {
    readonly startIndex: number;
    readonly endIndex: number;
    readonly spawnValue: number;
    spawnProgress: number;
    /** Boss 波标记：仅在波次系统判定当前为 Boss 波时激活（普通波反之暂停）。 */
    readonly isBoss?: boolean;

    spawnEnemy(): Enemy;
}
