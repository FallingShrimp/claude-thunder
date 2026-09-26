import type { BaseEntity } from "../../core/entity";
import { defineStats } from "../../core/stats";
import { Enemy } from "../../entities/enemy";
import type { Player } from "../../entities/player";
import { DangerBullet } from "../bullets/danger-bullet";

type CyanStats = Record<never, number>;

const CYAN_STATS_FORMATS = defineStats<CyanStats>({});

export class Cyan extends Enemy<CyanStats> {
    private static readonly burstInterval: number = 4;
    private static readonly shotInterval: number = 0.1;
    private static readonly shotsPerBurst: number = 3;

    private shotsRemaining: number = 0;
    private shotCooldown: number = 0;

    public constructor(
        x: number,
        private readonly screenHeight: number,
        private readonly player: Player,
        private readonly spawnEntity: (entity: BaseEntity) => void,
    ) {
        super(
            crypto.randomUUID(),
            { x, y: -44 },
            { width: 40, height: 44 },
            { shape: "triangle", color: "#22d3d3" },
            35,
            15,
            CYAN_STATS_FORMATS,
            {},
        );

        this.rotation = Math.PI / 2;
        this.speed = 100;
        this.velocity.y = this.speed;
        this.scoreValue = 250;
        this.fireCooldown = Cyan.burstInterval;
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
        if (this.shotsRemaining > 0) {
            this.shotCooldown -= delta;

            while (this.shotsRemaining > 0 && this.shotCooldown <= 0) {
                this.fireAtPlayer();
                this.shotsRemaining -= 1;
                this.shotCooldown += Cyan.shotInterval;
            }

            return;
        }

        this.fireCooldown -= delta;

        if (this.fireCooldown <= 0) {
            this.shotsRemaining = Cyan.shotsPerBurst;
            this.shotCooldown = 0;
            this.fireCooldown += Cyan.burstInterval;
            this.updateFiring(0);
        }
    }

    private fireAtPlayer(): void {
        if (!this.player.active) {
            return;
        }

        const bulletWidth = 6;
        const bulletX = this.position.x + this.size.width / 2 - bulletWidth / 2;
        const bulletY = this.position.y + this.size.height;
        const targetX = this.player.position.x + this.player.size.width / 2;
        const targetY = this.player.position.y + this.player.size.height / 2;
        const rotation = Math.atan2(targetY - bulletY, targetX - bulletX);

        this.spawnEntity(
            new DangerBullet({
                launcher: this,
                x: bulletX,
                y: bulletY,
                rotation,
            }),
        );
    }
}
