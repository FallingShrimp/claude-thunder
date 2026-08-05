import type { Vector2 } from "../core/geometry";

export interface CameraShakeOptions {
    amplitude: number;
    duration: number;
    frequency?: number;
    decay?: number;
}

/**
 * Stateful camera trauma controller. It only produces a render offset and does
 * not mutate world coordinates, so collision and AI remain deterministic.
 */
export class CameraShakeController {
    public readonly offset: Vector2 = { x: 0, y: 0 };

    private amplitude: number = 0;
    private duration: number = 0;
    private elapsed: number = 0;
    private frequency: number = 35;
    private decay: number = 2;
    private phaseX: number = 0;
    private phaseY: number = 0;

    public shake(options: Readonly<CameraShakeOptions>): void {
        const amplitude = Math.max(0, options.amplitude);
        const duration = Math.max(0, options.duration);

        if (amplitude === 0 || duration === 0) {
            return;
        }

        // Stronger feedback replaces weaker feedback; equal/stronger impulses
        // restart the envelope so rapid hits still feel responsive.
        if (amplitude >= this.amplitude) {
            this.amplitude = amplitude;
            this.duration = duration;
            this.elapsed = 0;
            this.frequency = Math.max(1, options.frequency ?? 35);
            this.decay = Math.max(0.01, options.decay ?? 2);
            this.phaseX = Math.random() * Math.PI * 2;
            this.phaseY = Math.random() * Math.PI * 2;
        } else {
            this.duration = Math.max(this.duration - this.elapsed, duration);
            this.elapsed = 0;
        }
    }

    public update(delta: number): void {
        if (this.elapsed >= this.duration || this.amplitude === 0) {
            this.reset();
            return;
        }

        this.elapsed = Math.min(this.duration, this.elapsed + delta);
        const progress = this.elapsed / this.duration;
        const envelope = Math.pow(1 - progress, this.decay);
        const angle = this.elapsed * this.frequency * Math.PI * 2;
        const strength = this.amplitude * envelope;

        // Two incommensurate oscillations avoid visible diagonal repetition and
        // do not allocate random values every frame.
        this.offset.x = Math.sin(angle + this.phaseX) * strength;
        this.offset.y = Math.sin(angle * 1.37 + this.phaseY) * strength;

        if (this.elapsed >= this.duration) {
            this.reset();
        }
    }

    public reset(): void {
        this.amplitude = 0;
        this.duration = 0;
        this.elapsed = 0;
        this.offset.x = 0;
        this.offset.y = 0;
    }
}
