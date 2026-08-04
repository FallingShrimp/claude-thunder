export const VIEWPORT = { width: 480, height: 700 } as const;
export const SKILL_ENERGY_MAX = 100;
export const BASE_SHOOT_INTERVAL = 400;
export const MAX_ENEMIES = 5;
export const PERFECT_PARRY_WINDOW = 1;
export const BASE_PARRY_WINDOW = 3;
export const BOSS_INTERVAL = 5;

export const ASSETS = {
    player: 'assets/textures/claude.png',
    bgm: 'assets/sounds/Another Disaster.mp3',
    perfectParry: 'assets/sounds/perfect-parry.wav',
    parry: 'assets/sounds/unexact-parry.wav',
    powerup: 'assets/sounds/powerup.mp3',
    pew: 'assets/sounds/pew.wav',
    hurt: 'assets/sounds/hurt.wav',
    die: 'assets/sounds/die.wav',
} as const;
