import type { GameWorld } from "./game-world";

export interface GameSystem {
    update(world: GameWorld, deltaTime: number): void;
}
