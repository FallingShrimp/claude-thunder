import type { RenderableTarget } from "../core/renderable-target";

export interface Renderer {
    clear(): void;
    render(targets: readonly RenderableTarget[]): void;
}
