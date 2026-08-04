import { SKILL_ENERGY_MAX, VIEWPORT } from '../config/constants';
import type { GameState } from '../core/GameState';
import { POWER_UP_VIEW } from '../core/items/PowerUp';
import { HomingMissile } from '../core/projectiles/HomingMissile';
import type { GameAssets } from '../infrastructure/AssetLoader';

export class CanvasRenderer {
    private shakeIntensity = 0; private shakeUntil = 0;
    constructor(private readonly canvas: HTMLCanvasElement, private readonly ctx: CanvasRenderingContext2D, private readonly assets: GameAssets) { }
    shake(intensity: number, duration: number): void { this.shakeIntensity = intensity; this.shakeUntil = performance.now() + duration * 1000; }
    render(state: GameState): void {
        const ctx = this.ctx; ctx.save();
        if (performance.now() < this.shakeUntil) ctx.translate((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
        ctx.fillStyle = '#050a1a'; ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height); this.stars(state.elapsed);
        state.enemies.forEach(enemy => { ctx.save(); ctx.shadowColor = enemy.color; ctx.shadowBlur = enemy.isBoss ? 24 : 10; ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.moveTo(enemy.position.x, enemy.position.y + enemy.size.y / 2); ctx.lineTo(enemy.position.x - enemy.size.x / 2, enemy.position.y - enemy.size.y / 2); ctx.lineTo(enemy.position.x, enemy.position.y - enemy.size.y / 4); ctx.lineTo(enemy.position.x + enemy.size.x / 2, enemy.position.y - enemy.size.y / 2); ctx.closePath(); ctx.fill(); this.health(enemy.position.x, enemy.position.y - enemy.size.y / 2 - 10, enemy.size.x, enemy.hp / enemy.maxHp); ctx.restore(); });
        state.projectiles.forEach(projectile => { ctx.save(); ctx.translate(projectile.position.x, projectile.position.y); ctx.rotate(projectile.angle); ctx.fillStyle = projectile.friendly ? projectile instanceof HomingMissile ? '#ffe066' : '#d97706' : '#e74c3c'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fillRect(-3, -10, 6, 20); ctx.restore(); });
        state.powerUps.forEach(item => { const view = POWER_UP_VIEW[item.type]; ctx.save(); ctx.strokeStyle = view.color; ctx.shadowColor = view.color; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(item.position.x, item.position.y, 14, 0, Math.PI * 2); ctx.stroke(); ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(view.label, item.position.x, item.position.y); ctx.restore(); });
        const player = state.player; ctx.save(); ctx.translate(player.position.x, player.position.y); ctx.rotate(player.tilt); ctx.shadowColor = '#d97706'; ctx.shadowBlur = 18; if (this.assets.playerImage.complete && this.assets.playerImage.naturalWidth) ctx.drawImage(this.assets.playerImage, -player.size.x / 2, -player.size.y / 2, player.size.x, player.size.y); else { ctx.fillStyle = '#d97706'; ctx.fillRect(-20, -20, 40, 40); } ctx.restore();
        if (player.shieldHits) { ctx.strokeStyle = '#7fff7f'; ctx.beginPath(); ctx.arc(player.position.x, player.position.y, 38, 0, Math.PI * 2); ctx.stroke(); }
        state.explosions.forEach(effect => effect.particles.forEach(particle => { ctx.globalAlpha = 1 - effect.progress; ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(effect.x + particle.dx * effect.age, effect.y + particle.dy * effect.age, particle.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }));
        state.sparks.forEach(spark => { ctx.globalAlpha = spark.life; ctx.fillStyle = spark.color; ctx.fillRect(spark.x, spark.y, spark.radius, spark.radius); ctx.globalAlpha = 1; });
        state.shockwaves.forEach(wave => { ctx.globalAlpha = wave.life; ctx.strokeStyle = '#aaffff'; ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; });
        this.hud(state); ctx.restore();
    }
    private stars(time: number): void { const ctx = this.ctx; for (let index = 0; index < 100; index++) { const x = (index * 83) % VIEWPORT.width; const y = (index * 47 + time * (10 + index % 30)) % VIEWPORT.height; ctx.fillStyle = `rgba(255,255,255,${0.3 + index % 7 / 10})`; ctx.fillRect(x, y, 1 + index % 2, 1 + index % 2); } }
    private health(x: number, y: number, width: number, ratio: number): void { this.ctx.fillStyle = '#333'; this.ctx.fillRect(x - width / 2, y, width, 5); this.ctx.fillStyle = ratio > .5 ? '#2ecc71' : ratio > .25 ? '#f39c12' : '#e74c3c'; this.ctx.fillRect(x - width / 2, y, width * Math.max(0, ratio), 5); }
    private hud(state: GameState): void { const ctx = this.ctx; ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(`❤️ ${state.player.lives}`, 15, VIEWPORT.height - 20); const x = VIEWPORT.width / 2, y = VIEWPORT.height - 50; ctx.strokeStyle = state.energy >= SKILL_ENERGY_MAX ? '#ffe066' : '#666'; ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.stroke(); ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🚀', x, y + 7); const now = state.elapsed; state.notifications.forEach((note, index) => { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ffe066'; ctx.fillText(note.text, VIEWPORT.width / 2, VIEWPORT.height - 90 - index * 24); }); void now; }
}
