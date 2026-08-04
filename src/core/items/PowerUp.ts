import type { Player } from '../entities/Player';
import type { PowerUpType } from '../types';
import { Entity } from '../entities/Entity';

export const POWER_UP_VIEW: Record<PowerUpType, { color: string; label: string }> = {
    heal: { color: '#ff4d6d', label: '❤️' }, multishot: { color: '#00e5ff', label: '⚔️' },
    atkspeed: { color: '#ffe600', label: '🔥' }, bulletspeed: { color: '#00ffcc', label: '🧨' },
    movespeed: { color: '#a78bfa', label: '🚀' }, shield: { color: '#7fff7f', label: '🛡️' },
    ricochet: { color: '#ff9ef7', label: '🔀' }, energyregen: { color: '#4dabf7', label: '🎈' },
    pierce: { color: '#b8f7ff', label: '🌀' }, overloadricochet: { color: '#ff4400', label: '⚡' },
};

export class PowerUp extends Entity {
    constructor(x: number, y: number, public readonly type: PowerUpType) {
        super({ x, y }, { x: 28, y: 28 });
    }

    update(delta: number): void { this.position.y += 90 * delta; }

    apply(player: Player, now: number): string {
        switch (this.type) {
            case 'heal': player.lives++; return '❤️ 生命值 +1';
            case 'multishot': player.bulletCount = Math.min(20, player.bulletCount + 1); return '⚔️ 多重射击 +1';
            case 'atkspeed': player.attackSpeed = Math.min(10, player.attackSpeed + 0.15); return '🔥 攻击速度 +15%';
            case 'bulletspeed': player.bulletSpeed = Math.min(2100, player.bulletSpeed + 15); return '🧨 子弹速度 +1';
            case 'movespeed': player.speed = Math.min(360, player.speed + 4.2); return '🚀 移动速度 +1';
            case 'shield': player.shieldHits = 1; player.shieldUntil = now + 30; return '🛡️ 力墙护盾已激活！';
            case 'ricochet': player.ricochetChance = Math.min(1, player.ricochetChance + 0.1); return '🔀 折射 +10%';
            case 'energyregen': player.energyEfficiency = Math.min(3, player.energyEfficiency + 0.05); return '🎈 能量再生效率 +5%';
            case 'pierce': player.pierceChance = Math.min(0.9, player.pierceChance + 0.05); return '🌀 穿透 +5%';
            case 'overloadricochet': player.overdriveRicochets++; return '🔦 超频反弹 +1';
        }
    }
}
