export class Spark {
    life = 1;
    constructor(
        public x: number, public y: number, public vx: number, public vy: number,
        public readonly radius: number, public readonly color: string, private readonly decay: number,
    ) { }
    update(delta: number): void {
        this.x += this.vx * delta; this.y += this.vy * delta;
        this.vy += 288 * delta; this.life -= this.decay * delta;
    }
}

export class Shockwave {
    radius = 6;
    life = 1;
    constructor(public readonly x: number, public readonly y: number) { }
    update(delta: number): void {
        this.radius += (70 - this.radius) * Math.min(1, delta * 9);
        this.life -= 2.4 * delta;
    }
}
