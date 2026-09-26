import type { BaseEntity } from "../../core/entity";
import { defineStats } from "../../core/stats";
import { Enemy } from "../../entities/enemy";
import { DangerBullet } from "../bullets/danger-bullet";

type RedStats = Record<never, number>;

const RED_STATS_FORMATS = defineStats<RedStats>({});

export class Red extends Enemy<RedStats> {
    private static readonly fireInterval: number = 3;

    public constructor(
        x: number,
        private readonly screenHeight: number,
        private readonly spawnEntity: (entity: BaseEntity) => void,
    ) {
        super(
            crypto.randomUUID(),
            { x, y: -40 },
            { width: 36, height: 40 },
            { shape: "triangle", color: "#ff3030" },
            20,
            10,
            RED_STATS_FORMATS,
            {},
        );

        this.rotation = Math.PI / 2;
        this.speed = 120;
        this.velocity.y = this.speed;
        this.scoreValue = 100;
        this.fireCooldown = Red.fireInterval;
    }

    public override ai(delta: number): void {
        this.position.y += this.velocity.y * delta;
        this.fireCooldown -= delta;

        while (this.fireCooldown <= 0) {
            this.fire();
            this.fireCooldown += Red.fireInterval;
        }

        if (this.position.y > this.screenHeight) {
            this.position.y = -this.size.height;
        }
    }

    public override upgrade(): void {
        this.maxHealth *= 1.2;
        this.health = this.maxHealth;
        this.scoreValue += 25;
    }

    public override getEntityType(): "enemy" {
        return "enemy";
    }

    private fire(): void {
        const bulletWidth = 6;

        this.spawnEntity(
            new DangerBullet({
                launcher: this,
                x: this.position.x + this.size.width / 2 - bulletWidth / 2,
                y: this.position.y + this.size.height,
                rotation: Math.PI / 2,
            }),
        );
    }
}
