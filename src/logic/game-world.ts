import type { BaseEntity } from "../core/entity";
import type { BaseEnvironment } from "../core/environment";

export class GameWorld {
    public elapsedTime: number = 0;
    public paused: boolean = false;
    public environment: BaseEnvironment | null = null;
    public readonly entities: BaseEntity[] = [];

    public addEntity(entity: BaseEntity): void {
        this.entities.push(entity);
    }

    public setEnvironment(environment: BaseEnvironment): void {
        this.environment = environment;
    }

    public removeInactiveEntities(): void {
        const activeEntities = this.entities.filter((entity) => entity.active);
        this.entities.length = 0;
        this.entities.push(...activeEntities);
    }
}
