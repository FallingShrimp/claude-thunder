import type { BaseEntity } from "../../core/entity";
import { Bullet, type BulletFaction } from "../../entities/bullet";
import { Enemy } from "../../entities/enemy";
import type { Plane } from "../../entities/plane";
import { Player } from "../../entities/player";

export interface BasicBulletOptions {
    id?: string;
    launcher: BaseEntity;
    x: number;
    y: number;
    rotation: number;
    speed?: number;
    damage?: number;
    faction?: BulletFaction;
}

export class BasicBullet extends Bullet {
    public speed: number;

    public constructor(options: BasicBulletOptions) {
        super(
            options.id ?? crypto.randomUUID(),
            { x: options.x, y: options.y },
            { width: 6, height: 16 },
            { shape: "rectangle", color: "#ffe66d" },
            options.launcher,
        );

        this.rotation = options.rotation;
        this.speed = options.speed ?? 420;
        this.damage = options.damage ?? 10;
        this.faction = options.faction ?? "player";
    }

    public override ai(delta: number): void {
        this.velocity.x = Math.cos(this.rotation) * this.speed;
        this.velocity.y = Math.sin(this.rotation) * this.speed;
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
    }

    public collidesWith(target: BaseEntity): boolean {
        const bulletWidth = this.collisionBounds.size.width * this.scale.x;
        const bulletHeight = this.collisionBounds.size.height * this.scale.y;
        const targetWidth = target.collisionBounds.size.width * target.scale.x;
        const targetHeight = target.collisionBounds.size.height * target.scale.y;
        const bulletX = this.position.x + this.collisionBounds.offset.x;
        const bulletY = this.position.y + this.collisionBounds.offset.y;
        const targetX = target.position.x + target.collisionBounds.offset.x;
        const targetY = target.position.y + target.collisionBounds.offset.y;

        return bulletX < targetX + targetWidth
            && bulletX + bulletWidth > targetX
            && bulletY < targetY + targetHeight
            && bulletY + bulletHeight > targetY;
    }

    public canDamage(target: Plane): boolean {
        return (this.launcher instanceof Player && target instanceof Enemy)
            || (this.launcher instanceof Enemy && target instanceof Player);
    }

    public hit(target: Plane, critical: boolean = false): boolean {
        if (!this.active || !target.active || !this.canDamage(target)) {
            return false;
        }

        target.takeDamage(this.damage, critical, this);
        this.active = false;
        return true;
    }

    public override getEntityType(): "bullet" {
        return "bullet";
    }
}
