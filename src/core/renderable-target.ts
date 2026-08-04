import type { Size2D, Vector2 } from "./geometry";
import type { RenderAppearance } from "./render-appearance";

export abstract class RenderableTarget {
    public position: Vector2;
    public size: Size2D;
    public rotation: number;
    public scale: Vector2;
    public opacity: number;
    public visible: boolean;
    public zIndex: number;
    public appearance: RenderAppearance;

    protected constructor(
        position: Vector2,
        size: Size2D,
        appearance: RenderAppearance,
    ) {
        this.position = position;
        this.size = size;
        this.appearance = appearance;
        this.rotation = 0;
        this.scale = { x: 1, y: 1 };
        this.opacity = 1;
        this.visible = true;
        this.zIndex = 0;
    }
}
