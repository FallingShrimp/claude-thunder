import type { BaseEntity } from "../../core/entity";
import { defineStats } from "../../core/stats";
import { Enemy } from "../../entities/enemy";
import { GreatDangerBullet } from "../bullets/great-danger-bullet";

type PurpleStats = Record<never, number>;

const PURPLE_STATS_FORMATS = defineStats<PurpleStats>({});

export class Purple extends Enemy<PurpleStats> {
    private static readonly fireInterval: number = 4.5;

    public constructor(
        x: number,
        private readonly screenHeight: number,
        private readonly spawnEntity: (entity: BaseEntity) => void,
    ) {
        super(
            crypto.randomUUID(),
            { x, y: -52 },
            { width: 44, height: 52 },
            { shape: "triangle", color: "#9333ea" },
            52.5,
            20,
            PURPLE_STATS_FORMATS,
            {},
        );

        this.rotation = Math.PI / 2;
        this.speed = 60;
        this.velocity.y = this.speed;
        this.scoreValue = 350;
        this.fireCooldown = Purple.fireInterval;
    }

    public override ai(delta: number): void {
        this.position.y += this.velocity.y * delta;
        this.fireCooldown -= delta;

        while (this.fireCooldown <= 0) {
            this.fire();
            this.fireCooldown += Purple.fireInterval;
        }

        if (this.position.y > this.screenHeight) {
            this.position.y = -this.size.height;
        }
    }

    public override upgrade(): void {
        this.maxHealth *= 1.2;
        this.health = this.maxHealth;
        this.scoreValue += 40;
    }

    public override getEntityType(): "enemy" {
        return "enemy";
    }

    private fire(): void {
        const bulletWidth = 10;

        this.spawnEntity(new GreatDangerBullet({
            launcher: this,
            x: this.position.x + this.size.width / 2 - bulletWidth / 2,
            y: this.position.y + this.size.height,
            rotation: Math.PI / 2,
        }));
    }
}
