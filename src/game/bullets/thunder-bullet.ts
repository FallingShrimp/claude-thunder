import type { BaseEntity } from "../../core/entity";
import type { Plane } from "../../entities/plane";
import { Bullet, type BulletFaction } from "../../entities/bullet";

export interface ThunderBulletOptions {
    id?: string;
    launcher: BaseEntity;
    originX: number;
    originY: number;
    rotation: number;
    length?: number;
    damage?: number;
    faction?: BulletFaction;
    remainingChains?: number;
    chainTargetIds?: ReadonlySet<string>;
}

export class ThunderBullet extends Bullet {
    public static readonly chainRange: number = 320;
    public static readonly splitLength: number = 180;
    public static readonly thickness: number = 6;
    public static readonly lifetime: number = 0.12;

    public remainingChains: number;
    public readonly chainTargetIds: Set<string>;
    public readonly originX: number;
    public readonly originY: number;
    public readonly endX: number;
    public readonly endY: number;

    public constructor(options: ThunderBulletOptions) {
        const length = Math.max(0, options.length ?? ThunderBullet.splitLength);
        const endX = options.originX + Math.cos(options.rotation) * length;
        const endY = options.originY + Math.sin(options.rotation) * length;
        const centerX = (options.originX + endX) / 2;
        const centerY = (options.originY + endY) / 2;

        super(
            options.id ?? crypto.randomUUID(),
            {
                x: centerX - length / 2,
                y: centerY - ThunderBullet.thickness / 2,
            },
            { width: length, height: ThunderBullet.thickness },
            { shape: "rectangle", color: "#67f5ff" },
            options.launcher,
        );

        this.originX = options.originX;
        this.originY = options.originY;
        this.endX = endX;
        this.endY = endY;
        this.rotation = options.rotation;
        this.damage = options.damage ?? 0;
        this.faction = options.faction ?? "player";
        this.remainingLifetime = ThunderBullet.lifetime;
        this.remainingChains = Math.max(
            0,
            Math.floor(options.remainingChains ?? 0),
        );
        this.chainTargetIds = new Set(options.chainTargetIds);
        this.canParry = false;
        this.penetrate = 0;
        this.zIndex = 20;
    }

    public override ai(delta: number): void {
        this.remainingLifetime = Math.max(0, this.remainingLifetime - delta);
        this.opacity = this.remainingLifetime / ThunderBullet.lifetime;

        if (this.remainingLifetime === 0) {
            this.active = false;
        }
    }

    public override canDamage(target: Plane): boolean {
        return !this.chainTargetIds.has(target.id) && super.canDamage(target);
    }

    public intersects(target: Plane): boolean {
        const halfThickness = ThunderBullet.thickness / 2;
        const minX = target.position.x + target.collisionBounds.offset.x
            - halfThickness;
        const minY = target.position.y + target.collisionBounds.offset.y
            - halfThickness;
        const maxX = minX
            + target.collisionBounds.size.width * target.scale.x
            + ThunderBullet.thickness;
        const maxY = minY
            + target.collisionBounds.size.height * target.scale.y
            + ThunderBullet.thickness;
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
        return [false, this.damage];
    }
}
