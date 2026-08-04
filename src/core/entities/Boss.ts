import { VIEWPORT } from '../../config/constants';
import { Enemy } from './Enemy';

export class Boss extends Enemy {
    private abilityClock = 0;
    private radialClock = 0;

    constructor(level: number) {
        const hp = Math.floor(80 * 1.35 ** (level - 5));
        super({ type: 'boss', x: VIEWPORT.width / 2, y: 100, width: 90, height: 90, hp, speed: 24, color: '#ff0040', score: 500, shootInterval: 2 });
    }

    override update(delta: number): void {
        this.position.x += this.options.speed * this.direction * delta;
        if (this.position.x < this.size.x / 2 || this.position.x > VIEWPORT.width - this.size.x / 2) {
            this.direction *= -1;
            this.position.x = Math.max(this.size.x / 2, Math.min(VIEWPORT.width - this.size.x / 2, this.position.x));
        }
        this.abilityClock += delta;
        this.radialClock += delta;
    }

    consumeAimedAttack(): boolean {
        if (this.abilityClock < 2) return false;
        this.abilityClock = 0;
        return true;
    }

    consumeRadialAttack(): boolean {
        if (this.radialClock < 5) return false;
        this.radialClock = 0;
        return true;
    }
}
