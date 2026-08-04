import type { Size2D } from "./geometry";
import type { RenderAppearance } from "./render-appearance";
import { RenderableTarget } from "./renderable-target";

export abstract class BaseEnvironment extends RenderableTarget {
    protected constructor(size: Size2D, appearance: RenderAppearance) {
        super({ x: 0, y: 0 }, size, appearance);
        this.zIndex = Number.MIN_SAFE_INTEGER;
    }

    public abstract update(delta: number): void;

    public abstract draw(context: CanvasRenderingContext2D): void;
}
