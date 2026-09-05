import type { BaseEntity } from "../../core/entity";
import type { Plane } from "../../entities/plane";
import { Bullet, type BulletFaction } from "../../entities/bullet";
import { rollCritical } from "../critical";

export interface LaserBulletOptions {
    launcher: BaseEntity;
    originX: number;
    originY: number;
    rotation: number;
    length?: number;
    damage?: number;
    faction?: BulletFaction;
    remainingRefractions?: number;
    refractionTargetIds?: Set<string>;
}

/** 激光：瞬时射线束，穿透路径上的所有敌人；命中后可向最近敌人折射。 */
export class LaserBullet extends Bullet {
    public static readonly defaultLength: number = 3000;
    public static readonly thickness: number = 5;
    public static readonly lifetime: number = 0.15;
    /** 多道激光齐射时的扇形角度间隔（弧度）。 */
    public static readonly spreadAngle: number = 0.14;

    public remainingRefractions: number;
    public readonly refractionTargetIds: Set<string>;
    public readonly originX: number;
    public readonly originY: number;
    public readonly endX: number;
    public readonly endY: number;

    public constructor(options: LaserBulletOptions) {
        const length = Math.max(0, options.length ?? LaserBullet.defaultLength);
        const endX = options.originX + Math.cos(options.rotation) * length;
        const endY = options.originY + Math.sin(options.rotation) * length;
        const centerX = (options.originX + endX) / 2;
        const centerY = (options.originY + endY) / 2;

        super(
            crypto.randomUUID(),
            {
                x: centerX - length / 2,
                y: centerY - LaserBullet.thickness / 2,
            },
            { width: length, height: LaserBullet.thickness },
            { shape: "rectangle", color: "#ff7ae0" },
            options.launcher,
        );

        this.originX = options.originX;
        this.originY = options.originY;
        this.endX = endX;
        this.endY = endY;
        this.rotation = options.rotation;
        this.damage = options.damage ?? 0;
        this.faction = options.faction ?? "player";
        this.remainingLifetime = LaserBullet.lifetime;
        this.remainingRefractions = Math.max(
            0,
            Math.floor(options.remainingRefractions ?? 0),
        );
        this.refractionTargetIds = options.refractionTargetIds ?? new Set();
        this.canParry = false;
        this.penetrate = Number.POSITIVE_INFINITY;
        this.zIndex = 20;
    }

    public override ai(delta: number): void {
        this.remainingLifetime = Math.max(0, this.remainingLifetime - delta);
        this.opacity = this.remainingLifetime / LaserBullet.lifetime;

        if (this.remainingLifetime === 0) {
            this.active = false;
        }
    }

    public override canDamage(target: Plane): boolean {
        return !this.refractionTargetIds.has(target.id)
            && super.canDamage(target);
    }

    /** 射线与目标碰撞盒的 slab 相交测试（与 ThunderBullet 相同的算法）。 */
    public intersects(target: Plane): boolean {
        const halfThickness = LaserBullet.thickness / 2;
        const minX = target.position.x + target.collisionBounds.offset.x
            - halfThickness;
        const minY = target.position.y + target.collisionBounds.offset.y
            - halfThickness;
        const maxX = minX
            + target.collisionBounds.size.width * target.scale.x
            + LaserBullet.thickness;
        const maxY = minY
            + target.collisionBounds.size.height * target.scale.y
            + LaserBullet.thickness;
        const directionX = this.endX - this.originX;
        const directionY = this.endY - this.originY;
        let entry = 0;
        let exit = 1;

        const clips: readonly [number, number][] = [
            [-directionX, this.originX - minX],
            [directionX, maxX - this.originX],
            [-directionY, this.originY - minY],
            [directionY, maxY - this.originY],
        ];

        for (const [denominator, numerator] of clips) {
            if (denominator === 0) {
                if (numerator < 0) {
                    return false;
                }
                continue;
            }

            const ratio = numerator / denominator;

            if (denominator < 0) {
                entry = Math.max(entry, ratio);
            } else {
                exit = Math.min(exit, ratio);
            }

            if (entry > exit) {
                return false;
            }
        }

        return true;
    }

    public override getEntityType(): "bullet" {
        return "bullet";
    }

    public override judgeCritical(): [boolean, number] {
        // 激光同样参与玩家暴击判定。
        return rollCritical(this.launcher, this.damage);
    }
}
