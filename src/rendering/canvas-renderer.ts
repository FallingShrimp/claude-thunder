import { BaseEnvironment } from "../core/environment";
import type { RenderableTarget } from "../core/renderable-target";
import { Healthbar } from "../entities/healthbar";
import type { Renderer } from "./renderer";

export class CanvasRenderer implements Renderer {
    private readonly context: CanvasRenderingContext2D;

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

        for (const target of sortedTargets) {
            this.renderTarget(target);
        }
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

        if (target instanceof Healthbar) {
            this.renderHealthbar(target);
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
            context.beginPath();
            context.moveTo(-target.size.width / 2, -target.size.height / 2);
            context.lineTo(target.size.width / 2, -target.size.height / 2);
            context.lineTo(0, target.size.height / 2);
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
