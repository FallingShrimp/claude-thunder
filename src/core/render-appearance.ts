export type RenderShape = "rectangle" | "ellipse" | "sprite";

export interface RenderAppearance {
    shape: RenderShape;
    color: string;
    spriteSource?: string;
}
