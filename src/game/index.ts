import { GameEngine } from "../logic/game-engine";
import { GameWorld } from "../logic/game-world";
import type { Wave } from "../logic/wave";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import {
    PlaceholderItemBlue,
    PlaceholderItemGreen,
    PlaceholderItemRed,
} from "./items/placeholder-items";
import { KeyboardInput } from "./keyboard-input";
import { PlayerPlane } from "./player-plane";
import { SpaceEnvironment } from "./space-environment";
import { BasicBulletCollisionSystem } from "./systems/basic-bullet-collision-system";
import {
    type ItemFactory,
    WaveRewardSystem,
} from "./systems/wave-reward-system";
import { Red } from "./enemies/red";

export function startGame(): GameEngine {
    const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

    if (canvas === null) {
        throw new Error("Game canvas element was not found.");
    }

    const world = new GameWorld();
    const renderer = new CanvasRenderer(canvas);
    const input = new KeyboardInput();
    const player = new PlayerPlane(
        input,
        (entity) => world.addEntity(entity),
    );
    const environment = new SpaceEnvironment(canvas.width, canvas.height);
    const waves = new Set<Wave>([
        {
            startIndex: 0,
            endIndex: Number.POSITIVE_INFINITY,
            spawnValue: 100,
            spawnProgress: 0,
            spawnEnemy: () => {
                const enemyWidth = 36;
                const x = Math.random() * (canvas.width - enemyWidth);

                return new Red(x, canvas.height);
            },
        },
    ]);
    const itemPool: ItemFactory[] = [
        () => new PlaceholderItemRed(),
        () => new PlaceholderItemGreen(),
        () => new PlaceholderItemBlue(),
    ];
    const systems = [new BasicBulletCollisionSystem()];
    const engine = new GameEngine(world, renderer, systems, waves);

    systems.push(new WaveRewardSystem(
        player,
        input,
        itemPool,
        (index) => engine.switchWave(index),
        (enabled) => player.setControlsEnabled(enabled),
        canvas.width,
    ));

    world.setEnvironment(environment);
    world.addEntity(player);
    engine.switchWave(0);
    engine.start();
    return engine;
}

startGame();
