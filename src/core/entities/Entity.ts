import type { Vector2 } from '../types';

let nextId = 1;

export abstract class Entity {
    readonly id = nextId++;
    active = true;

    constructor(
        public position: Vector2,
        public size: Vector2,
    ) { }

    abstract update(delta: number): void;

    intersects(other: Entity): boolean {
        return Math.abs(this.position.x - other.position.x) < (this.size.x + other.size.x) / 2
            && Math.abs(this.position.y - other.position.y) < (this.size.y + other.size.y) / 2;
    }
}
