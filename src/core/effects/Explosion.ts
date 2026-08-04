export interface Particle { dx: number; dy: number; radius: number; color: string }

export class Explosion {
    age = 0;
    readonly duration: number;
    readonly particles: Particle[];

    constructor(public readonly x: number, public readonly y: number, big = false) {
        this.duration = big ? 0.67 : 0.42;
        const colors = ['#ff4500', '#ff8c00', '#ffd700', '#fff', '#ff6347'];
        this.particles = Array.from({ length: big ? 20 : 10 }, () => ({
            dx: (Math.random() - 0.5) * 120, dy: (Math.random() - 0.5) * 120,
            radius: Math.random() * (big ? 8 : 4) + 2,
            color: colors[Math.floor(Math.random() * colors.length)] ?? '#fff',
        }));
    }

    update(delta: number): void { this.age += delta; }
    get active(): boolean { return this.age < this.duration; }
    get progress(): number { return this.age / this.duration; }
}
