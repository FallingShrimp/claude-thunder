import type { BaseEntity } from "../../core/entity";
import { Bullet, type BulletFaction } from "../../entities/bullet";
import { rollCritical } from "../critical";

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
    public static readonly defaultSpeed: number = 420;

    public speed: number;

    public constructor(options: BasicBulletOptions) {
        super(
            options.id ?? crypto.randomUUID(),
            { x: options.x, y: options.y },
            { width: 16, height: 6 },
            { shape: "triangle", color: "#ffe66d" },
            options.launcher,
        );

        this.rotation = options.rotation;
        this.speed = options.speed ?? BasicBullet.defaultSpeed;
        this.damage = options.damage ?? 10;
        this.remainingLifetime = 4;
        this.faction = options.faction ?? "player";
        this.canParry = true;
    }

    public override ai(delta: number): void {
        this.advance(delta, this.rotation);
    }

    protected advance(delta: number, rotation: number): void {
        this.velocity.x = Math.cos(rotation) * this.speed;
        this.velocity.y = Math.sin(rotation) * this.speed;
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.remainingLifetime = Math.max(0, this.remainingLifetime - delta);

        if (this.remainingLifetime === 0) {
            this.active = false;
        }
    }

    public override getEntityType(): "bullet" {
        return "bullet";
    }

    public override judgeCritical(): [boolean, number] {
        // 玩家及召唤物（通过 launcher 回溯到玩家）造成的伤害均参与暴击判定。
        return rollCritical(this.launcher, this.damage);
    }
}
