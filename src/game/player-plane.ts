import type { BaseEntity } from "../core/entity";
import { DataFormat, defineStats } from "../core/stats";
import { Player } from "../entities/player";
import { BasicBullet } from "./bullets/basic-bullet";
import type { KeyboardInput } from "./keyboard-input";

export type PlayerStats = {
    ATK: number;
    ATK_SPD: number;
    CRIT_RATE: number;
    CRIT_DMG: number;
};

const PLAYER_STATS_FORMATS = defineStats<PlayerStats>({
    ATK: DataFormat.VALUE,
    ATK_SPD: DataFormat.FREQUENCY,
    CRIT_RATE: DataFormat.PERCENT,
    CRIT_DMG: DataFormat.PERCENT,
});

export class PlayerPlane extends Player<PlayerStats> {
    private controlsEnabled: boolean = true;

    public constructor(
        private readonly input: KeyboardInput,
        private readonly spawnEntity: (entity: BaseEntity) => void,
    ) {
        super(
            "player",
            { x: 216, y: 640 },
            { width: 48, height: 56 },
            { shape: "rectangle", color: "#4da6ff" },
            100,
            PLAYER_STATS_FORMATS,
            {
                ATK: 10,
                ATK_SPD: 3,
                CRIT_RATE: 0.05,
                CRIT_DMG: 2,
            },
        );

        this.speed = 240;
        this.lives = 3;
        this.fireCooldown = 0;
    }

    public override ai(delta: number): void {
        this.fireCooldown = Math.max(0, this.fireCooldown - delta);

        if (!this.controlsEnabled) {
            this.velocity = { x: 0, y: 0 };
            return;
        }

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

    public setControlsEnabled(enabled: boolean): void {
        this.controlsEnabled = enabled;
    }

    public override getEntityType(): "player" {
        return "player";
    }

    private attack(): void {
        if (this.fireCooldown > 0) {
            return;
        }

        const bulletWidth = 6;
        const bulletHeight = 16;
        const centerX = this.position.x + this.size.width / 2;

        this.spawnEntity(new BasicBullet({
            launcher: this,
            x: centerX - bulletWidth / 2,
            y: this.position.y - bulletHeight,
            rotation: -Math.PI / 2,
            damage: this.readStat("ATK"),
            faction: "player",
        }));
        this.fireCooldown = 1 / this.readStat("ATK_SPD");
    }

    private defend(): void {
        // 防御逻辑将在游戏内容确定后实现。
    }
}
