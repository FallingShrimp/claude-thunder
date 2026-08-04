export class KeyboardInput {
    private readonly pressedKeys = new Set<string>();

    public constructor() {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        window.addEventListener("blur", this.handleBlur);
    }

    public isPressed(code: string): boolean {
        return this.pressedKeys.has(code);
    }

    public destroy(): void {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
        window.removeEventListener("blur", this.handleBlur);
        this.pressedKeys.clear();
    }

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        this.pressedKeys.add(event.code);
    };

    private readonly handleKeyUp = (event: KeyboardEvent): void => {
        this.pressedKeys.delete(event.code);
    };

    private readonly handleBlur = (): void => {
        this.pressedKeys.clear();
    };
}
