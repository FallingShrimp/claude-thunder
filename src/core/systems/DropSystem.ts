import type { Enemy } from '../entities/Enemy';
import type { PowerUpType } from '../types';

const regularTypes: PowerUpType[] = ['multishot', 'atkspeed', 'shield', 'bulletspeed', 'movespeed', 'ricochet', 'energyregen', 'pierce'];

export class DropSystem {
    regularDrop(enemy: Enemy): PowerUpType | null {
        if (!enemy.options.guaranteedDrop && Math.random() >= 0.4) return null;
        const types = [...regularTypes];
        const healWeight = enemy.type === 'sentry' ? 2 : 1;
        for (let index = 0; index < healWeight; index++) types.push('heal');
        return types[Math.floor(Math.random() * types.length)] ?? null;
    }

    bossDrops(): PowerUpType[] {
        return [...regularTypes, 'overloadricochet', 'heal', 'heal', 'heal'];
    }
}
