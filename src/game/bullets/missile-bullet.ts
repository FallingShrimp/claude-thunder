import type { Plane } from "../../entities/plane";
import { BasicBullet, type BasicBulletOptions } from "./basic-bullet";

export interface MissileBulletOptions extends BasicBulletOptions {
    /** 无限追踪用：返回玩家（或任意追踪目标）。 */
    findTarget?: () => readonly Plane[];
}

/**
 * 敌方三角形导弹：无限追踪目标（无转向角限制），
 * 弹头始终指向飞行方向，带火焰拖尾（由 FireballTrailSystem 渲染）。
 */
export class MissileBullet extends BasicBullet {
    public static readonly defaultLifetime: number = 5;

    private travelRotation: number;
    private readonly findTarget: () => readonly Plane[];

    public constructor(options: MissileBulletOptions) {
        super({
            ...options,
            damage: options.damage ?? 12,
        });

        this.travelRotation = options.rotation;
        this.appearance = { shape: "triangle", color: "#e07b2a" };
        this.size = { width: 22, height: 14 };
        this.collisionBounds.size = { ...this.size };
        this.rotation = this.travelRotation;
        this.remainingLifetime = MissileBullet.defaultLifetime;
        this.findTarget = options.findTarget ?? (() => []);
    }

    public override ai(delta: number): void {
        // 无限追踪：每帧直接朝目标转向（无转向角限制）。
        let nearest: Plane | undefined;
        let nearestDistance = Number.POSITIVE_INFINITY;
        const sourceX = this.position.x + this.size.width / 2;
        const sourceY = this.position.y + this.size.height / 2;

        for (const target of this.findTarget()) {
            if (!target.active) {
                continue;
            }

            const distance = Math.hypot(
                target.position.x + target.size.width / 2 - sourceX,
                target.position.y + target.size.height / 2 - sourceY,
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = target;
            }
        }

        if (nearest !== undefined) {
            this.travelRotation = Math.atan2(
                nearest.position.y + nearest.size.height / 2 - sourceY,
                nearest.position.x + nearest.size.width / 2 - sourceX,
            );
        }

        // 三角形弹头指向飞行方向。
        this.rotation = this.travelRotation;
        this.advance(delta, this.travelRotation);
    }
}
