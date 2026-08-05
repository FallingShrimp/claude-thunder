import type { RenderableTarget } from "../core/renderable-target";
import type { CameraShakeController } from "./camera-shake-controller";

export interface Renderer {
    readonly camera: CameraShakeController;
    clear(): void;
    render(targets: readonly RenderableTarget[]): void;
}
