import { BaseEnvironment } from "../core/environment";
import type { RenderableTarget } from "../core/renderable-target";
import { DamageLabel } from "../entities/damage-label";
import { CooldownBar } from "../entities/cooldown-bar";
import { Healthbar } from "../entities/healthbar";
import { Item } from "../entities/item";
import { BallThunderBullet } from "../game/bullets/ball-thunder-bullet";
import { LaserBullet } from "../game/bullets/laser-bullet";
import { ThunderBullet } from "../game/bullets/thunder-bullet";
import { PlayerPlane } from "../game/player-plane";
import { AssaultSummon } from "../game/summons/assault-summon";
import { SummonPlane } from "../game/summons/summon-plane";
import { ParticleSystem } from "../logic/systems/particle-system";
import { CameraShakeController } from "./camera-shake-controller";
import type { Renderer } from "./renderer";

export class CanvasRenderer implements Renderer {
    public readonly camera = new CameraShakeController();

    private readonly context: CanvasRenderingContext2D;
    private readonly itemAvatarCache = new Map<string, HTMLImageElement>();
    private readonly failedItemAvatars = new Set<string>();

    public constructor(private readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d");

        if (context === null) {
            throw new Error("Canvas 2D context is unavailable.");
        }

        this.context = context;
    }

    public clear(): void {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public render(targets: readonly RenderableTarget[]): void {
        const sortedTargets = [...targets]
            .filter((target) => target.visible)
            .sort((left, right) => left.zIndex - right.zIndex);

        this.context.save();
        this.context.translate(this.camera.offset.x, this.camera.offset.y);

        for (const target of sortedTargets) {
            this.renderTarget(target);
        }

        this.context.restore();
    }

    private renderTarget(target: RenderableTarget): void {
        const { context } = this;

        if (target instanceof BaseEnvironment) {
            context.save();
            context.globalAlpha = target.opacity;
            target.draw(context);
            context.restore();
            return;
        }

        if (target instanceof ParticleSystem) {
            target.draw(context);
            return;
        }

        if (target instanceof Healthbar) {
            this.renderHealthbar(target);
            return;
        }

        if (target instanceof CooldownBar) {
            this.renderCooldownBar(target);
            return;
        }

        if (target instanceof ThunderBullet) {
            this.renderThunder(target);
            return;
        }

        if (target instanceof LaserBullet) {
            this.renderLaser(target);
            return;
        }

        if (target instanceof BallThunderBullet) {
            this.renderBallThunder(target);
            return;
        }

        if (target instanceof DamageLabel) {
            this.renderDamageLabel(target);
            return;
        }

        if (target instanceof Item) {
            this.renderItem(target);
            return;
        }

        if (target instanceof SummonPlane) {
            this.renderSummon(target);
            return;
        }

        const centerX = target.position.x + target.size.width / 2;
        const centerY = target.position.y + target.size.height / 2;

        context.save();
        context.globalAlpha = target.opacity;
        context.fillStyle = target.appearance.color;
        context.translate(centerX, centerY);
        context.rotate(target.rotation);
        context.scale(target.scale.x, target.scale.y);

        if (target.appearance.shape === "ellipse") {
            context.beginPath();
            context.ellipse(
                0,
                0,
                target.size.width / 2,
                target.size.height / 2,
                0,
                0,
                Math.PI * 2,
            );
            context.fill();
        } else if (target.appearance.shape === "triangle") {
            // 所有具有方向性的形状都以局部坐标系的 +X 方向为零度朝向，
            // 从而让 rotation 与使用 cos/sin 计算出的移动方向保持一致。
            context.beginPath();
            context.moveTo(target.size.width / 2, 0);
            context.lineTo(-target.size.width / 2, -target.size.height / 2);
            context.lineTo(-target.size.width / 2, target.size.height / 2);
            context.closePath();
            context.fill();
        } else {
            context.fillRect(
                -target.size.width / 2,
                -target.size.height / 2,
                target.size.width,
                target.size.height,
            );
        }

        context.restore();

        if (target instanceof PlayerPlane && target.guarding) {
            this.renderPlayerShield(target);
        }
    }

    private renderSummon(summon: SummonPlane): void {
        const { context } = this;
        const centerX = summon.position.x + summon.size.width / 2;
        const centerY = summon.position.y + summon.size.height / 2;
        const halfWidth = summon.size.width / 2;
        const halfHeight = summon.size.height / 2;

        context.save();
        context.globalAlpha = summon.opacity;
        context.translate(centerX, centerY);
        context.rotate(summon.rotation);
        context.scale(summon.scale.x, summon.scale.y);

        if (summon.summonType === "gunner") {
            // 机枪手：细长三角 + 枪口亮点
            context.fillStyle = summon.appearance.color;
            context.beginPath();
            context.moveTo(halfWidth, 0);
            context.lineTo(-halfWidth, -halfHeight);
            context.lineTo(-halfWidth, halfHeight);
            context.closePath();
            context.fill();
            context.fillStyle = "#ffffff";
            context.beginPath();
            context.arc(halfWidth * 0.5, 0, 2.5, 0, Math.PI * 2);
            context.fill();
        } else if (summon.summonType === "cannon") {
            // 炮台：方块机身 + 炮管
            context.fillStyle = summon.appearance.color;
            context.fillRect(-halfWidth, -halfHeight, summon.size.width, summon.size.height);
            context.fillStyle = "#8a5a1a";
            context.fillRect(halfWidth * 0.2, -3, halfWidth * 0.9, 6);
            context.fillStyle = "#fff3d6";
            context.beginPath();
            context.arc(0, 0, 4, 0, Math.PI * 2);
            context.fill();
        } else {
            // 突击者：楔形箭头 + 冲刺尾焰
            const assaulting = summon instanceof AssaultSummon && summon.assaulting;
            context.fillStyle = summon.appearance.color;
            context.beginPath();
            context.moveTo(halfWidth, 0);
            context.lineTo(-halfWidth * 0.5, -halfHeight);
            context.lineTo(0, 0);
            context.lineTo(-halfWidth * 0.5, halfHeight);
            context.closePath();
            context.fill();

            if (assaulting) {
                context.fillStyle = "#ffd84d";
                context.beginPath();
                context.moveTo(-halfWidth * 0.5, 0);
                context.lineTo(-halfWidth - 6, -4);
                context.lineTo(-halfWidth - 6, 4);
                context.closePath();
                context.fill();
            }
        }

        context.restore();
    }

    private renderBallThunder(ball: BallThunderBullet): void {
        const { context } = this;
        const centerX = ball.position.x + ball.size.width / 2;
        const centerY = ball.position.y + ball.size.height / 2;
        const radius = ball.size.width / 2;

        context.save();
        context.globalAlpha = ball.opacity;
        context.translate(centerX, centerY);
        context.shadowColor = "#5defff";
        context.shadowBlur = 18;
        context.fillStyle = "#3ddfff";
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 7;
        context.fillStyle = "#efffff";
        context.beginPath();
        context.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "#dfffff";
        context.lineWidth = 1.5;

        for (let index = 0; index < 4; index++) {
            const angle = Math.random() * Math.PI * 2;
            const innerRadius = radius * 0.25;
            context.beginPath();
            context.moveTo(
                Math.cos(angle) * innerRadius,
                Math.sin(angle) * innerRadius,
            );
            context.lineTo(
                Math.cos(angle + 0.25) * radius * 0.7,
                Math.sin(angle + 0.25) * radius * 0.7,
            );
            context.lineTo(
                Math.cos(angle) * radius * 1.2,
                Math.sin(angle) * radius * 1.2,
            );
            context.stroke();
        }

        context.restore();
    }

    private renderThunder(thunder: ThunderBullet): void {
        const { context } = this;
        const segments = Math.max(2, Math.ceil(thunder.size.width / 24));
        const normalX = -Math.sin(thunder.rotation);
        const normalY = Math.cos(thunder.rotation);

        context.save();
        context.globalAlpha = thunder.opacity;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.shadowColor = "#5defff";
        context.shadowBlur = 14;
        context.strokeStyle = "#45dfff";
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(thunder.originX, thunder.originY);

        for (let index = 1; index < segments; index++) {
            const progress = index / segments;
            const jitter = (Math.random() - 0.5) * 18;
            context.lineTo(
                thunder.originX + (thunder.endX - thunder.originX) * progress
                + normalX * jitter,
                thunder.originY + (thunder.endY - thunder.originY) * progress
                + normalY * jitter,
            );
        }

        context.lineTo(thunder.endX, thunder.endY);
        context.stroke();
        context.shadowBlur = 5;
        context.strokeStyle = "#f4ffff";
        context.lineWidth = 2;
        context.stroke();
        context.restore();
    }

    private renderLaser(laser: LaserBullet): void {
        const { context } = this;

        context.save();
        context.globalAlpha = laser.opacity;
        context.lineCap = "round";
        context.shadowColor = "#ff7ae0";
        context.shadowBlur = 14;
        context.strokeStyle = "#ff9ae8";
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(laser.originX, laser.originY);
        context.lineTo(laser.endX, laser.endY);
        context.stroke();
        context.shadowBlur = 4;
        context.strokeStyle = "#fff0fb";
        context.lineWidth = 1.6;
        context.stroke();
        context.restore();
    }

    /** 竖向冷却进度条：自下而上填充，满格表示冷却就绪。 */
    private renderCooldownBar(bar: CooldownBar): void {
        const { context } = this;
        const progress = Math.max(0, Math.min(1, bar.getProgress()));
        const filledHeight = bar.size.height * progress;

        context.save();
        context.globalAlpha = bar.opacity;
        context.fillStyle = bar.backgroundColor;
        context.fillRect(
            bar.position.x,
            bar.position.y,
            bar.size.width,
            bar.size.height,
        );
        context.fillStyle = bar.foregroundColor;
        context.fillRect(
            bar.position.x,
            bar.position.y + bar.size.height - filledHeight,
            bar.size.width,
            filledHeight,
        );
        context.restore();
    }

    private renderDamageLabel(label: DamageLabel): void {
        const { context } = this;

        context.save();
        context.globalAlpha = label.opacity;
        context.fillStyle = label.appearance.color;
        context.font = "20px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
            `${label.prefix}${Math.round(label.damage)}${label.suffix}`,
            label.position.x + label.size.width / 2,
            label.position.y + label.size.height / 2,
        );
        context.restore();
    }

