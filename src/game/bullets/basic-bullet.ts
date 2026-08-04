import type { BaseEntity } from "../../core/entity";
import { Bullet, type BulletFaction } from "../../entities/bullet";
import { PlayerPlane } from "../player-plane";

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

    public override getEntityType(): "bullet" {
        return "bullet";
    }

    public override judgeCritical(): [boolean, number] {
        if (this.launcher instanceof PlayerPlane) {
            const state = Math.random() < this.launcher.statsValue.CRIT_RATE;
            return [state, this.damage * (state ? this.launcher.statsValue.CRIT_DMG : 1)];
        } else {
            return [false, this.damage];
        }
    }
}
