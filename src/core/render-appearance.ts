export type RenderShape = "rectangle" | "ellipse" | "triangle" | "star" | "sprite";

export interface RenderAppearance {
    shape: RenderShape;
    color: string;
    spriteSource?: string;
}
