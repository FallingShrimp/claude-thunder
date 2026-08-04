import type { EnemyType } from '../types';
import { Entity } from './Entity';

export interface EnemyOptions {
    type: EnemyType;
    x: number;
    y: number;
    width: number;
    height: number;
    hp: number;
    speed: number;
    color: string;
    score: number;
    shootInterval: number;
    aimed?: boolean;
    guaranteedDrop?: boolean;
}

export class Enemy extends Entity {
    readonly maxHp: number;
    lastShotAt = 0;
    direction = 1;

    constructor(public readonly options: EnemyOptions) {
        super({ x: options.x, y: options.y }, { x: options.width, y: options.height });
        this.maxHp = options.hp;
    }

    get type(): EnemyType { return this.options.type; }
    get hp(): number { return this.options.hp; }
    set hp(value: number) { this.options.hp = value; }
    get color(): string { return this.options.color; }
    get isBoss(): boolean { return this.type === 'boss'; }

    update(delta: number): void {
        if (!this.isBoss) this.position.y += this.options.speed * delta;
    }
}
