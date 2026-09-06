import type { BaseEntity } from "../../core/entity";
import { Afterimage } from "../../entities/afterimage";
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
    /** 拖尾用：向场景生成残影实体的回调。 */
    spawnEntity?: (entity: BaseEntity) => void;
}

/** 蓄力释放的金色旋转四角星炮弹：无限追踪、无限生命周期，带同外观拖尾。 */
export class EnergyStarBullet extends Bullet {
    public static readonly defaultSpeed: number = BasicBullet.defaultSpeed
        * 2;
    /** 拖尾残影生成间隔（秒）。 */
    public static readonly afterimageInterval: number = 0.03;
    /** 拖尾残影存续时长（秒）。 */
    public static readonly afterimageLifetime: number = 0.22;

    public speed: number;

    private travelRotation: number;
    private readonly spinSpeed: number;
    private readonly findTarget: () => readonly Plane[];
    private readonly spawnEntity?: (entity: BaseEntity) => void;
    private afterimageTimer: number = 0;

    public constructor(options: EnergyStarBulletOptions) {
        super(
            crypto.randomUUID(),
            { x: options.x, y: options.y },
            { width: 160, height: 160 },
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
        this.spawnEntity = options.spawnEntity;
    }

    public override ai(delta: number): void {
        // 无限追踪：每帧直接朝最近的敌人转向（无转向角限制）。
        // 已命中过但未击杀的敌人会被排除，避免炮弹粘在原目标身上；
        // 若全部敌人都命中过，则清空记录开启新一轮命中。
        const sourceX = this.position.x + this.size.width / 2;
        const sourceY = this.position.y + this.size.height / 2;

        let nearest = this.pickNearestTarget(sourceX, sourceY, true);

        if (nearest === undefined) {
            const anyCandidate = this.pickNearestTarget(
                sourceX,
                sourceY,
                false,
            );

            if (anyCandidate !== undefined) {
                this.resetHitTargets();
                nearest = anyCandidate;
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

        this.updateAfterimage(delta);
    }

    /**
     * 选取最近的活跃敌人。
     * @param excludeHit 为 true 时排除已命中过的目标（防止粘在未击杀目标上）。
     */
    private pickNearestTarget(
        sourceX: number,
        sourceY: number,
        excludeHit: boolean,
    ): Plane | undefined {
        let nearest: Plane | undefined;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const target of this.findTarget()) {
            if (!target.active || (excludeHit && this.hasHit(target))) {
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

        return nearest;
    }

    /** 拖尾：按固定间隔生成与自身同外观（四角星、同色、同尺寸）的残影。 */
    private updateAfterimage(delta: number): void {
        if (this.spawnEntity === undefined) {
            return;
        }

        this.afterimageTimer -= delta;

        if (this.afterimageTimer > 0) {
            return;
        }

        this.afterimageTimer = EnergyStarBullet.afterimageInterval;

        const afterimage = new Afterimage(
            { ...this.position },
            { ...this.size },
            { shape: "star", color: this.appearance.color },
            this.rotation,
            { x: 1, y: 1 },
            EnergyStarBullet.afterimageLifetime,
            0.45,
        );

        // 压低渲染层级，让拖尾绘制在本体下方。
        afterimage.zIndex = -1;
        this.spawnEntity(afterimage);
    }

    public override getEntityType(): "bullet" {
        return "bullet";
    }

    public override judgeCritical(): [boolean, number] {
        return rollCritical(this.launcher, this.damage);
    }
}
