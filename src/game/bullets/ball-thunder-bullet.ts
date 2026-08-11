import type { Enemy } from "../../entities/enemy";
import type { Plane } from "../../entities/plane";
import { radians } from "../../util/math";
import { rollCritical } from "../critical";
import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export interface BallThunderBulletOptions
    extends Omit<BasicBulletOptions, "speed"> {
    remainingChains?: number;
    chainTargetIds?: ReadonlySet<string>;
    traceAngle?: number;
    traceTarget?: Enemy;
    findTraceTarget?: (source: BallThunderBullet) => Enemy | undefined;
}

export class BallThunderBullet extends BasicBullet {
    public remainingChains: number;
    public readonly chainTargetIds: Set<string>;
    public traceAngle: number;
    public traceTarget: Enemy | undefined;

    private readonly findTraceTarget: (
        source: BallThunderBullet,
    ) => Enemy | undefined;

    public constructor(options: BallThunderBulletOptions) {
        super({
            ...options,
            speed: BasicBullet.defaultSpeed * 0.5,
        });

        this.remainingChains = Math.max(
            0,
            Math.floor(options.remainingChains ?? 0),
        );
        this.chainTargetIds = new Set(options.chainTargetIds);
        this.traceAngle = Math.max(0, options.traceAngle ?? 0);
        this.traceTarget = options.traceTarget;
        this.findTraceTarget = options.findTraceTarget ?? (() => undefined);
        this.appearance = { shape: "ellipse", color: "#67f5ff" };
        this.size = { width: 24, height: 24 };
        this.collisionBounds.size = { ...this.size };
        this.canParry = false;
        this.penetrate = Number.POSITIVE_INFINITY;
        this.zIndex = 15;
    }

    public override ai(delta: number): void {
        if (this.traceTarget?.active !== true) {
            this.traceTarget = this.findTraceTarget(this);
        }

        if (this.traceTarget !== undefined && this.traceAngle > 0) {
            const sourceX = this.position.x + this.size.width / 2;
            const sourceY = this.position.y + this.size.height / 2;
            const targetX = this.traceTarget.position.x
                + this.traceTarget.size.width / 2;
            const targetY = this.traceTarget.position.y
                + this.traceTarget.size.height / 2;
            const targetRotation = Math.atan2(
                targetY - sourceY,
                targetX - sourceX,
            );
            const angleDifference = Math.atan2(
                Math.sin(targetRotation - this.rotation),
                Math.cos(targetRotation - this.rotation),
            );
            const maxTurn = radians(this.traceAngle);
            this.rotation += Math.max(-maxTurn, Math.min(maxTurn, angleDifference));
        }

        super.ai(delta);
    }

    public override canDamage(target: Plane): boolean {
        return !this.chainTargetIds.has(target.id) && super.canDamage(target);
    }

    public override judgeCritical(): [boolean, number] {
        // 球状闪电同样参与玩家暴击判定。
        return rollCritical(this.launcher, this.damage);
    }
}
