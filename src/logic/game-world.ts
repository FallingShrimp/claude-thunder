import type { BaseEntity } from "../core/entity";
import type { BaseEnvironment } from "../core/environment";
import { Healthbar } from "../entities/healthbar";
import { Plane } from "../entities/plane";
import { ParticleSystem } from "./systems/particle-system";

export class GameWorld {
    public elapsedTime: number = 0;
    public paused: boolean = false;
    public environment: BaseEnvironment | null = null;
    public readonly entities: BaseEntity[] = [];
    public readonly particles = new ParticleSystem();

    public addEntity(entity: BaseEntity): void {
        this.entities.push(entity);

        if (entity instanceof Plane && !this.hasHealthbar(entity)) {
            this.entities.push(new Healthbar(entity));
        }
    }

    private hasHealthbar(entity: Plane): boolean {
        return this.entities.some(
            (candidate) => candidate instanceof Healthbar
                && candidate.entity === entity,
        );
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
