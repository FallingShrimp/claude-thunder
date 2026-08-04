export type RenderShape = "rectangle" | "ellipse" | "triangle" | "sprite";

export interface RenderAppearance {
    shape: RenderShape;
    color: string;
    spriteSource?: string;
}
