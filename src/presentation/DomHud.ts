import { SKILL_ENERGY_MAX } from '../config/constants';
import type { GameState } from '../core/GameState';

export class DomHud {
    private get(id: string): HTMLElement | null { return document.getElementById(id); }
    update(state: GameState): void {
        const values: Record<string, string> = { statScore: String(state.score), statLives: String(state.player.lives), statLevel: String(state.level), statEnergy: `${Math.round(state.energy)}/${SKILL_ENERGY_MAX}`, statBulletCount: String(state.player.bulletCount), statAtkSpeed: state.player.attackSpeed.toFixed(2), statBulletSpeed: (state.player.bulletSpeed / 60).toFixed(1), statEnergyRegen: state.player.energyEfficiency.toFixed(2), statPierce: `${Math.round(state.player.pierceChance * 100)}%`, statRicochet: `${Math.round(state.player.ricochetChance * 100)}%`, statOverloadRicochet: String(state.player.overdriveRicochets) };
        Object.entries(values).forEach(([id, value]) => { const element = this.get(id); if (element) element.textContent = value; });
        this.get('skillButton')?.classList.toggle('ready', state.energy >= SKILL_ENERGY_MAX);
        this.status('overdrive', state.overdrive ? '⚡⚡⚡ 超频运转！' : '超频进度', state.overdrive ? 100 : state.perfectParries * 20, state.overdrive ? '激活' : `${state.perfectParries}/5`, state.overdrive ? 'overdrive' : 'parry');
        const shieldRemaining = Math.max(0, state.player.shieldUntil - state.elapsed);
        this.status('shield', state.player.shieldHits ? `🛡️ 护盾激活 (${state.player.shieldHits}次)` : '护盾未激活', shieldRemaining / 30 * 100, state.player.shieldHits ? `${shieldRemaining.toFixed(1)}s` : '--', 'shield');
        const parryAge = state.player.parryStartedAt === null ? 0 : state.elapsed - state.player.parryStartedAt;
        this.status('parry', state.player.parryStartedAt === null ? '格挡就绪' : parryAge < 1 ? '⭐ 完美格挡' : '⚡ 格挡中', state.player.parryStartedAt === null ? 0 : Math.max(0, 100 - parryAge / (3 * state.player.energyEfficiency) * 100), state.player.parryStartedAt === null ? '按K' : `${Math.max(0, 3 * state.player.energyEfficiency - parryAge).toFixed(1)}s`, parryAge < 1 ? 'parry-perfect' : 'parry');
    }
    showGameOver(score: number): void { const scoreElement = this.get('finalScore'); if (scoreElement) scoreElement.textContent = String(score); const overlay = this.get('gameOver'); if (overlay) overlay.style.display = 'block'; }
    setStarted(started: boolean): void { const menu = this.get('startMenu'); if (menu) menu.style.display = started ? 'none' : 'flex'; const over = this.get('gameOver'); if (over && started) over.style.display = 'none'; }
    private status(prefix: string, label: string, percent: number, text: string, className: string): void { const labelEl = this.get(`${prefix}Label`); const bar = this.get(`${prefix}Bar`); const textEl = this.get(`${prefix}Text`); if (labelEl) labelEl.textContent = label; if (bar) { bar.style.width = `${percent}%`; bar.className = `progress-bar ${percent > 0 ? className : 'inactive'}`; } if (textEl) textEl.textContent = text; }
}
