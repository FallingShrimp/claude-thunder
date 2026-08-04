import type { BaseEntity } from "../core/entity";

export interface SpawnContext {
    elapsedTime: number;
    difficulty: number;
    entityCount: number;
}

export interface SpawnRule {
    shouldSpawn(context: Readonly<SpawnContext>): boolean;
    createSpawnData(context: Readonly<SpawnContext>): BaseEntity;
}
