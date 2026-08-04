import { defineStats } from "../../core/stats";
import { Enemy } from "../../entities/enemy";

type OrangeStats = Record<never, number>;

const ORANGE_STATS_FORMATS = defineStats<OrangeStats>({});

export class Orange extends Enemy<OrangeStats> {
    public constructor(
        x: number,
        private readonly screenHeight: number,
    ) {
        super(
            crypto.randomUUID(),
            { x, y: -40 },
            { width: 27, height: 55 },
            { shape: "triangle", color: "#ff9100ff" },
            5,
            20,
            ORANGE_STATS_FORMATS,
            {},
        );

        this.speed = 250;
        this.velocity.y = this.speed;
        this.scoreValue = 200;
    }

    public override ai(delta: number): void {
        this.position.y += this.velocity.y * delta;

        if (this.position.y > this.screenHeight) {
            this.position.y = -this.size.height;
        }
    }

    public override upgrade(): void {
        this.maxHealth *= 1.15;
        this.health = this.maxHealth;
        this.scoreValue += 14;
    }

    public override getEntityType(): "enemy" {
        return "enemy";
    }
}
