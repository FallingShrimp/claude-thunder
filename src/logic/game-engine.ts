import { Plane } from "../entities/plane";
import type { Renderer } from "../rendering/renderer";
import type { GameSystem } from "./game-system";
import type { GameWorld } from "./game-world";
import type { Wave } from "./wave";
import { WaveSystem } from "./wave-system";

export class GameEngine {
    private animationFrameId: number | null = null;
    private previousTime: number | null = null;
    private readonly waveSystem: WaveSystem;

    public constructor(
        private readonly world: GameWorld,
        private readonly renderer: Renderer,
        private readonly systems: readonly GameSystem[],
        waves: ReadonlySet<Wave> = new Set(),
        isBossWave: (index: number) => boolean = () => false,
    ) {
        this.waveSystem = new WaveSystem(world, waves, isBossWave);
    }

    public start(): void {
        if (this.animationFrameId !== null) {
            return;
        }

        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    public switchWave(index: number): void {
        this.waveSystem.switchTo(index);
    }

    public hasPendingWaveEnemies(): boolean {
        return this.waveSystem.hasPendingEnemies();
    }

    /** 当前波次索引（0 起，供 HUD 等显示使用）。 */
    public getWaveIndex(): number {
        return this.waveSystem.currentIndex;
    }

    public stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = null;
        this.previousTime = null;
    }

    private readonly tick = (currentTime: number): void => {
        const deltaTime = this.previousTime === null ? 0 : (currentTime - this.previousTime) / 1000;

        this.previousTime = currentTime;

        if (!this.world.paused) {
            this.world.elapsedTime += deltaTime;
            this.renderer.camera.update(deltaTime);
            this.world.environment?.update(deltaTime);
            for (const entity of this.world.entities) {
                if (entity.active) {
                    if (entity instanceof Plane) {
                        entity.updateInvincibility(deltaTime);
                    }

                    entity.ai(deltaTime);
                }
            }

            this.waveSystem.update();

            for (const system of this.systems) {
                system.update(this.world, deltaTime);
            }

            this.world.removeInactiveEntities();
            this.renderer.clear();
            this.renderer.render([
                ...(this.world.environment === null ? [] : [this.world.environment]),
                ...this.world.entities,
                this.world.particles,
            ]);
        }

        this.animationFrameId = requestAnimationFrame(this.tick);
    };
}
