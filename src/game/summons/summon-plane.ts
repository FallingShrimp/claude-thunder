import { defineStats } from "../../core/stats";
import type { Size2D, Vector2 } from "../../core/geometry";
import type { RenderAppearance } from "../../core/render-appearance";
import { Enemy } from "../../entities/enemy";
import { Plane } from "../../entities/plane";
import type { PlayerPlane } from "../player-plane";

export type SummonType = "gunner" | "cannon" | "assault";

type SummonStats = Record<never, number>;

const SUMMON_STATS_FORMATS = defineStats<SummonStats>({});

export interface SummonPlaneOptions {
    player: PlayerPlane;
    spawnEntity: (entity: unknown) => void;
    findNearestEnemy: () => Enemy | undefined;
    orbitAngle?: number;
}

/**
 * 召唤物抽象基类。
 *
 * 封装三种小飞机的公共行为：围绕玩家旋转、自动索敌、每帧回血，
 * 以及「玩家死亡则召唤物消亡」的存活规则。具体攻击方式由子类通过
 * attack() 实现。
 */
export abstract class SummonPlane extends Plane<SummonStats> {
    public static readonly baseMaxHealth: number = 50;
    public static readonly baseOrbitRadius: number = 90;
    public static readonly baseOrbitSpeed: number = 2.2;

    public readonly player: PlayerPlane;
    public readonly summonType: SummonType;
    public currentTarget: Enemy | undefined;

    protected readonly spawnEntity: (entity: unknown) => void;
    protected readonly findNearestEnemy: () => Enemy | undefined;
    protected orbitAngle: number;
    protected readonly baseRadius: number;

    protected constructor(
        summonType: SummonType,
        size: Size2D,
        appearance: RenderAppearance,
        options: SummonPlaneOptions,
    ) {
        const maxHealth = SummonPlane.baseMaxHealth
            + Math.max(0, options.player.readStat("SUMMON_HEALTH"));
        const radius = SummonPlane.baseOrbitRadius * (1 + Math.max(
            0,
            options.player.readStat("SUMMON_RANGE") - 1,
        ) * 0.5);
        const center = SummonPlane.getPlayerCenter(options.player);
        const angle = options.orbitAngle ?? Math.random() * Math.PI * 2;
        const centerX = center.x + Math.cos(angle) * radius;
        const centerY = center.y + Math.sin(angle) * radius;

        super(
            crypto.randomUUID(),
            {
                x: centerX - size.width / 2,
                y: centerY - size.height / 2,
            },
            size,
            appearance,
            maxHealth,
            0,
            SUMMON_STATS_FORMATS,
            {},
        );

        this.summonType = summonType;
        this.player = options.player;
        this.spawnEntity = options.spawnEntity;
        this.findNearestEnemy = options.findNearestEnemy;
        this.orbitAngle = angle;
        this.baseRadius = radius;
        this.zIndex = 30;
    }

    public override ai(delta: number): void {
        if (!this.player.active) {
            this.active = false;
            return;
        }

        this.regenerate(delta);
        this.updateOrbit(delta);
        this.currentTarget = this.findNearestEnemy();
        this.attack(delta, this.currentTarget);
    }

    public override upgrade(): void {
        // 召唤物不吃波次升级。
    }

    public override getEntityType(): "summon" {
        return "summon";
    }

    /** 子类实现各自的攻击节奏与方式。 */
    protected abstract attack(delta: number, target: Enemy | undefined): void;

    protected getPlayerCenter(): Vector2 {
        return SummonPlane.getPlayerCenter(this.player);
    }

    protected getTargetCenter(target: Enemy): Vector2 {
        return {
            x: target.position.x + target.size.width / 2,
            y: target.position.y + target.size.height / 2,
        };
    }

    protected getDamageMultiplier(): number {
        const overload = Math.max(0, this.player.readStat("SUMMON_OVERLOAD"));
        return Math.max(0, this.player.readStat("SUMMON_DAMAGE")) * (1 + overload);
    }

    private regenerate(delta: number): void {
        const regen = Math.max(0, this.player.readStat("SUMMON_REGEN"));

        if (regen > 0 && this.health > 0) {
            this.health = Math.min(this.maxHealth, this.health + regen * delta);
        }
    }

    private updateOrbit(delta: number): void {
        const speed = SummonPlane.baseOrbitSpeed * Math.max(
            0.1,
            this.player.readStat("SUMMON_ORBIT_SPEED"),
        );
        this.orbitAngle += speed * delta;

        const center = this.getPlayerCenter();
        const centerX = center.x + Math.cos(this.orbitAngle) * this.baseRadius;
        const centerY = center.y + Math.sin(this.orbitAngle) * this.baseRadius;
        this.position.x = centerX - this.size.width / 2;
        this.position.y = centerY - this.size.height / 2;
    }

    private static getPlayerCenter(player: PlayerPlane): Vector2 {
        return {
            x: player.position.x + player.size.width / 2,
            y: player.position.y + player.size.height / 2,
        };
    }
}
