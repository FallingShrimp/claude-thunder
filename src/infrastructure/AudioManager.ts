import { ASSETS } from '../config/constants';
import type { GameEvent } from '../core/types';

export class AudioManager {
    private readonly bgm = new Audio(ASSETS.bgm);
    private readonly sounds = {
        powerup: new Audio(ASSETS.powerup), perfectParry: new Audio(ASSETS.perfectParry),
        parry: new Audio(ASSETS.parry), hurt: new Audio(ASSETS.hurt), die: new Audio(ASSETS.die),
    };
    private readonly pew = Array.from({ length: 10 }, () => new Audio(ASSETS.pew));

    constructor() { this.bgm.loop = true; }
    async preload(): Promise<void> { await Promise.all([this.bgm, ...Object.values(this.sounds), ...this.pew.slice(0, 1)].map(audio => this.load(audio))); }
    startMusic(): void { void this.bgm.play().catch(() => undefined); }
    stopMusic(): void { this.bgm.pause(); this.bgm.currentTime = 0; }
    handle(event: GameEvent): void {
        if (event.type !== 'sound') return;
        const audio = event.sound === 'pew' ? this.pew.find(item => item.paused || item.ended) ?? this.pew[0] : this.sounds[event.sound];
        if (!audio) return; audio.currentTime = 0; void audio.play().catch(() => undefined);
    }
    private load(audio: HTMLAudioElement): Promise<void> { return new Promise(resolve => { if (audio.readyState >= 3) return resolve(); audio.addEventListener('canplaythrough', () => resolve(), { once: true }); audio.addEventListener('error', () => resolve(), { once: true }); audio.load(); }); }
}
