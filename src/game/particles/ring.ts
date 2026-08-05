import type { ParticleSystem } from "../../logic/systems/particle-system";

export interface RingOptions {
    x: number;
    y: number;
    count: number;
    color?: string;
    speed?: number;
    lifetime?: number;
    size?: number;
    endSize?: number;
    startAngle?: number;
    accelerationY?: number;
    drag?: number;
}

export function emitRing(
    particles: ParticleSystem,
    options: Readonly<RingOptions>,
): void {
    const count = Math.max(0, Math.floor(options.count));
    const angleStep = Math.PI * 2 / Math.max(1, count);
    const startAngle = options.startAngle ?? 0;
    const speed = options.speed ?? 240;

    for (let index = 0; index < count; index += 1) {
        const direction = startAngle + angleStep * index;
        particles.emit({
            x: options.x,
            y: options.y,
            velocityX: Math.cos(direction) * speed,
            velocityY: Math.sin(direction) * speed,
            accelerationY: options.accelerationY,
            drag: options.drag,
            size: options.size ?? 5,
            endSize: options.endSize,
            lifetime: options.lifetime,
            color: options.color,
        });
    }
}
