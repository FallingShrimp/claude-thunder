import type { BaseEntity } from "../../core/entity";
import { defineStats } from "../../core/stats";
import { Enemy } from "../../entities/enemy";
import type { Player } from "../../entities/player";
import { MissileBullet } from "../bullets/missile-bullet";

type BrownStats = Record<never, number>;

const BROWN_STATS_FORMATS = defineStats<BrownStats>({});

/** Brown 敌机：周期性发射可无限追踪玩家的火焰导弹。 */
export class Brown extends Enemy<BrownStats> {
    private static readonly missileInterval: number = 3;

    private readonly screenHeight: number;

    public constructor(
        x: number,
        screenHeight: number,
        private readonly player: Player,
        private readonly spawnEntity: (entity: BaseEntity) => void,
    ) {
        super(
            crypto.randomUUID(),
            { x, y: -42 },
            { width: 42, height: 40 },
            { shape: "triangle", color: "#b5651d" },
            25,
            20,
            BROWN_STATS_FORMATS,
            {},
        );

        this.rotation = Math.PI / 2;
        this.speed = 80;
        this.velocity.y = this.speed;
        this.scoreValue = 300;
        this.screenHeight = screenHeight;
        this.fireCooldown = Brown.missileInterval;
    }

    public override ai(delta: number): void {
        this.position.y += this.velocity.y * delta;
        this.updateFiring(delta);

        if (this.position.y > this.screenHeight) {
            this.position.y = -this.size.height;
        }
    }

    public override upgrade(): void {
        this.maxHealth *= 1.2;
        this.health = this.maxHealth;
        this.scoreValue += 30;
    }

    public override getEntityType(): "enemy" {
        return "enemy";
    }

    private updateFiring(delta: number): void {
        this.fireCooldown -= delta;

        if (this.fireCooldown > 0) {
            return;
        }

        this.fireCooldown += Brown.missileInterval;
        this.fireMissile();
    }

    private fireMissile(): void {
        if (!this.player.active) {
            return;
        }

        const bulletX = this.position.x + this.size.width / 2 - 11;
        const bulletY = this.position.y + this.size.height;
        const targetX = this.player.position.x + this.player.size.width / 2;
        const targetY = this.player.position.y + this.player.size.height / 2;

        this.spawnEntity(
            new MissileBullet({
                launcher: this,
                x: bulletX,
                y: bulletY,
                rotation: Math.atan2(targetY - bulletY, targetX - bulletX),
                // 导弹速度 = 玩家移速。
                speed: this.player.speed,
                findTarget: () => [this.player],
            }),
        );
    }
}
