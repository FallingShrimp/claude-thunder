import type { AudioSystem } from "../../audio/audio-system";
import type { BaseEntity } from "../../core/entity";
import { Bullet } from "../../entities/bullet";
import { Enemy } from "../../entities/enemy";
import { Plane } from "../../entities/plane";
import { Player } from "../../entities/player";
import { CollisionSystem } from "../../logic/collision-system";
import type { GameWorld } from "../../logic/game-world";
import { BallThunderBullet } from "../bullets/ball-thunder-bullet";
import { FireballBullet } from "../bullets/fireball-bullet";
import { ThunderBullet } from "../bullets/thunder-bullet";
import { GAME_AUDIO_SOURCES } from "../audio-assets";
import { emitBurst } from "../particles/burst";
import { emitRing } from "../particles/ring";
import { PlayerPlane, type ParryResult } from "../player-plane";

export class GameCollisionSystem extends CollisionSystem {
    public constructor(
        private readonly audioSystem: AudioSystem,
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

    protected override intersects(left: BaseEntity, right: BaseEntity): boolean {
        const bulletPair = this.getBulletAndPlane(left, right);

        if (bulletPair?.bullet instanceof ThunderBullet) {
            return bulletPair.bullet.intersects(bulletPair.plane);
        }

        return super.intersects(left, right);
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
                    this.emitCounterAttacks(
                        world,
                        bulletPair.plane,
                        bulletPair.bullet.launcher,
                    );
                    this.emitParryEffect(world, bulletPair.plane, parry);

                    if (parry === "perfect") {
                        return;
                    }

                    const damageLabel = bulletPair.plane.takeGuardDamage(
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

            if (
                damageLabel !== undefined
                && bulletPair.plane instanceof Enemy
            ) {
                if (bulletPair.bullet instanceof FireballBullet) {
                    this.refractFireball(
                        world,
                        bulletPair.bullet,
                        bulletPair.plane,
                    );
                }

                if (
                    bulletPair.bullet instanceof ThunderBullet
                    || bulletPair.bullet instanceof BallThunderBullet
                ) {
                    this.chainThunder(
                        world,
                        bulletPair.bullet,
                        bulletPair.plane,
                    );
                } else if (bulletPair.bullet.launcher instanceof PlayerPlane) {
                    this.splitThunder(
                        world,
                        bulletPair.bullet.launcher,
                        bulletPair.plane,
                    );
                }
            }

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
            const counterCount = Math.ceil(
                Math.max(0, Math.floor(player.readStat("COUNTER_COUNT"))) * 0.5,
            );

            for (let index = 0; index < counterCount; index++) {
                player.counterAttackAtAngle(Math.random() * Math.PI * 2);
            }

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
            : planePair.first === player && parry === "guard"
                ? player.takeGuardDamage(firstIncomingDamage, false)
                : planePair.first.takeDamage(firstIncomingDamage, false);
        const secondDamageLabel = planePair.second === player && parry === "perfect"
            ? undefined
            : planePair.second === player && parry === "guard"
                ? player.takeGuardDamage(secondIncomingDamage, false)
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

    private splitThunder(
        world: GameWorld,
        player: PlayerPlane,
        hitEnemy: Enemy,
    ): void {
        const splitCount = Math.max(
            0,
            Math.floor(player.readStat("THUNDER_SPLIT_COUNT")),
        );

        if (splitCount === 0) {
            return;
        }

        const originX = hitEnemy.position.x + hitEnemy.size.width / 2;
        const originY = hitEnemy.position.y + hitEnemy.size.height / 2;
        const hitTargetIds = new Set([hitEnemy.id]);

        for (let index = 0; index < splitCount; index++) {
            const thunder = player.emitBallThunder(
                originX,
                originY,
                Math.random() * Math.PI * 2,
                hitTargetIds,
            );
            const damageLabel = thunder.hitOnSpawn(hitEnemy);

            if (damageLabel !== undefined) {
                world.addEntity(damageLabel);
                this.chainThunder(world, thunder, hitEnemy);
            }
        }
    }

    private chainThunder(
        world: GameWorld,
        thunder: ThunderBullet | BallThunderBullet,
        hitEnemy: Enemy,
    ): void {
        if (thunder.remainingChains <= 0) {
            return;
        }

        if (thunder instanceof BallThunderBullet) {
            this.chainBallThunderToEnemy(world, thunder, hitEnemy);
            return;
        }

        if (!(thunder.launcher instanceof PlayerPlane)) {
            return;
        }

        thunder.chainTargetIds.add(hitEnemy.id);
        const originX = hitEnemy.position.x + hitEnemy.size.width / 2;
        const originY = hitEnemy.position.y + hitEnemy.size.height / 2;
        const thunderRange = Math.max(
            0,
            thunder.launcher.readStat("THUNDER_RANGE"),
        );
        let nearest: Enemy | BallThunderBullet | undefined;
        let nearestDistanceSquared = thunderRange * thunderRange;

        for (const entity of world.entities) {
            const isEnemy = entity instanceof Enemy;
            const isFriendlyBallThunder = entity instanceof BallThunderBullet
                && entity.launcher === thunder.launcher;

            if (
                (!isEnemy && !isFriendlyBallThunder)
                || !entity.active
                || entity === hitEnemy
                || thunder.chainTargetIds.has(entity.id)
            ) {
                continue;
            }

            const targetX = entity.position.x + entity.size.width / 2;
            const targetY = entity.position.y + entity.size.height / 2;
            const offsetX = targetX - originX;
            const offsetY = targetY - originY;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;

            if (distanceSquared <= nearestDistanceSquared) {
                nearest = entity;
                nearestDistanceSquared = distanceSquared;
            }
        }

        if (nearest === undefined) {
            return;
        }

        const targetX = nearest.position.x + nearest.size.width / 2;
        const targetY = nearest.position.y + nearest.size.height / 2;
        const offsetX = targetX - originX;
        const offsetY = targetY - originY;
        const nextChains = thunder.remainingChains - 1;
        thunder.remainingChains = 0;

        if (nearest instanceof BallThunderBullet) {
            thunder.chainTargetIds.add(nearest.id);
        }

        void this.playAudio(GAME_AUDIO_SOURCES.thunderChain);
        const chainedThunder = thunder.launcher.emitThunder(
            originX,
            originY,
            Math.atan2(offsetY, offsetX),
            Math.hypot(offsetX, offsetY),
            nextChains,
            thunder.chainTargetIds,
        );
        const damageLabel = chainedThunder.hitOnSpawn(hitEnemy);

        if (damageLabel !== undefined) {
            world.addEntity(damageLabel);
        }

        if (nearest instanceof BallThunderBullet) {
            this.chainFromBallThunderNode(world, chainedThunder, nearest);
        }
    }

    private chainFromBallThunderNode(
        world: GameWorld,
        thunder: ThunderBullet,
        ballThunder: BallThunderBullet,
    ): void {
        if (
            thunder.remainingChains <= 0
            || !(thunder.launcher instanceof PlayerPlane)
        ) {
            return;
        }

        const originX = ballThunder.position.x + ballThunder.size.width / 2;
        const originY = ballThunder.position.y + ballThunder.size.height / 2;
        const thunderRange = Math.max(
            0,
            thunder.launcher.readStat("THUNDER_RANGE"),
        );
        let nearest: Enemy | BallThunderBullet | undefined;
        let nearestDistanceSquared = thunderRange * thunderRange;

        for (const entity of world.entities) {
            const isEnemy = entity instanceof Enemy;
            const isFriendlyBallThunder = entity instanceof BallThunderBullet
                && entity.launcher === thunder.launcher;

            if (
                (!isEnemy && !isFriendlyBallThunder)
                || !entity.active
                || entity === ballThunder
                || thunder.chainTargetIds.has(entity.id)
            ) {
                continue;
            }

            const targetX = entity.position.x + entity.size.width / 2;
            const targetY = entity.position.y + entity.size.height / 2;
            const offsetX = targetX - originX;
            const offsetY = targetY - originY;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;

            if (distanceSquared <= nearestDistanceSquared) {
                nearest = entity;
                nearestDistanceSquared = distanceSquared;
            }
        }

        if (nearest === undefined) {
            return;
        }

        const targetX = nearest.position.x + nearest.size.width / 2;
        const targetY = nearest.position.y + nearest.size.height / 2;
        const offsetX = targetX - originX;
        const offsetY = targetY - originY;
        const nextChains = thunder.remainingChains - 1;
        thunder.remainingChains = 0;

        if (nearest instanceof BallThunderBullet) {
            thunder.chainTargetIds.add(nearest.id);
        }

        void this.playAudio(GAME_AUDIO_SOURCES.thunderChain);
        const chainedThunder = thunder.launcher.emitThunder(
            originX,
            originY,
            Math.atan2(offsetY, offsetX),
            Math.hypot(offsetX, offsetY),
            nextChains,
            thunder.chainTargetIds,
        );

        if (nearest instanceof BallThunderBullet) {
            this.chainFromBallThunderNode(world, chainedThunder, nearest);
        }
    }

    private chainBallThunderToEnemy(
        world: GameWorld,
        ballThunder: BallThunderBullet,
        hitEnemy: Enemy,
    ): void {
        if (!(ballThunder.launcher instanceof PlayerPlane)) {
            return;
        }

        ballThunder.chainTargetIds.add(ballThunder.id);
        const originX = ballThunder.position.x + ballThunder.size.width / 2;
        const originY = ballThunder.position.y + ballThunder.size.height / 2;
        const targetX = hitEnemy.position.x + hitEnemy.size.width / 2;
        const targetY = hitEnemy.position.y + hitEnemy.size.height / 2;
        const offsetX = targetX - originX;
        const offsetY = targetY - originY;
        const nextChains = ballThunder.remainingChains - 1;
        ballThunder.remainingChains = 0;
        void this.playAudio(GAME_AUDIO_SOURCES.thunderChain);
        const chainedThunder = ballThunder.launcher.emitThunder(
            originX,
            originY,
            Math.atan2(offsetY, offsetX),
            Math.hypot(offsetX, offsetY),
            nextChains,
            ballThunder.chainTargetIds,
        );
        const damageLabel = chainedThunder.hitOnSpawn(hitEnemy);

        if (damageLabel !== undefined) {
            world.addEntity(damageLabel);
        }

        this.chainThunder(world, chainedThunder, hitEnemy);
    }

    private refractFireball(
        world: GameWorld,
        fireball: FireballBullet,
        hitEnemy: Enemy,
    ): void {
        if (fireball.remainingRefractions <= 0) {
            return;
        }

        fireball.refractionTargetIds.add(hitEnemy.id);
        const candidates = world.entities.filter(
            (entity): entity is Enemy => entity instanceof Enemy
                && entity.active
                && entity !== hitEnemy
                && !fireball.refractionTargetIds.has(entity.id),
        );

        if (candidates.length === 0) {
            return;
        }

        const nextRefractions = fireball.remainingRefractions - 1;
        fireball.remainingRefractions = 0;
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const originX = hitEnemy.position.x + hitEnemy.size.width / 2;
        const originY = hitEnemy.position.y + hitEnemy.size.height / 2;
        const targetX = target.position.x + target.size.width / 2;
        const targetY = target.position.y + target.size.height / 2;

        void this.playAudio(GAME_AUDIO_SOURCES.laserShot);
        const refractedFireball = new FireballBullet({
            launcher: fireball.launcher,
            x: originX - 20,
            y: originY - 16,
            rotation: Math.atan2(targetY - originY, targetX - originX),
            damage: fireball.damage * 0.85,
            faction: fireball.faction,
            remainingRefractions: nextRefractions,
            refractionTargetIds: fireball.refractionTargetIds,
        });

        world.addEntity(refractedFireball);
        const damageLabel = refractedFireball.hitOnSpawn(hitEnemy);

        if (damageLabel !== undefined) {
            world.addEntity(damageLabel);
        }
    }

    private emitCounterAttacks(
        world: GameWorld,
        player: PlayerPlane,
        primaryTarget: BaseEntity,
    ): void {
        player.counterAttack(primaryTarget);

        const extraCount = Math.max(
            0,
            Math.floor(player.readStat("COUNTER_COUNT")) - 1,
        );

        if (extraCount === 0) {
            return;
        }

        const candidates = world.entities.filter(
            (entity): entity is Enemy => entity instanceof Enemy
                && entity.active
                && entity !== primaryTarget,
        );
        const selectedCount = Math.min(extraCount, candidates.length);

        for (let index = 0; index < selectedCount; index++) {
            const selectedIndex = index + Math.floor(
                Math.random() * (candidates.length - index),
            );
            const selected = candidates[selectedIndex];
            candidates[selectedIndex] = candidates[index];
            candidates[index] = selected;
            player.counterAttack(selected);
        }

        for (let index = selectedCount; index < extraCount; index++) {
            player.counterAttackAtAngle(Math.random() * Math.PI * 2);
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

    private async playAudio(source: string): Promise<void> {
        try {
            await this.audioSystem.playAudio(source);
        } catch {
            // 浏览器可能在用户交互前禁止播放音频，静默忽略即可。
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
