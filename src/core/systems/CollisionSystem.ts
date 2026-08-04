import { BASE_PARRY_WINDOW, PERFECT_PARRY_WINDOW } from '../../config/constants';
import { Explosion } from '../effects/Explosion';
import { Shockwave, Spark } from '../effects/Particles';
import type { GameState } from '../GameState';
import { PowerUp } from '../items/PowerUp';
import { PlayerBullet } from '../projectiles/PlayerBullet';
import { DropSystem } from './DropSystem';

export class CollisionSystem {
    constructor(private readonly drops = new DropSystem()) { }

    resolve(state: GameState): void {
        this.playerShots(state);
        this.playerHits(state);
        this.pickups(state);
    }

    private playerShots(state: GameState): void {
        const player = state.player;
        for (const shot of state.projectiles.filter(projectile => projectile.friendly && projectile.active)) {
            for (const enemy of state.enemies.filter(candidate => candidate.active)) {
                if (shot.hitIds.has(enemy.id) || !shot.intersects(enemy)) continue;
                shot.hitIds.add(enemy.id); enemy.hp -= shot.damage;
                state.addEnergy(1 / player.bulletCount);
                if (Math.random() >= player.pierceChance) shot.active = false;
                if (Math.random() < player.ricochetChance) {
                    const target = state.enemies.find(other => other.active && other.id !== enemy.id);
                    if (target) {
                        const angle = Math.atan2(target.position.x - shot.position.x, -(target.position.y - shot.position.y));
                        state.projectiles.push(new PlayerBullet(shot.position.x, shot.position.y, angle, player.bulletSpeed));
                    }
                }
                if (enemy.hp <= 0) this.destroyEnemy(state, enemy);
                if (!shot.active) break;
            }
        }
    }

    private destroyEnemy(state: GameState, enemy: import('../entities/Enemy').Enemy): void {
        enemy.active = false; state.score += enemy.options.score;
        state.explosions.push(new Explosion(enemy.position.x, enemy.position.y, enemy.isBoss || enemy.type === 'tank'));
        if (enemy.isBoss) {
            state.emit({ type: 'notify', text: '🏆 BOSS 击破！' });
            this.drops.bossDrops().forEach((type, index) => state.powerUps.push(new PowerUp(enemy.position.x + (index - 5) * 22, enemy.position.y, type)));
        } else {
            const drop = this.drops.regularDrop(enemy);
            if (drop) state.powerUps.push(new PowerUp(enemy.position.x, enemy.position.y, drop));
        }
    }

    private playerHits(state: GameState): void {
        const player = state.player;
        for (const threat of [...state.projectiles.filter(projectile => !projectile.friendly), ...state.enemies]) {
            if (!threat.active || !player.intersects(threat)) continue;
            threat.active = false;
            if (player.parryStartedAt !== null) {
                const elapsed = state.elapsed - player.parryStartedAt;
                if (elapsed < PERFECT_PARRY_WINDOW) {
                    state.emit({ type: 'sound', sound: 'perfectParry' });
                    state.emit({ type: 'notify', text: '⚡️完美格挡！' });
                    state.emit({ type: 'shake', intensity: 30, duration: 0.5 });
                    state.addEnergy(15); player.parryStartedAt = null; player.invincibleUntil = state.elapsed + 2;
                    state.perfectParries++;
                    if (state.perfectParries >= 5 && !state.overdrive) { state.overdrive = true; state.emit({ type: 'notify', text: '⚡⚡⚡超频运转！' }); }
                    this.parryEffects(state);
                    const count = state.overdrive ? player.bulletCount * 6 + 1 : player.bulletCount + 1;
                    for (let index = 0; index < count; index++) {
                        const target = state.enemies[index % Math.max(1, state.enemies.length)];
                        const angle = target ? Math.atan2(target.position.x - player.position.x, -(target.position.y - player.position.y)) : Math.random() * Math.PI * 2;
                        state.projectiles.push(new PlayerBullet(player.position.x, player.position.y, angle, player.bulletSpeed));
                    }
                    continue;
                }
                if (elapsed <= BASE_PARRY_WINDOW * player.energyEfficiency && Math.random() < 0.25) {
                    state.emit({ type: 'sound', sound: 'parry' }); state.emit({ type: 'notify', text: '🛡️格挡！' }); state.addEnergy(3); continue;
                }
            }
            if (player.shieldHits > 0 && state.elapsed < player.shieldUntil) { player.shieldHits--; this.resetOverdrive(state); continue; }
            if (state.elapsed < player.invincibleUntil) continue;
            player.lives--; player.invincibleUntil = state.elapsed + 2; player.position.x = 240; player.position.y = 620;
            state.explosions.push(new Explosion(player.position.x, player.position.y, true));
            state.emit({ type: 'sound', sound: 'hurt' }); state.emit({ type: 'notify', text: `💔受损，剩余${player.lives}点生命值！` });
            this.resetOverdrive(state); state.addEnergy(2);
            if (player.lives <= 0) { state.running = false; state.emit({ type: 'sound', sound: 'die' }); state.emit({ type: 'gameOver', score: state.score }); }
        }
    }

    private pickups(state: GameState): void {
        for (const item of state.powerUps) if (item.active && item.intersects(state.player)) {
            item.active = false; state.emit({ type: 'sound', sound: 'powerup' }); state.emit({ type: 'notify', text: item.apply(state.player, state.elapsed) });
        }
    }

    private resetOverdrive(state: GameState): void { state.overdrive = false; state.perfectParries = 0; }

    private parryEffects(state: GameState): void {
        state.shockwaves.push(new Shockwave(state.player.position.x, state.player.position.y));
        for (let index = 0; index < 18; index++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 2 / 3;
            const speed = Math.random() * 270 + 150;
            state.sparks.push(new Spark(state.player.position.x, state.player.position.y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 3 + 1, '#aaffff', Math.random() * 0.5 + 0.3));
        }
    }
}
