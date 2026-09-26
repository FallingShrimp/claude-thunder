import { RenderableTarget } from "../../core/renderable-target";
import type { GameSystem } from "../game-system";
import type { GameWorld } from "../game-world";

export interface ParticleOptions {
    x: number;
    y: number;
    velocityX?: number;
    velocityY?: number;
    accelerationX?: number;
    accelerationY?: number;
    drag?: number;
    size?: number;
    endSize?: number;
    lifetime?: number;
    color?: string;
}

/**
 * A fixed-capacity, dense particle pool.
 *
 * Particles deliberately are not entities: they never enter GameWorld.entities,
 * receive IDs, create health bars, or participate in collision pair scans.
 * Numeric state lives in typed arrays and expired particles are removed in O(1)
 * by swapping in the final live particle.
 */
export class ParticleSystem extends RenderableTarget implements GameSystem {
    public readonly capacity: number;
    public activeCount: number = 0;

    private readonly x: Float32Array;
    private readonly y: Float32Array;
    private readonly velocityX: Float32Array;
    private readonly velocityY: Float32Array;
    private readonly accelerationX: Float32Array;
    private readonly accelerationY: Float32Array;
    private readonly drag: Float32Array;
    private readonly startSize: Float32Array;
    private readonly endSize: Float32Array;
    private readonly age: Float32Array;
    private readonly lifetime: Float32Array;
    private readonly colors: string[];
    private overwriteIndex: number = 0;

    public constructor(capacity: number = 2048) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new RangeError("Particle capacity must be a positive integer.");
        }

        super({ x: 0, y: 0 }, { width: 0, height: 0 }, { shape: "rectangle", color: "#ffffff" });
        this.capacity = capacity;
        this.zIndex = 150;
        this.x = new Float32Array(capacity);
        this.y = new Float32Array(capacity);
        this.velocityX = new Float32Array(capacity);
        this.velocityY = new Float32Array(capacity);
        this.accelerationX = new Float32Array(capacity);
        this.accelerationY = new Float32Array(capacity);
        this.drag = new Float32Array(capacity);
        this.startSize = new Float32Array(capacity);
        this.endSize = new Float32Array(capacity);
        this.age = new Float32Array(capacity);
        this.lifetime = new Float32Array(capacity);
        this.colors = new Array<string>(capacity).fill("#ffffff");
    }

    public emit(options: Readonly<ParticleOptions>): void {
        this.writeParticle(
            options.x,
            options.y,
            options.velocityX ?? 0,
            options.velocityY ?? 0,
            options.accelerationX ?? 0,
            options.accelerationY ?? 0,
            Math.max(0, options.drag ?? 0),
            Math.max(0, options.size ?? 3),
            Math.max(0, options.endSize ?? 0),
            Math.max(0.001, options.lifetime ?? 0.5),
            options.color ?? "#ffffff",
        );
    }

    public update(world: GameWorld, delta: number): void {
        void world;
        let index = 0;

        while (index < this.activeCount) {
            const nextAge = this.age[index] + delta;

            if (nextAge >= this.lifetime[index]) {
                this.removeAt(index);
                continue;
            }

            this.age[index] = nextAge;
            this.velocityX[index] += this.accelerationX[index] * delta;
            this.velocityY[index] += this.accelerationY[index] * delta;
            const damping = 1 / (1 + this.drag[index] * delta);
            this.velocityX[index] *= damping;
            this.velocityY[index] *= damping;
            this.x[index] += this.velocityX[index] * delta;
            this.y[index] += this.velocityY[index] * delta;
            index += 1;
        }
    }

    public draw(context: CanvasRenderingContext2D): void {
        if (this.activeCount === 0) {
            return;
        }

        context.save();
        let currentColor = "";

        for (let index = 0; index < this.activeCount; index += 1) {
            const color = this.colors[index];

            if (color !== currentColor) {
                context.fillStyle = color;
                currentColor = color;
            }

            const progress = this.age[index] / this.lifetime[index];
            const size =
                this.startSize[index] + (this.endSize[index] - this.startSize[index]) * progress;
            context.globalAlpha = (1 - progress) * this.opacity;
            context.fillRect(this.x[index] - size * 0.5, this.y[index] - size * 0.5, size, size);
        }

        context.restore();
    }

    public clear(): void {
        this.activeCount = 0;
        this.overwriteIndex = 0;
    }

    private writeParticle(
        x: number,
        y: number,
        velocityX: number,
        velocityY: number,
        accelerationX: number,
        accelerationY: number,
        drag: number,
        startSize: number,
        endSize: number,
        lifetime: number,
        color: string,
    ): void {
        let index: number;

        if (this.activeCount < this.capacity) {
            index = this.activeCount;
            this.activeCount += 1;
        } else {
            index = this.overwriteIndex;
            this.overwriteIndex = (this.overwriteIndex + 1) % this.capacity;
        }

        this.x[index] = x;
        this.y[index] = y;
        this.velocityX[index] = velocityX;
        this.velocityY[index] = velocityY;
        this.accelerationX[index] = accelerationX;
        this.accelerationY[index] = accelerationY;
        this.drag[index] = drag;
        this.startSize[index] = startSize;
        this.endSize[index] = endSize;
        this.age[index] = 0;
        this.lifetime[index] = lifetime;
        this.colors[index] = color;
    }

    private removeAt(index: number): void {
        const lastIndex = this.activeCount - 1;
        this.activeCount = lastIndex;

        if (index === lastIndex) {
            return;
        }

        this.x[index] = this.x[lastIndex];
        this.y[index] = this.y[lastIndex];
        this.velocityX[index] = this.velocityX[lastIndex];
        this.velocityY[index] = this.velocityY[lastIndex];
        this.accelerationX[index] = this.accelerationX[lastIndex];
        this.accelerationY[index] = this.accelerationY[lastIndex];
        this.drag[index] = this.drag[lastIndex];
        this.startSize[index] = this.startSize[lastIndex];
        this.endSize[index] = this.endSize[lastIndex];
        this.age[index] = this.age[lastIndex];
        this.lifetime[index] = this.lifetime[lastIndex];
        this.colors[index] = this.colors[lastIndex];
    }
}
