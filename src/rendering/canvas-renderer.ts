import { BaseEnvironment } from "../core/environment";
import type { RenderableTarget } from "../core/renderable-target";
import { DamageLabel } from "../entities/damage-label";
import { Healthbar } from "../entities/healthbar";
import { Item } from "../entities/item";
import { PlayerPlane } from "../game/player-plane";
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

        if (target instanceof DamageLabel) {
            this.renderDamageLabel(target);
            return;
        }

        if (target instanceof Item) {
            this.renderItem(target);
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
        const avatarY = -item.size.height / 2 + 10;

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
        context.font = "12px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
            item.displayName,
            0,
            avatarY + avatarSize + 20,
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
