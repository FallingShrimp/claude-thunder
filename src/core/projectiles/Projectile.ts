import { Entity } from '../entities/Entity';

export class Projectile extends Entity {
    readonly hitIds = new Set<number>();

    constructor(
        x: number,
        y: number,
        public velocity: { x: number; y: number },
        public readonly friendly: boolean,
        public readonly damage = 1,
    ) {
        super({ x, y }, { x: 6, y: 20 });
    }

    update(delta: number): void {
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
    }

    get angle(): number { return Math.atan2(this.velocity.x, -this.velocity.y); }
}
