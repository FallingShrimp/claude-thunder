export const GAME_AUDIO_SOURCES = {
    backgroundMusic: "./assets/audio/Another%20Disaster.mp3",
    die: "./assets/audio/die.wav",
    hurt: "./assets/audio/hurt.wav",
    perfectParry: "./assets/audio/perfect-parry.wav",
    pew: "./assets/audio/pew.wav",
    powerup: "./assets/audio/powerup.mp3",
    unexactParry: "./assets/audio/unexact-parry.wav",
} as const;

export const ALL_GAME_AUDIO_SOURCES: readonly string[] = Object.values(
    GAME_AUDIO_SOURCES,
);
