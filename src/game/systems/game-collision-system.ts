import type { AudioSystem } from "../../audio/audio-system";
import type { BaseEntity } from "../../core/entity";
import { Bullet } from "../../entities/bullet";
import { Enemy } from "../../entities/enemy";
import { Plane } from "../../entities/plane";
import { Player } from "../../entities/player";
import { CollisionSystem } from "../../logic/collision-system";
import type { GameWorld } from "../../logic/game-world";
import { rollCritical } from "../critical";
import { BallThunderBullet } from "../bullets/ball-thunder-bullet";
import { FireballBullet } from "../bullets/fireball-bullet";
import { LaserBullet } from "../bullets/laser-bullet";
import { ThunderBullet } from "../bullets/thunder-bullet";
import { GAME_AUDIO_SOURCES } from "../audio-assets";
import { emitBurst } from "../particles/burst";
import { emitRing } from "../particles/ring";
import { PlayerPlane, type ParryResult } from "../player-plane";
import { AssaultSummon } from "../summons/assault-summon";
import { SummonPlane } from "../summons/summon-plane";

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
            || this.getOpposingPlanes(left, right) !== undefined
            || this.getAssaultPair(left, right) !== undefined;
    }

    protected override intersects(left: BaseEntity, right: BaseEntity): boolean {
        const bulletPair = this.getBulletAndPlane(left, right);

        if (
            bulletPair?.bullet instanceof ThunderBullet
            || bulletPair?.bullet instanceof LaserBullet
        ) {
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
                        bulletPair.plane.gainEnergy(5);

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
                } else if (bulletPair.bullet instanceof LaserBullet) {
                    this.refractLaser(
                        world,
                        bulletPair.bullet,
                        bulletPair.plane,
                    );
                } else {
                    const launcher = bulletPair.bullet.launcher;
                    const thunderSource = launcher instanceof PlayerPlane
                        ? launcher
                        : launcher instanceof SummonPlane
                            ? launcher.player
                            : undefined;

                    if (thunderSource !== undefined) {
                        this.splitThunder(
                            world,
                            thunderSource,
                            bulletPair.plane,
                        );
                    }
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

                if (!target.active && target instanceof SummonPlane) {
                    this.triggerSacrifice(world, target);
                }
            }

            return;
        }

        const assaultPair = this.getAssaultPair(left, right);

        if (assaultPair !== undefined) {
            this.applyAssaultHit(world, assaultPair);
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
                player.counterAttackAtAngle(
                    Math.random() * Math.PI * 2,
                    undefined,
                    (source) => this.findNearestFireballTarget(world, source),
                );
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
                hitEnemy,
                (source) => this.findNearestTraceTarget(world, source),
            );
            const damageLabel = thunder.hitOnSpawn(hitEnemy);

            if (damageLabel !== undefined) {
                world.addEntity(damageLabel);
                this.chainThunder(world, thunder, hitEnemy);
            }
        }
    }

    private findNearestTraceTarget(
        world: GameWorld,
        source: BallThunderBullet,
    ): Enemy | undefined {
        const sourceX = source.position.x + source.size.width / 2;
        const sourceY = source.position.y + source.size.height / 2;
        let nearest: Enemy | undefined;
        let nearestDistanceSquared = Number.POSITIVE_INFINITY;

        for (const entity of world.entities) {
            if (
                !(entity instanceof Enemy)
                || !entity.active
                || source.chainTargetIds.has(entity.id)
            ) {
                continue;
            }

            const targetX = entity.position.x + entity.size.width / 2;
            const targetY = entity.position.y + entity.size.height / 2;
            const offsetX = targetX - sourceX;
            const offsetY = targetY - sourceY;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;

            if (distanceSquared < nearestDistanceSquared) {
                nearest = entity;
                nearestDistanceSquared = distanceSquared;
            }
        }

        return nearest;
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

    /**
     * 激光折射：命中敌人后向命中点周围最近的 N 个敌人发射折射光束
     * （N = LASER_REFRACTION_TARGETS），折射光束可继续折射。
     * 优先向未折射过的敌人折射；所有敌人都折射过时允许循环折射；
     * 场上仅剩单个敌人时，将剩余折射伤害逐段衰减结算到该敌人。
     * 每次折射的下一段伤害 = 当前伤害 × LASER_REFRACTION_DECAY（基础 75%）。
     */
    private refractLaser(
        world: GameWorld,
        laser: LaserBullet,
        hitPlane: Plane,
    ): void {
        if (!(laser.launcher instanceof PlayerPlane) || !(hitPlane instanceof Enemy)) {
            return;
        }

        const player = laser.launcher;
        const targetCount = Math.max(
            0,
            Math.floor(player.readStat("LASER_REFRACTION_TARGETS")),
        );

        if (targetCount === 0 || laser.remainingRefractions <= 0) {
            return;
        }

        laser.remainingRefractions -= 1;
        laser.refractionTargetIds.add(hitPlane.id);
        const originX = hitPlane.position.x + hitPlane.size.width / 2;
        const originY = hitPlane.position.y + hitPlane.size.height / 2;
        const decay = Math.max(0, player.readStat("LASER_REFRACTION_DECAY"));
        const refractedDamage = laser.damage * decay;

        if (refractedDamage <= 0) {
            return;
        }

        const enemies = world.entities.filter(
            (entity): entity is Enemy => entity instanceof Enemy && entity.active,
        );
        const byDistance = (left: Enemy, right: Enemy): number => {
            const leftX = left.position.x + left.size.width / 2 - originX;
            const leftY = left.position.y + left.size.height / 2 - originY;
            const rightX = right.position.x + right.size.width / 2 - originX;
            const rightY = right.position.y + right.size.height / 2 - originY;

            return (leftX * leftX + leftY * leftY)
                - (rightX * rightX + rightY * rightY);
        };
        // 优先未折射过的敌人；不足时允许向已折射过的敌人循环折射。
        const freshTargets = enemies.filter(
            (enemy) => !laser.refractionTargetIds.has(enemy.id),
        );
        const recycledTargets = enemies.filter(
            (enemy) => enemy !== hitPlane,
        );
        const candidates = (freshTargets.length > 0
            ? freshTargets
            : recycledTargets
        ).sort(byDistance).slice(0, targetCount);

        if (candidates.length === 0) {
            // 场上只剩这一个敌人：剩余折射伤害全部结算到它身上。
            this.settleRefractions(
                world,
                player,
                laser,
                hitPlane,
                refractedDamage,
                decay,
            );
            return;
        }

        for (const target of candidates) {
            laser.refractionTargetIds.add(target.id);
            const targetX = target.position.x + target.size.width / 2;
            const targetY = target.position.y + target.size.height / 2;
            const length = Math.hypot(targetX - originX, targetY - originY);

            if (length === 0) {
                continue;
            }

            void this.playAudio(GAME_AUDIO_SOURCES.laserShot);
            const refracted = new LaserBullet({
                launcher: player,
                originX,
                originY,
                rotation: Math.atan2(targetY - originY, targetX - originX),
                length,
                damage: refractedDamage,
                faction: laser.faction,
                remainingRefractions: laser.remainingRefractions,
                refractionTargetIds: laser.refractionTargetIds,
            });
            world.addEntity(refracted);

            const damageLabel = refracted.hitOnSpawn(target);

            if (damageLabel !== undefined) {
                world.addEntity(damageLabel);
                this.refractLaser(world, refracted, target);
            }
        }
    }

    /** 场上仅剩单一敌人时，把剩余折射次数的伤害逐段衰减结算到该敌人。 */
    private settleRefractions(
        world: GameWorld,
        player: PlayerPlane,
        laser: LaserBullet,
        target: Enemy,
        initialDamage: number,
        decay: number,
    ): void {
        let damage = initialDamage;
        let remaining = laser.remainingRefractions;

        laser.remainingRefractions = 0;

        while (remaining > 0) {
            remaining -= 1;
            // 借用一次独立的命中结算（不生成可见光束）。
            const settle = new LaserBullet({
                launcher: player,
                originX: 0,
                originY: 0,
                rotation: 0,
                length: 0,
                damage,
                faction: laser.faction,
            });
            const damageLabel = settle.hitOnSpawn(target);

            if (damageLabel !== undefined) {
                world.addEntity(damageLabel);
            }

            damage *= decay;
        }
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
            damage: fireball.damage,
            faction: fireball.faction,
            traceAngle: fireball.traceAngle,
            traceTarget: target,
            findTraceTarget: (source) => this.findNearestFireballTarget(
                world,
                source,
            ),
            remainingRefractions: nextRefractions,
            refractionTargetIds: fireball.refractionTargetIds,
        });

        world.addEntity(refractedFireball);
        const damageLabel = refractedFireball.hitOnSpawn(hitEnemy);

        if (damageLabel !== undefined) {
            world.addEntity(damageLabel);
        }
    }

    private findNearestFireballTarget(
        world: GameWorld,
        source: FireballBullet,
    ): Enemy | undefined {
        const sourceX = source.position.x + source.size.width / 2;
        const sourceY = source.position.y + source.size.height / 2;
        let nearest: Enemy | undefined;
        let nearestDistanceSquared = Number.POSITIVE_INFINITY;

        for (const entity of world.entities) {
            if (
                !(entity instanceof Enemy)
                || !entity.active
                || source.refractionTargetIds.has(entity.id)
            ) {
                continue;
            }

            const targetX = entity.position.x + entity.size.width / 2;
            const targetY = entity.position.y + entity.size.height / 2;
            const offsetX = targetX - sourceX;
            const offsetY = targetY - sourceY;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;

            if (distanceSquared < nearestDistanceSquared) {
                nearest = entity;
                nearestDistanceSquared = distanceSquared;
            }
        }

        return nearest;
    }

    private emitCounterAttacks(
        world: GameWorld,
        player: PlayerPlane,
        primaryTarget: BaseEntity,
    ): void {
        player.counterAttack(
            primaryTarget,
            (source) => this.findNearestFireballTarget(world, source),
        );

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
            player.counterAttack(
                selected,
                (source) => this.findNearestFireballTarget(world, source),
            );
        }

        for (let index = selectedCount; index < extraCount; index++) {
            player.counterAttackAtAngle(
                Math.random() * Math.PI * 2,
                undefined,
                (source) => this.findNearestFireballTarget(world, source),
            );
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

    private getAssaultPair(
        left: BaseEntity,
        right: BaseEntity,
    ): { summon: AssaultSummon; enemy: Enemy } | undefined {
        if (
            left instanceof AssaultSummon
            && right instanceof Enemy
            && left.assaulting
            && left.player.active
        ) {
            return { summon: left, enemy: right };
        }

        if (
            right instanceof AssaultSummon
            && left instanceof Enemy
            && right.assaulting
            && right.player.active
        ) {
            return { summon: right, enemy: left };
        }

        return undefined;
    }

    private applyAssaultHit(
        world: GameWorld,
        pair: { summon: AssaultSummon; enemy: Enemy },
    ): void {
        const { summon, enemy } = pair;
        const [critical, damage] = rollCritical(summon, summon.assaultDamage);
        const damageLabel = enemy.takeDamage(damage, critical);

        if (damageLabel !== undefined) {
            world.addEntity(damageLabel);
            summon.assaulting = false;
            this.emitAssaultImpact(world, summon, enemy);
        }
    }

    private emitAssaultImpact(
        world: GameWorld,
        summon: AssaultSummon,
        enemy: Enemy,
    ): void {
        const centerX = (summon.position.x + summon.size.width / 2
            + enemy.position.x + enemy.size.width / 2) / 2;
        const centerY = (summon.position.y + summon.size.height / 2
            + enemy.position.y + enemy.size.height / 2) / 2;
        emitBurst(world.particles, {
            x: centerX,
            y: centerY,
            count: 14,
            color: "#ff9f5a",
            speedMin: 90,
            speedMax: 260,
            lifetimeMin: 0.2,
            lifetimeMax: 0.55,
            sizeMin: 3,
            sizeMax: 7,
            accelerationY: 40,
            drag: 2,
        });
    }

    /** 殉爆：召唤物被击毁时对周围敌人造成范围伤害（需持有殉爆道具）。 */
    private triggerSacrifice(world: GameWorld, summon: SummonPlane): void {
        const player = summon.player;
        const sacrifice = Math.max(0, player.readStat("SUMMON_SACRIFICE"));

        if (sacrifice <= 0) {
            return;
        }

        const damage = Math.max(0, player.readStat("SUMMON_DAMAGE")) * 50;
        const radius = 140;
        const centerX = summon.position.x + summon.size.width / 2;
        const centerY = summon.position.y + summon.size.height / 2;

        for (const entity of world.entities) {
            if (!(entity instanceof Enemy) || !entity.active) {
                continue;
            }

            const targetX = entity.position.x + entity.size.width / 2;
            const targetY = entity.position.y + entity.size.height / 2;
            const offsetX = targetX - centerX;
            const offsetY = targetY - centerY;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;

            if (distanceSquared > radius * radius) {
                continue;
            }

            const [critical, critDamage] = rollCritical(summon, damage);
            const damageLabel = entity.takeDamage(critDamage, critical);

            if (damageLabel !== undefined) {
                world.addEntity(damageLabel);
            }
        }

        emitRing(world.particles, {
            x: centerX,
            y: centerY,
            count: 48,
            color: "#ffb13b",
            speed: 320,
            lifetime: 0.5,
            size: 7,
            endSize: 0,
            drag: 1.2,
        });
    }
}
