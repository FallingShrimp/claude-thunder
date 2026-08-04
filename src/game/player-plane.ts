import { Player } from "../entities/player";
import type { KeyboardInput } from "./keyboard-input";

export class PlayerPlane extends Player {
    public constructor(private readonly input: KeyboardInput) {
        super(
            "player",
            { x: 216, y: 640 },
            { width: 48, height: 56 },
            { shape: "rectangle", color: "#4da6ff" },
            100,
        );

        this.speed = 240;
        this.lives = 3;
    }

    public override ai(delta: number): void {
        const horizontal = Number(this.input.isPressed("KeyD"))
            - Number(this.input.isPressed("KeyA"));
        const vertical = Number(this.input.isPressed("KeyS"))
            - Number(this.input.isPressed("KeyW"));

        this.velocity.x = horizontal * this.speed;
        this.velocity.y = vertical * this.speed;
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;

        if (this.input.isPressed("KeyJ")) {
            this.attack();
        }

        if (this.input.isPressed("KeyK")) {
            this.defend();
        }
    }

    public override getEntityType(): "player" {
        return "player";
    }

    private attack(): void {
        // 攻击逻辑将在游戏内容确定后实现。
    }

    private defend(): void {
        // 防御逻辑将在游戏内容确定后实现。
    }
}
