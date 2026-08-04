import type { Player } from "../entities/player";

export class PlayerHud {
    private readonly scoreElement: HTMLElement;
    private readonly healthElement: HTMLElement;
    private readonly livesElement: HTMLElement;

    public constructor(private readonly root: HTMLElement) {
        this.scoreElement = this.createField("score");
        this.healthElement = this.createField("health");
        this.livesElement = this.createField("lives");
    }

    public update(player: Player): void {
        this.scoreElement.textContent = `Score: ${player.score}`;
        this.healthElement.textContent = `Health: ${player.health}/${player.maxHealth}`;
        this.livesElement.textContent = `Lives: ${player.lives}`;
    }

    private createField(name: string): HTMLElement {
        const element = document.createElement("span");
        element.dataset.field = name;
        this.root.append(element);
        return element;
    }
}
