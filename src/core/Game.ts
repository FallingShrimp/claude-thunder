import { BASE_PARRY_WINDOW, BASE_SHOOT_INTERVAL, SKILL_ENERGY_MAX, VIEWPORT } from '../config/constants';
import { Boss } from './entities/Boss';
import { GameState } from './GameState';
import { EnemyBullet } from './projectiles/EnemyBullet';
import { HomingMissile } from './projectiles/HomingMissile';
import { PlayerBullet } from './projectiles/PlayerBullet';
import { CollisionSystem } from './systems/CollisionSystem';
import { WaveSystem } from './systems/WaveSystem';
import type { GameEvent, InputSnapshot } from './types';

export class Game {
    readonly state = new GameState();
    private readonly waves = new WaveSystem();
    private readonly collisions = new CollisionSystem();
    private shotClock = 0;
    private skillWasPressed = false;

    start(): void {
        this.state.reset(); this.shotClock = 0; this.skillWasPressed = false;
        this.state.enemies.push(...this.waves.start(1));
    }

    update(delta: number, input: InputSnapshot): void {
        const state = this.state;
        if (!state.running) return;
        delta = Math.min(delta, 0.05); state.elapsed += delta; this.shotClock += delta;
        state.player.updateWithInput(delta, input);
        this.updateParry(input);
        this.updateShooting(input);
        this.updateEnemies(delta);
        for (const projectile of state.projectiles) {
            if (projectile instanceof HomingMissile) projectile.updateHoming(delta, state.enemies);
            else projectile.update(delta);
            if (projectile instanceof PlayerBullet && state.overdrive) this.ricochetAtBounds(projectile);
        }
        state.powerUps.forEach(item => item.update(delta));
        state.explosions.forEach(effect => effect.update(delta));
        state.sparks.forEach(effect => effect.update(delta));
        state.shockwaves.forEach(effect => effect.update(delta));
        this.collisions.resolve(state);
        this.progressWaves(delta);
        state.cleanup();
    }

    drainEvents(): GameEvent[] { return this.state.events.splice(0); }

    private updateParry(input: InputSnapshot): void {
        const { player } = this.state;
        if (input.parry && player.parryStartedAt === null && this.state.elapsed >= player.parryCooldownUntil) player.parryStartedAt = this.state.elapsed;
        if (!input.parry && player.parryStartedAt !== null) { player.parryStartedAt = null; player.parryCooldownUntil = this.state.elapsed + 0.5 / player.attackSpeed; }
        if (player.parryStartedAt !== null && this.state.elapsed - player.parryStartedAt > BASE_PARRY_WINDOW * player.energyEfficiency) {
            player.parryStartedAt = null; player.parryCooldownUntil = this.state.elapsed + 0.5 / player.attackSpeed;
        }
        if (player.shieldHits && this.state.elapsed >= player.shieldUntil) player.shieldHits = 0;
    }

    private updateShooting(input: InputSnapshot): void {
        const state = this.state; const player = state.player;
        if (input.shoot && this.shotClock >= BASE_SHOOT_INTERVAL / 1000 / player.attackSpeed) {
            const spacing = player.bulletCount > 1 ? Math.min(15, 100 / (player.bulletCount - 1)) : 0;
            for (let index = 0; index < player.bulletCount; index++) {
                const x = player.position.x - spacing * (player.bulletCount - 1) / 2 + spacing * index;
                state.projectiles.push(new PlayerBullet(x, player.position.y - player.size.y / 2, 0, player.bulletSpeed));
            }
            this.shotClock = 0; state.emit({ type: 'sound', sound: 'pew' });
        }
        if (input.skillPressed && !this.skillWasPressed && state.energy >= SKILL_ENERGY_MAX) {
            state.energy -= SKILL_ENERGY_MAX; const count = 5 + player.bulletCount;
            for (let index = 0; index < count; index++) {
                const ratio = count > 1 ? index / (count - 1) - 0.5 : 0;
                state.projectiles.push(new HomingMissile(player.position.x, player.position.y - player.size.y / 2, ratio * Math.PI / 3));
            }
            state.emit({ type: 'notify', text: '🌟 Fire！' });
        }
        this.skillWasPressed = input.skillPressed;
    }

    private updateEnemies(delta: number): void {
        const state = this.state;
        for (const enemy of state.enemies) {
            enemy.update(delta); enemy.lastShotAt += delta;
            if (enemy instanceof Boss) {
                if (enemy.consumeAimedAttack()) this.aimedShot(enemy.position.x, enemy.position.y);
                if (enemy.consumeRadialAttack()) for (let index = 0; index < 10; index++) state.projectiles.push(new EnemyBullet(enemy.position.x, enemy.position.y, index * Math.PI * 2 / 10 + Math.PI));
            } else if (enemy.lastShotAt >= enemy.options.shootInterval) {
                enemy.lastShotAt = 0;
                if (enemy.options.aimed) this.aimedShot(enemy.position.x, enemy.position.y);
                else state.projectiles.push(new EnemyBullet(enemy.position.x, enemy.position.y + enemy.size.y / 2, Math.PI, 180));
            }
            if (!enemy.isBoss && enemy.position.y > VIEWPORT.height + 60) { enemy.position.y = -enemy.size.y; enemy.position.x = Math.random() * (VIEWPORT.width - enemy.size.x) + enemy.size.x / 2; }
        }
    }

    private aimedShot(x: number, y: number): void {
        const player = this.state.player.position;
        this.state.projectiles.push(new EnemyBullet(x, y, Math.atan2(player.x - x, -(player.y - y)), 210));
    }

    private progressWaves(delta: number): void {
        const state = this.state;
        const spawned = this.waves.update(delta, state.level, state.enemies.filter(enemy => enemy.active).length);
        if (spawned) state.enemies.push(spawned);
        const living = state.enemies.filter(enemy => enemy.active);
        this.waves.remaining = living.filter(enemy => !enemy.isBoss).length + this.waves.queued;
        if (this.waves.bossFight && living.every(enemy => !enemy.isBoss)) { this.waves.bossFight = false; this.waves.highestBossDefeated = state.level; state.level++; state.enemies.push(...this.waves.start(state.level)); }
        else if (this.waves.cleared && living.length === 0) { state.level++; state.enemies.push(...this.waves.start(state.level)); const distance = Math.ceil(state.level / 5) * 5 - state.level; if (distance > 0) state.emit({ type: 'notify', text: `🎯 距离 Boss 还有 ${distance} 关` }); }
    }

    private ricochetAtBounds(projectile: PlayerBullet): void {
        if (projectile.ricochets >= this.state.player.overdriveRicochets) return;
        if (projectile.position.x < 10 || projectile.position.x > VIEWPORT.width - 10) { projectile.velocity.x *= -1; projectile.position.x = Math.max(20, Math.min(VIEWPORT.width - 20, projectile.position.x)); projectile.ricochets++; }
        else if (projectile.position.y < 10 || projectile.position.y > VIEWPORT.height - 10) { projectile.velocity.y *= -1; projectile.position.y = Math.max(20, Math.min(VIEWPORT.height - 20, projectile.position.y)); projectile.ricochets++; }
    }
}
