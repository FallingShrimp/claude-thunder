import { MAX_ENEMIES, VIEWPORT } from '../../config/constants';
import { Boss } from '../entities/Boss';
import { Enemy, type EnemyOptions } from '../entities/Enemy';

export class WaveSystem {
    remaining = 0;
    queued = 0;
    bossFight = false;
    highestBossDefeated = 0;
    private spawnClock = 0;

    start(level: number): Enemy[] {
        if (level % 5 === 0 && level > this.highestBossDefeated) {
            this.bossFight = true;
            return [new Boss(level)];
        }
        this.bossFight = false;
        this.remaining = 8 + level * 2;
        this.queued = this.remaining;
        this.spawnClock = 0;
        return [];
    }

    update(delta: number, level: number, enemyCount: number): Enemy | null {
        if (this.bossFight || this.queued <= 0 || enemyCount >= MAX_ENEMIES) return null;
        this.spawnClock += delta;
        const interval = Math.max(0.5, 1.5 - (level - 1) * 0.15);
        if (this.spawnClock < interval) return null;
        this.spawnClock = 0; this.queued--;
        return this.createEnemy(level);
    }

    get cleared(): boolean { return !this.bossFight && this.remaining <= 0 && this.queued <= 0; }

    private createEnemy(level: number): Enemy {
        const pool = level < 2 ? ['normal'] : level < 4 ? ['normal', 'fast'] : level < 6
            ? ['normal', 'fast', 'tank'] : ['normal', 'normal', 'fast', 'fast', 'tank', 'tank', 'tank', 'sentry'];
        const type = pool[Math.floor(Math.random() * pool.length)] as 'normal' | 'fast' | 'tank' | 'sentry';
        const normalHp = Math.floor(1.5 ** level);
        const configs: Record<typeof type, Omit<EnemyOptions, 'type' | 'x' | 'y'>> = {
            normal: { width: 40, height: 40, hp: normalHp, speed: 36 + level * 4.8, color: '#e74c3c', score: 10, shootInterval: 2.5 },
            fast: { width: 30, height: 30, hp: Math.floor(1.5 ** (level - 1)), speed: 72 + level * 7.2, color: '#e67e22', score: 20, shootInterval: 2.5 },
            tank: { width: 52, height: 52, hp: normalHp * 2, speed: 24 + level * 2.4, color: '#8e44ad', score: 40, shootInterval: 2.5 },
            sentry: { width: 58, height: 58, hp: normalHp * 3, speed: 0, color: '#16a085', score: 80, shootInterval: 1.25, aimed: true, guaranteedDrop: true },
        };
        const cfg = configs[type];
        return new Enemy({ type, x: Math.random() * (VIEWPORT.width - cfg.width) + cfg.width / 2, y: type === 'sentry' ? cfg.height / 2 + 18 : -cfg.height, ...cfg });
    }
}
