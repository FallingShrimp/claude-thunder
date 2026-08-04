import { Projectile } from './Projectile';

export class PlayerBullet extends Projectile {
    ricochets = 0;
    constructor(x: number, y: number, angle: number, speed: number, damage = 1) {
        super(x, y, { x: Math.sin(angle) * speed, y: -Math.cos(angle) * speed }, true, damage);
    }
}
