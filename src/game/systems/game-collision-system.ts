import type { BaseEntity } from "../../core/entity";
import { Bullet } from "../../entities/bullet";
import { Enemy } from "../../entities/enemy";
import { Plane } from "../../entities/plane";
import { Player } from "../../entities/player";
import { CollisionSystem } from "../../logic/collision-system";
import type { GameWorld } from "../../logic/game-world";
import { emitBurst } from "../particles/burst";
import { emitRing } from "../particles/ring";
import { PlayerPlane, type ParryResult } from "../player-plane";

export class GameCollisionSystem extends CollisionSystem {
    public constructor(
        private readonly shakeCamera: (
            amplitude: number,
            duration: number,
            frequency?: number,
            decay?: number,
        ) => void = () => undefined,
    ) {
        super();
    }

    protected override shouldTest(
        left: BaseEntity,
        right: BaseEntity,
    ): boolean {
        return this.getBulletAndPlane(left, right) !== undefined
            || this.getOpposingPlanes(left, right) !== undefined;
    }

    protected override onCollision(
        world: GameWorld,
        left: BaseEntity,
        right: BaseEntity,
        deltaTime: number,
    ): void {
        void deltaTime;

        const bulletPair = this.getBulletAndPlane(left, right);

        if (bulletPair !== undefined) {
            if (bulletPair.plane === bulletPair.bullet.launcher) {
                return;
            }

            if (
                bulletPair.plane instanceof PlayerPlane
                && bulletPair.bullet.canDamage(bulletPair.plane)
            ) {
                const parry = bulletPair.plane.resolveParry(
                    bulletPair.bullet.canParry,
                );

                if (parry !== "none") {
                    bulletPair.bullet.active = false;
                    this.emitParryEffect(world, bulletPair.plane, parry);

                    if (parry === "perfect") {
                        return;
                    }

                    const damageLabel = bulletPair.plane.takeDamage(
                        bulletPair.bullet.damage * 0.75,
                        false,
                        bulletPair.bullet,
                    );

                    if (damageLabel !== undefined) {
                        world.addEntity(damageLabel);
                    }

                    return;
                }
            }

            const damageLabel = bulletPair.bullet.hit(bulletPair.plane);

            if (damageLabel !== undefined) {
                world.addEntity(damageLabel);
                const target = bulletPair.plane;
                const centerX = target.position.x + target.size.width / 2;
                const centerY = target.position.y + target.size.height / 2;
                emitBurst(world.particles, {
                    x: centerX,
                    y: centerY,
                    count: target.active ? 8 : 28,
                    color: target.appearance.color,
                    speedMin: target.active ? 35 : 70,
                    speedMax: target.active ? 120 : 240,
                    lifetimeMin: 0.18,
                    lifetimeMax: target.active ? 0.4 : 0.8,
                    sizeMin: 2,
                    sizeMax: target.active ? 5 : 8,
                    accelerationY: 35,
                    drag: 1.8,
                });
            }

            return;
        }

        const planePair = this.getOpposingPlanes(left, right);

        if (planePair === undefined) {
            return;
        }

        const player = planePair.first instanceof PlayerPlane
            ? planePair.first
            : planePair.second instanceof PlayerPlane
                ? planePair.second
                : undefined;
        const parry = player?.resolveParry() ?? "none";

        if (player !== undefined && parry !== "none") {
            this.emitParryEffect(world, player, parry);
        }

        const firstIncomingDamage = planePair.first === player
            ? planePair.second.collisionDamage * (parry === "guard" ? 0.75 : 1)
            : planePair.second.collisionDamage;
        const secondIncomingDamage = planePair.second === player
            ? planePair.first.collisionDamage * (parry === "guard" ? 0.75 : 1)
            : planePair.first.collisionDamage;
        const firstDamageLabel = planePair.first === player && parry === "perfect"
            ? undefined
            : planePair.first.takeDamage(firstIncomingDamage, false);
        const secondDamageLabel = planePair.second === player && parry === "perfect"
            ? undefined
            : planePair.second.takeDamage(secondIncomingDamage, false);

        if (firstDamageLabel !== undefined) {
            world.addEntity(firstDamageLabel);
        }

        if (secondDamageLabel !== undefined) {
            world.addEntity(secondDamageLabel);
        }

        if (firstDamageLabel !== undefined || secondDamageLabel !== undefined) {
            const collisionX = (
                planePair.first.position.x + planePair.first.size.width / 2
                + planePair.second.position.x + planePair.second.size.width / 2
            ) / 2;
            const collisionY = (
                planePair.first.position.y + planePair.first.size.height / 2
                + planePair.second.position.y + planePair.second.size.height / 2
            ) / 2;
            emitBurst(world.particles, {
                x: collisionX,
                y: collisionY,
                count: 18,
                color: "#ffb13b",
                speedMin: 80,
                speedMax: 220,
                lifetimeMin: 0.2,
                lifetimeMax: 0.6,
                sizeMin: 3,
                sizeMax: 7,
                accelerationY: 45,
                drag: 2,
            });
        }
    }

    private emitParryEffect(
        world: GameWorld,
        player: PlayerPlane,
        result: Exclude<ParryResult, "none">,
    ): void {
        const centerX = player.position.x + player.size.width / 2;
        const centerY = player.position.y + player.size.height / 2;
        const perfect = result === "perfect";

        this.shakeCamera(
            perfect ? 30 : 7,
            perfect ? 0.72 : 0.24,
            perfect ? 24 : 34,
            perfect ? 1.35 : 2.4,
        );
        emitRing(world.particles, {
            x: centerX,
            y: centerY,
            count: perfect ? 96 : 36,
            color: perfect ? "#f8ffff" : "#5bbcff",
            speed: perfect ? 520 : 240,
            lifetime: perfect ? 0.72 : 0.4,
            size: perfect ? 8 : 5,
            endSize: 0,
            drag: perfect ? 0.35 : 1.2,
        });
        emitBurst(world.particles, {
            x: centerX,
            y: centerY,
            count: perfect ? 180 : 42,
            color: perfect ? "#ffd84d" : "#65c8ff",
            speedMin: perfect ? 140 : 60,
            speedMax: perfect ? 760 : 280,
            lifetimeMin: 0.18,
            lifetimeMax: perfect ? 1 : 0.5,
            sizeMin: perfect ? 3 : 2,
            sizeMax: perfect ? 11 : 6,
            accelerationY: 55,
            drag: perfect ? 0.8 : 1.8,
        });

        if (perfect) {
            emitRing(world.particles, {
                x: centerX,
                y: centerY,
                count: 64,
                color: "#64f6ff",
                speed: 340,
                lifetime: 0.9,
                size: 12,
                endSize: 0,
                startAngle: Math.PI / 64,
                drag: 0.6,
            });
        }
    }

    private getBulletAndPlane(
        left: BaseEntity,
        right: BaseEntity,
    ): { bullet: Bullet; plane: Plane } | undefined {
        if (left instanceof Bullet && right instanceof Plane) {
            return { bullet: left, plane: right };
        }

        if (right instanceof Bullet && left instanceof Plane) {
            return { bullet: right, plane: left };
        }

        return undefined;
    }

    private getOpposingPlanes(
        left: BaseEntity,
        right: BaseEntity,
    ): { first: Plane; second: Plane } | undefined {
        if (
            (left instanceof Player && right instanceof Enemy)
            || (left instanceof Enemy && right instanceof Player)
        ) {
            return { first: left, second: right };
        }

        return undefined;
    }
}
