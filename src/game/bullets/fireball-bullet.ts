import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export type FireballBulletOptions = Omit<BasicBulletOptions, "speed">;

export class FireballBullet extends BasicBullet {
    private readonly travelRotation: number;

    public constructor(options: FireballBulletOptions) {
        super({
            ...options,
            speed: BasicBullet.defaultSpeed * 2,
        });

        this.travelRotation = options.rotation;
        this.appearance = { shape: "triangle", color: "#ff6b1a" };
        this.size = { width: 20, height: 16 };
        this.collisionBounds.size = { ...this.size };
        this.rotation = this.travelRotation + Math.PI;
        this.canParry = false;
        this.penetrate = 2;
    }

    public override ai(delta: number): void {
        this.velocity.x = Math.cos(this.travelRotation) * this.speed;
        this.velocity.y = Math.sin(this.travelRotation) * this.speed;
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
    }
}
