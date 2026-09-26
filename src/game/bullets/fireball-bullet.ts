import type { Enemy } from "../../entities/enemy";
import { radians } from "../../util/math";
import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export interface FireballBulletOptions extends Omit<BasicBulletOptions, "speed"> {
    remainingRefractions?: number;
    refractionTargetIds?: ReadonlySet<string>;
    traceAngle?: number;
    traceTarget?: Enemy;
    findTraceTarget?: (source: FireballBullet) => Enemy | undefined;
}

export class FireballBullet extends BasicBullet {
    public remainingRefractions: number;
    public readonly refractionTargetIds: Set<string>;
    public traceAngle: number;
    public traceTarget: Enemy | undefined;

    private travelRotation: number;
    private readonly findTraceTarget: (source: FireballBullet) => Enemy | undefined;

    public constructor(options: FireballBulletOptions) {
        super({
            ...options,
            speed: BasicBullet.defaultSpeed * 2,
        });

        this.travelRotation = options.rotation;
        this.remainingRefractions = Math.max(0, Math.floor(options.remainingRefractions ?? 0));
        this.refractionTargetIds = new Set(options.refractionTargetIds);
        this.traceAngle = Math.max(0, options.traceAngle ?? 0);
        this.traceTarget = options.traceTarget;
        this.findTraceTarget = options.findTraceTarget ?? (() => undefined);
        this.appearance = { shape: "triangle", color: "#ff6b1a" };
        this.size = { width: 40, height: 32 };
        this.collisionBounds.size = { ...this.size };
        this.rotation = this.travelRotation + Math.PI;
        this.canParry = false;
        this.penetrate = Number.POSITIVE_INFINITY;
    }

    public override ai(delta: number): void {
        if (this.traceTarget?.active !== true) {
            this.traceTarget = this.findTraceTarget(this);
        }

        if (this.traceTarget !== undefined && this.traceAngle > 0) {
            const sourceX = this.position.x + this.size.width / 2;
            const sourceY = this.position.y + this.size.height / 2;
            const targetX = this.traceTarget.position.x + this.traceTarget.size.width / 2;
            const targetY = this.traceTarget.position.y + this.traceTarget.size.height / 2;
            const targetRotation = Math.atan2(targetY - sourceY, targetX - sourceX);
            const angleDifference = Math.atan2(
                Math.sin(targetRotation - this.travelRotation),
                Math.cos(targetRotation - this.travelRotation),
            );
            const maxTurn = radians(this.traceAngle);
            this.travelRotation += Math.max(-maxTurn, Math.min(maxTurn, angleDifference));
            this.rotation = this.travelRotation + Math.PI;
        }

        this.advance(delta, this.travelRotation);
    }
}
