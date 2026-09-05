import type { BaseEntity } from "../../core/entity";
import type { Plane } from "../../entities/plane";
import { Bullet, type BulletFaction } from "../../entities/bullet";
import { rollCritical } from "../critical";
import { radians } from "../../util/math";
import { BasicBullet } from "./basic-bullet";

export interface EnergyStarBulletOptions {
    launcher: BaseEntity;
    x: number;
    y: number;
    rotation?: number;
    speed?: number;
    damage: number;
    faction?: BulletFaction;
    /** 最大穿透次数（初始 1）。 */
    penetrate?: number;
    /** 无限追踪用：返回场上全部敌人。 */
    findTarget?: () => readonly Plane[];
    /** 每秒自转角速度（度）。 */
    spinSpeed?: number;
}

/** 蓄力释放的金色旋转四角星炮弹：无限追踪、无限生命周期。 */
export class EnergyStarBullet extends Bullet {
    public static readonly defaultSpeed: number = BasicBullet.defaultSpeed
        * 1.25;

    public speed: number;

    private travelRotation: number;
    private readonly spinSpeed: number;
    private readonly findTarget: () => readonly Plane[];

    public constructor(options: EnergyStarBulletOptions) {
        super(
            crypto.randomUUID(),
            { x: options.x, y: options.y },
            { width: 20, height: 20 },
            { shape: "rectangle", color: "#ffd700" },
            options.launcher,
        );

        this.travelRotation = options.rotation ?? -Math.PI / 2;
        this.rotation = this.travelRotation;
        this.speed = options.speed ?? EnergyStarBullet.defaultSpeed;
        this.damage = options.damage;
        this.remainingLifetime = Number.POSITIVE_INFINITY;
        this.faction = options.faction ?? "player";
        this.canParry = false;
        this.penetrate = Math.max(0, Math.floor(options.penetrate ?? 1));
        this.findTarget = options.findTarget ?? (() => []);
        this.spinSpeed = radians(Math.max(0, options.spinSpeed ?? 540));
    }

    public override ai(delta: number): void {
        // 无限追踪：每帧直接朝最近的敌人转向（无转向角限制）。
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

        this.rotation += this.spinSpeed * delta;
        this.velocity.x = Math.cos(this.travelRotation) * this.speed;
        this.velocity.y = Math.sin(this.travelRotation) * this.speed;
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
    }

    public override getEntityType(): "bullet" {
        return "bullet";
    }

    public override judgeCritical(): [boolean, number] {
        return rollCritical(this.launcher, this.damage);
    }
}
