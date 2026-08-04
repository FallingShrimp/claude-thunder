export interface Vector2 { x: number; y: number }

export interface InputSnapshot {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    shoot: boolean;
    parry: boolean;
    skillPressed: boolean;
    pointer: Vector2 | null;
}

export type GameEvent =
    | { type: 'notify'; text: string }
    | { type: 'sound'; sound: 'pew' | 'powerup' | 'perfectParry' | 'parry' | 'hurt' | 'die' }
    | { type: 'shake'; intensity: number; duration: number }
    | { type: 'gameOver'; score: number };

export type PowerUpType = 'heal' | 'multishot' | 'atkspeed' | 'bulletspeed' | 'movespeed' | 'shield' | 'ricochet' | 'energyregen' | 'pierce' | 'overloadricochet';
export type EnemyType = 'normal' | 'fast' | 'tank' | 'sentry' | 'boss';
