import { Projectile } from './Projectile';

export class EnemyBullet extends Projectile {
    constructor(x: number, y: number, angle: number, speed = 180) {
        super(x, y, { x: Math.sin(angle) * speed, y: -Math.cos(angle) * speed }, false);
    }
}
