import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export interface FireballBulletOptions
    extends Omit<BasicBulletOptions, "speed"> {
    remainingRefractions?: number;
    refractionTargetIds?: ReadonlySet<string>;
}

export class FireballBullet extends BasicBullet {
    public remainingRefractions: number;
    public readonly refractionTargetIds: Set<string>;

    private readonly travelRotation: number;

    public constructor(options: FireballBulletOptions) {
        super({
            ...options,
            speed: BasicBullet.defaultSpeed * 2,
        });

        this.travelRotation = options.rotation;
        this.remainingRefractions = Math.max(
            0,
            Math.floor(options.remainingRefractions ?? 0),
        );
        this.refractionTargetIds = new Set(options.refractionTargetIds);
        this.appearance = { shape: "triangle", color: "#ff6b1a" };
        this.size = { width: 40, height: 32 };
        this.collisionBounds.size = { ...this.size };
        this.rotation = this.travelRotation + Math.PI;
        this.canParry = false;
        this.penetrate = 2;
    }

    public override ai(delta: number): void {
        this.advance(delta, this.travelRotation);
    }
}
