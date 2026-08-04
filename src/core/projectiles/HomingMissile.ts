import type { Enemy } from '../entities/Enemy';
import { PlayerBullet } from './PlayerBullet';

export class HomingMissile extends PlayerBullet {
    readonly missile = true;
    private angleValue: number;

    constructor(x: number, y: number, angle: number) {
        super(x, y, angle, 390, 5);
        this.angleValue = angle;
        this.size = { x: 16, y: 24 };
    }

    updateHoming(delta: number, enemies: readonly Enemy[]): void {
        const target = enemies.reduce<Enemy | undefined>((nearest, enemy) => {
            if (!nearest) return enemy;
            return this.distanceSquared(enemy) < this.distanceSquared(nearest) ? enemy : nearest;
        }, undefined);
        if (target) {
            const desired = Math.atan2(target.position.x - this.position.x, -(target.position.y - this.position.y));
            const difference = Math.atan2(Math.sin(desired - this.angleValue), Math.cos(desired - this.angleValue));
            this.angleValue += Math.max(-0.14, Math.min(0.14, difference)) * delta * 60;
        }
        const speed = 390;
        this.velocity.x = Math.sin(this.angleValue) * speed;
        this.velocity.y = -Math.cos(this.angleValue) * speed;
        this.update(delta);
    }

    private distanceSquared(enemy: Enemy): number {
        return (enemy.position.x - this.position.x) ** 2 + (enemy.position.y - this.position.y) ** 2;
    }
}
