import { BaseEntity } from "../core/entity";
import type { Size2D, Vector2 } from "../core/geometry";
import type { RenderAppearance } from "../core/render-appearance";
import type { StatsData, StatsFormats } from "../core/stats";
import type { Bullet } from "./bullet";
import { DamageLabel } from "./damage-label";

export abstract class Plane<T extends StatsData = StatsData> extends BaseEntity {
    public readonly statsSlot: StatsFormats<T>;
    public statsValue: T;
    public health: number;
    public maxHealth: number;
    public speed: number;
    public fireCooldown: number;

    protected constructor(
        id: string,
        position: Vector2,
        size: Size2D,
        appearance: RenderAppearance,
        maxHealth: number,
        statsSlot: StatsFormats<T>,
        statsValue: T,
    ) {
        super(id, position, size, appearance);
        this.statsSlot = statsSlot;
        this.statsValue = statsValue;
        this.health = maxHealth;
        this.maxHealth = maxHealth;
        this.speed = 0;
        this.fireCooldown = 0;
    }

    public abstract upgrade(): void;

    public readStat<K extends keyof T>(key: K): T[K] {
        return this.statsValue[key];
    }

    public takeDamage(
        damage: number,
        isCritical: boolean,
        bullet?: Bullet,
    ): DamageLabel | undefined {
        void bullet;

        if (!this.active || !Number.isFinite(damage) || damage <= 0) {
            return undefined;
        }

        this.health = Math.max(0, this.health - damage);
        const damageLabel = new DamageLabel(
            damage,
            {
                x: this.position.x + this.size.width / 2 - 40,
                y: this.position.y - 8,
            },
            isCritical ? "#ffb13b" : "#ffffff",
            undefined,
            isCritical ? "!!!" : "",
        );

        if (this.health === 0) {
            this.active = false;
        }

        return damageLabel;
    }
}
