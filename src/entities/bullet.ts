import { BaseEntity } from "../core/entity";

export type BulletFaction = "player" | "enemy";

export abstract class Bullet extends BaseEntity {
    public damage: number = 0;
    public faction: BulletFaction = "player";
    public remainingLifetime: number = 0;

    public abstract override getEntityType(): "bullet";
}