    private renderItem(item: Item): void {
        const { context } = this;
        const centerX = item.position.x + item.size.width / 2;
        const centerY = item.position.y + item.size.height / 2;
        const avatarSize = Math.min(72, item.size.width - 16);
        const avatarX = -avatarSize / 2;
        const avatarY = -item.size.height / 2 + item.size.height * 0.08;
        const titleFontSize = Math.max(11, Math.round(item.size.width * 0.125));

        context.save();
        context.globalAlpha = item.opacity;
        context.translate(centerX, centerY);
        context.rotate(item.rotation);
        context.scale(item.scale.x, item.scale.y);
        context.fillStyle = item.appearance.color;
        context.fillRect(
            -item.size.width / 2,
            -item.size.height / 2,
            item.size.width,
            item.size.height,
        );
        context.fillStyle = "rgba(0, 0, 0, 0.25)";
        context.fillRect(avatarX, avatarY, avatarSize, avatarSize);

        const avatar = this.getItemAvatar(item.avatarSource);

        if (avatar !== undefined && avatar.complete && avatar.naturalWidth > 0) {
            const scale = Math.min(
                avatarSize / avatar.naturalWidth,
                avatarSize / avatar.naturalHeight,
            );
            const width = avatar.naturalWidth * scale;
            const height = avatar.naturalHeight * scale;
            context.drawImage(
                avatar,
                -width / 2,
                avatarY + (avatarSize - height) / 2,
                width,
                height,
            );
        }

        context.fillStyle = "#ffffff";
        context.font = `${titleFontSize}px sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
            item.displayName,
            0,
            avatarY + avatarSize + titleFontSize * 1.6,
            item.size.width - 8,
        );
        context.restore();
    }

    private getItemAvatar(source: string): HTMLImageElement | undefined {
        if (source.length === 0 || this.failedItemAvatars.has(source)) {
            return undefined;
        }

        const cached = this.itemAvatarCache.get(source);

        if (cached !== undefined) {
            return cached;
        }

        const image = new Image();
        image.addEventListener("error", () => {
            this.itemAvatarCache.delete(source);
            this.failedItemAvatars.add(source);
        }, { once: true });
        image.src = source;
        this.itemAvatarCache.set(source, image);
        return image;
    }

    private renderPlayerShield(player: PlayerPlane): void {
        const { context } = this;
        const centerX = player.position.x + player.size.width / 2;
        const centerY = player.position.y + player.size.height / 2;
        const radius = Math.max(player.size.width, player.size.height) * 0.72;
        const perfect = player.guardElapsed <= PlayerPlane.perfectParryDuration;
        const pulse = 1 + Math.sin(player.guardElapsed * 18) * 0.04;

        context.save();
        context.translate(centerX, centerY);
        context.scale(pulse, pulse);
        context.strokeStyle = perfect ? "#f8ffff" : "#5bbcff";
        context.shadowColor = perfect ? "#8fffff" : "#1677ff";
        context.shadowBlur = perfect ? 18 : 10;
        context.globalAlpha = perfect ? 0.95 : 0.65;
        context.lineWidth = perfect ? 4 : 3;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha *= 0.35;
        context.lineWidth = 9;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
    }

    private renderHealthbar(healthbar: Healthbar): void {
        const { context } = this;
        const foregroundWidth = healthbar.size.width
            * healthbar.foregroundProgress;
        const middleWidth = healthbar.size.width * healthbar.middleProgress;

        context.save();
        context.globalAlpha = healthbar.opacity;
        context.translate(healthbar.position.x, healthbar.position.y);
        context.rotate(healthbar.rotation);
        context.scale(healthbar.scale.x, healthbar.scale.y);
        context.fillStyle = healthbar.backgroundColor;
        context.fillRect(0, 0, healthbar.size.width, healthbar.size.height);
        context.fillStyle = healthbar.middleColor;
        context.fillRect(0, 0, middleWidth, healthbar.size.height);
        context.fillStyle = healthbar.foregroundColor;
        context.fillRect(0, 0, foregroundWidth, healthbar.size.height);
        context.restore();
    }
}
