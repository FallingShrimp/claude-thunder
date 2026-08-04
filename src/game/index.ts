import { GameEngine } from "../logic/game-engine";
import { GameWorld } from "../logic/game-world";
import type { Wave } from "../logic/wave";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import { KeyboardInput } from "./keyboard-input";
import { PlayerPlane } from "./player-plane";
import { SpaceEnvironment } from "./space-environment";
import { RedWave } from "./waves/red-wave";

export function startGame(): GameEngine {
    const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

    if (canvas === null) {
        throw new Error("Game canvas element was not found.");
    }

    const world = new GameWorld();
    const renderer = new CanvasRenderer(canvas);
    const input = new KeyboardInput();
    const player = new PlayerPlane(input);
    const environment = new SpaceEnvironment(canvas.width, canvas.height);
    const waves = new Set<Wave>([
        new RedWave(canvas.width, canvas.height),
    ]);
    const engine = new GameEngine(world, renderer, [], waves);

    world.setEnvironment(environment);
    world.addEntity(player);
    engine.switchWave(0);
    engine.start();
    return engine;
}

startGame();
