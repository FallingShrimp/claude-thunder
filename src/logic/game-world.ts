import type { BaseEntity } from "../core/entity";

export class GameWorld {
    public elapsedTime: number = 0;
    public paused: boolean = false;
    public readonly entities: BaseEntity[] = [];

    public addEntity(entity: BaseEntity): void {
        this.entities.push(entity);
    }

    public removeInactiveEntities(): void {
        const activeEntities = this.entities.filter((entity) => entity.active);
        this.entities.length = 0;
        this.entities.push(...activeEntities);
    }
}
