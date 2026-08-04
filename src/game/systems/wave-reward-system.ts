import { Enemy } from "../../entities/enemy";
import type { Item } from "../../entities/item";
import type { Player } from "../../entities/player";
import type { GameSystem } from "../../logic/game-system";
import type { GameWorld } from "../../logic/game-world";
import type { KeyboardInput } from "../keyboard-input";

export type ItemFactory = () => Item;

export class WaveRewardSystem implements GameSystem {
    private readonly choiceCount: number = 3;
    private readonly choices: Item[] = [];
    private currentWaveIndex: number = 0;
    private selectedIndex: number = 0;
    private waveHadEnemies: boolean = false;
    private selecting: boolean = false;
    private previousLeft: boolean = false;
    private previousRight: boolean = false;
    private previousConfirm: boolean = false;

    public constructor(
        private readonly player: Player,
        private readonly input: KeyboardInput,
        private readonly itemPool: readonly ItemFactory[],
        private readonly switchWave: (index: number) => void,
        private readonly hasPendingWaveEnemies: () => boolean,
        private readonly setPlayerControlsEnabled: (enabled: boolean) => void,
        private readonly screenWidth: number,
    ) { }

    public update(world: GameWorld, deltaTime: number): void {
        void deltaTime;

        if (this.selecting) {
            this.updateSelection();
            return;
        }

        const hasEnemies = world.entities.some(
            (entity) => entity.active && entity instanceof Enemy,
        );

        if (hasEnemies) {
            this.waveHadEnemies = true;
        } else if (this.waveHadEnemies && !this.hasPendingWaveEnemies()) {
            this.beginSelection(world);
        }
    }

    private beginSelection(world: GameWorld): void {
        if (this.itemPool.length < this.choiceCount) {
            throw new RangeError("The item pool must contain at least three items.");
        }

        this.selecting = true;
        this.waveHadEnemies = false;
        this.setPlayerControlsEnabled(false);
        this.selectedIndex = 0;
        this.previousLeft = this.input.isPressed("KeyA");
        this.previousRight = this.input.isPressed("KeyD");
        this.previousConfirm = this.input.isPressed("KeyJ");

        const factories = this.pickFactories();
        const gap = 24;
        const itemWidth = 96;
        const totalWidth = itemWidth * this.choiceCount
            + gap * (this.choiceCount - 1);
        const startX = (this.screenWidth - totalWidth) / 2;

        for (const [index, factory] of factories.entries()) {
            const item = factory();
            item.position.x = startX + index * (itemWidth + gap);
            this.choices.push(item);
            world.addEntity(item);
        }

        this.updateChoiceAppearance();
    }

    private updateSelection(): void {
        const left = this.input.isPressed("KeyA");
        const right = this.input.isPressed("KeyD");
        const confirm = this.input.isPressed("KeyJ");

        if (left && !this.previousLeft) {
            this.selectedIndex = (
                this.selectedIndex - 1 + this.choices.length
            ) % this.choices.length;
            this.updateChoiceAppearance();
        }

        if (right && !this.previousRight) {
            this.selectedIndex = (this.selectedIndex + 1) % this.choices.length;
            this.updateChoiceAppearance();
        }

        if (confirm && !this.previousConfirm) {
            this.confirmSelection();
        }

        this.previousLeft = left;
        this.previousRight = right;
        this.previousConfirm = confirm;
    }

    private confirmSelection(): void {
        const selectedItem = this.choices[this.selectedIndex];

        selectedItem?.apply(this.player);

        for (const item of this.choices) {
            item.active = false;
        }

        this.choices.length = 0;
        this.selecting = false;
        this.setPlayerControlsEnabled(true);
        this.currentWaveIndex += 1;
        this.switchWave(this.currentWaveIndex);
    }

    private updateChoiceAppearance(): void {
        for (const [index, item] of this.choices.entries()) {
            const selected = index === this.selectedIndex;
            item.scale = selected ? { x: 1.15, y: 1.15 } : { x: 1, y: 1 };
            item.opacity = selected ? 1 : 0.55;
        }
    }

    private pickFactories(): ItemFactory[] {
        const shuffled = [...this.itemPool];

        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const targetIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[targetIndex]] = [
                shuffled[targetIndex],
                shuffled[index],
            ];
        }

        return shuffled.slice(0, this.choiceCount);
    }
}
