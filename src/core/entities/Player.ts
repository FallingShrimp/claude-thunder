import { VIEWPORT } from '../../config/constants';
import { Entity } from './Entity';
import type { InputSnapshot } from '../types';

export class Player extends Entity {
    speed = 90;
    lives = 3;
    bulletCount = 1;
    attackSpeed = 1;
    bulletSpeed = 300;
    energyEfficiency = 1;
    pierceChance = 0;
    ricochetChance = 0;
    overdriveRicochets = 0;
    shieldHits = 0;
    shieldUntil = 0;
    parryStartedAt: number | null = null;
    parryCooldownUntil = 0;
    invincibleUntil = 0;
    tilt = 0;

    constructor() {
        super({ x: VIEWPORT.width / 2, y: VIEWPORT.height - 80 }, { x: 56, y: 56 });
    }

    updateWithInput(delta: number, input: InputSnapshot): void {
        let dx = Number(input.right) - Number(input.left);
        let dy = Number(input.down) - Number(input.up);
        if (input.pointer) {
            const px = input.pointer.x - this.position.x;
            const py = input.pointer.y - this.position.y;
            const distance = Math.hypot(px, py);
            if (distance > 5) { dx = px / distance; dy = py / distance; }
        }
        if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
        this.position.x += dx * this.speed * delta;
        this.position.y += dy * this.speed * delta;
        this.position.x = Math.max(this.size.x / 2, Math.min(VIEWPORT.width - this.size.x / 2, this.position.x));
        this.position.y = Math.max(this.size.y / 2, Math.min(VIEWPORT.height - this.size.y / 2, this.position.y));
        const target = dx < 0 ? -Math.PI / 6 : dx > 0 ? Math.PI / 6 : 0;
        this.tilt += (target - this.tilt) * Math.min(1, delta * 10);
    }

    update(): void { }

    reset(): void {
        Object.assign(this, new Player());
    }
}
