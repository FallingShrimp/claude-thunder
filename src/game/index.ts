import { GameEngine } from "../logic/game-engine";
import { GameWorld } from "../logic/game-world";
import { CanvasRenderer } from "../rendering/canvas-renderer";

export function startGame(): GameEngine {
    const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

    if (canvas === null) {
        throw new Error("Game canvas element was not found.");
    }

    const world = new GameWorld();
    const renderer = new CanvasRenderer(canvas);
    const engine = new GameEngine(world, renderer, []);

    engine.start();
    return engine;
}

startGame();
