import { Enemy } from "../../entities/enemy";

export class Red extends Enemy {
    public constructor(
        x: number,
        private readonly screenHeight: number,
    ) {
        super(
            crypto.randomUUID(),
            { x, y: -40 },
            { width: 36, height: 40 },
            { shape: "triangle", color: "#ff3030" },
            20,
        );

        this.speed = 120;
        this.velocity.y = this.speed;
        this.scoreValue = 100;
    }

    public override ai(delta: number): void {
        this.position.y += this.velocity.y * delta;

        if (this.position.y > this.screenHeight) {
            this.position.y = -this.size.height;
        }
    }

    public override getEntityType(): "enemy" {
        return "enemy";
    }
}
