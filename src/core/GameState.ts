import { SKILL_ENERGY_MAX, VIEWPORT } from '../config/constants';
import { Explosion } from './effects/Explosion';
import { Shockwave, Spark } from './effects/Particles';
import { Enemy } from './entities/Enemy';
import { Player } from './entities/Player';
import { PowerUp } from './items/PowerUp';
import { Projectile } from './projectiles/Projectile';
import type { GameEvent } from './types';

export interface Notification { text: string; bornAt: number }

export class GameState {
    readonly player = new Player();
    enemies: Enemy[] = [];
    projectiles: Projectile[] = [];
    powerUps: PowerUp[] = [];
    explosions: Explosion[] = [];
    sparks: Spark[] = [];
    shockwaves: Shockwave[] = [];
    notifications: Notification[] = [];
    events: GameEvent[] = [];
    score = 0;
    level = 1;
    energy = 0;
    running = false;
    overdrive = false;
    perfectParries = 0;
    elapsed = 0;

    reset(): void {
        this.player.reset();
        this.enemies = []; this.projectiles = []; this.powerUps = [];
        this.explosions = []; this.sparks = []; this.shockwaves = [];
        this.notifications = []; this.events = [];
        this.score = 0; this.level = 1; this.energy = 0; this.elapsed = 0;
        this.running = true; this.overdrive = false; this.perfectParries = 0;
    }

    emit(event: GameEvent): void {
        this.events.push(event);
        if (event.type === 'notify') this.notifications.push({ text: event.text, bornAt: this.elapsed });
    }

    addEnergy(amount: number): void {
        const wasReady = this.energy >= SKILL_ENERGY_MAX;
        this.energy = Math.min(SKILL_ENERGY_MAX, this.energy + amount * this.player.energyEfficiency * (this.overdrive ? 2 : 1));
        if (!wasReady && this.energy >= SKILL_ENERGY_MAX) this.emit({ type: 'notify', text: '🌟弹射陨星 已就绪！' });
    }

    cleanup(): void {
        this.projectiles = this.projectiles.filter(projectile => projectile.active
            && projectile.position.x > -50 && projectile.position.x < VIEWPORT.width + 50
            && projectile.position.y > -50 && projectile.position.y < VIEWPORT.height + 50);
        this.powerUps = this.powerUps.filter(item => item.active && item.position.y < VIEWPORT.height + 40);
        this.enemies = this.enemies.filter(enemy => enemy.active);
        this.explosions = this.explosions.filter(effect => effect.active);
        this.sparks = this.sparks.filter(effect => effect.life > 0);
        this.shockwaves = this.shockwaves.filter(effect => effect.life > 0);
        this.notifications = this.notifications.filter(note => this.elapsed - note.bornAt < 2.2);
    }
}
