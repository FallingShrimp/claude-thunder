import type { ParticleSystem } from "../../logic/systems/particle-system";

export interface BurstOptions {
    x: number;
    y: number;
    count: number;
    color?: string;
    angle?: number;
    spread?: number;
    speedMin?: number;
    speedMax?: number;
    lifetimeMin?: number;
    lifetimeMax?: number;
    sizeMin?: number;
    sizeMax?: number;
    endSize?: number;
    accelerationX?: number;
    accelerationY?: number;
    drag?: number;
}

export function emitBurst(
    particles: ParticleSystem,
    options: Readonly<BurstOptions>,
): void {
    const count = Math.max(0, Math.floor(options.count));
    const angle = options.angle ?? 0;
    const spread = options.spread ?? Math.PI * 2;
    const speedMin = options.speedMin ?? 40;
    const speedRange = (options.speedMax ?? 160) - speedMin;
    const lifetimeMin = Math.max(0.001, options.lifetimeMin ?? 0.25);
    const lifetimeRange = (options.lifetimeMax ?? 0.65) - lifetimeMin;
    const sizeMin = Math.max(0, options.sizeMin ?? 2);
    const sizeRange = (options.sizeMax ?? 5) - sizeMin;

    for (let index = 0; index < count; index += 1) {
        const direction = angle + (Math.random() - 0.5) * spread;
        const speed = speedMin + Math.random() * speedRange;
        particles.emit({
            x: options.x,
            y: options.y,
            velocityX: Math.cos(direction) * speed,
            velocityY: Math.sin(direction) * speed,
            accelerationX: options.accelerationX,
            accelerationY: options.accelerationY,
            drag: options.drag ?? 1.5,
            size: sizeMin + Math.random() * sizeRange,
            endSize: options.endSize,
            lifetime: lifetimeMin + Math.random() * lifetimeRange,
            color: options.color,
        });
    }
}
