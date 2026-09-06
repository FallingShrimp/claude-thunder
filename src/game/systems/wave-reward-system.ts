import { Enemy } from "../../entities/enemy";
import type { Item } from "../../entities/item";
import type { Player } from "../../entities/player";
import type { GameSystem } from "../../logic/game-system";
import type { GameWorld } from "../../logic/game-world";
import type { KeyboardInput } from "../keyboard-input";
import type { TouchInput } from "../touch-input";
import { LabelWeightItem } from "../items/label-weight-item";

export type ItemFactory = () => Item;

export interface WaveRewardSystemOptions {
    /** Boss 波判定：命中时本次奖励改用 Boss 专属池，并连续选择多次。 */
    readonly isBossWave?: (index: number) => boolean;
    /** Boss 波专属道具池（如只含传说品质道具的池子）。 */
    readonly bossPool?: readonly ItemFactory[];
    /** Boss 战结束后连续选择的次数（默认 2）。 */
    readonly bossSelectionCount?: number;
}

export class WaveRewardSystem implements GameSystem {
    private readonly choiceCount: number = 3;
    private readonly choices: Item[] = [];
    private currentWaveIndex: number = 0;
    private selectedIndex: number = 0;
    private waveHadEnemies: boolean = false;
    private selecting: boolean = false;
    private initialSelection: boolean = false;
    private previousLeft: boolean = false;
    private previousRight: boolean = false;
    private previousConfirm: boolean = false;
    private readonly labelWeightIncrements = new Map<string, number>();
    /** 本次选择使用的道具池（普通波 = itemPool，Boss 波 = bossPool）。 */
    private activePool: readonly ItemFactory[];
    /** Boss 战剩余的连续选择次数（0 表示普通波次奖励流程）。 */
    private remainingBossSelections: number = 0;
    /** 最近一次 update/初始选择的世界引用（确认后再次开启选择时复用）。 */
    private lastWorld: GameWorld | null = null;

    /** 设计基准：卡片宽度对应的屏幕宽度（原 480×720 坐标系）。 */
    private static readonly designScreenWidth: number = 480;
    /** 设计基准：卡片基础尺寸。 */
    private static readonly baseItemWidth: number = 96;
    private static readonly baseItemHeight: number = 128;
    private static readonly baseGap: number = 24;

    public constructor(
        private readonly player: Player,
        private readonly input: KeyboardInput,
        private readonly itemPool: readonly ItemFactory[],
        private readonly getItemWeight: (item: Item) => number,
        private readonly switchWave: (index: number) => void,
        private readonly hasPendingWaveEnemies: () => boolean,
        private readonly setPlayerControlsEnabled: (enabled: boolean) => void,
        private readonly screenWidth: number,
        private readonly screenHeight: number = 720,
        private readonly touch?: TouchInput,
        private readonly options: WaveRewardSystemOptions = {},
    ) {
        this.activePool = itemPool;

        // 移动端：点击某张道具卡即选中并确认。
        touch?.onTap((x, y) => {
            if (!this.selecting) {
                return;
            }

            for (const [index, item] of this.choices.entries()) {
                const scale = item.scale.x;
                const halfWidth = item.size.width * scale / 2;
                const halfHeight = item.size.height * scale / 2;
                const centerX = item.position.x + item.size.width / 2;
                const centerY = item.position.y + item.size.height / 2;

                if (
                    x >= centerX - halfWidth
                    && x <= centerX + halfWidth
                    && y >= centerY - halfHeight
                    && y <= centerY + halfHeight
                ) {
                    this.selectedIndex = index;
                    this.confirmSelection();
                    return;
                }
            }
        });
    }

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
            // Boss 波：改用 Boss 专属池并连续选择多次；普通波照常单次选择。
            const bossReward = (this.options.isBossWave?.(this.currentWaveIndex) ?? false)
                && (this.options.bossPool?.length ?? 0) >= this.choiceCount;

            this.activePool = bossReward ? this.options.bossPool! : this.itemPool;
            this.remainingBossSelections = bossReward
                ? Math.max(1, this.options.bossSelectionCount ?? 2)
                : 0;
            this.beginSelection(world);
        }
    }

    private beginSelection(world: GameWorld): void {
        if (this.activePool.length < this.choiceCount) {
            throw new RangeError("The item pool must contain at least three items.");
        }

        this.selecting = true;
        this.waveHadEnemies = false;
        this.setPlayerControlsEnabled(false);
        this.selectedIndex = 0;
        this.previousLeft = this.input.isPressed("KeyA");
        this.previousRight = this.input.isPressed("KeyD");
        this.previousConfirm = this.input.isPressed("KeyJ");

        this.layoutChoices(world, this.pickItems());
    }

    /**
     * 开局选择：展示全部候选标签权重道具，玩家选一个作为开局倾向；
     * 确认后才由 confirmSelection 开启第一波。
     */
    public beginInitialSelection(
        world: GameWorld,
        initialChoices: readonly ItemFactory[],
    ): void {
        this.selecting = true;
        this.initialSelection = true;
        this.lastWorld = world;
        this.setPlayerControlsEnabled(false);
        this.selectedIndex = 0;
        this.previousLeft = this.input.isPressed("KeyA");
        this.previousRight = this.input.isPressed("KeyD");
        this.previousConfirm = this.input.isPressed("KeyJ");

        this.layoutChoices(world, initialChoices.map((factory) => factory()));
    }

    /** 按屏幕宽度等比缩放卡片并居中排布；单排放不下时折成多排。 */
    private layoutChoices(world: GameWorld, items: Item[]): void {
        // 优先单排展示；设计宽度超出屏幕时折成多排，每排数量尽量均匀。
        const totalDesignWidth = items.length * WaveRewardSystem.baseItemWidth
            + (items.length - 1) * WaveRewardSystem.baseGap;
        const rowCount = Math.max(
            1,
            Math.ceil(totalDesignWidth / WaveRewardSystem.designScreenWidth),
        );
        const basePerRow = Math.floor(items.length / rowCount);
        const extraRows = items.length % rowCount;
        const rowCounts = Array.from(
            { length: rowCount },
            (_, row) => basePerRow + (row < extraRows ? 1 : 0),
        );
        const columns = Math.max(...rowCounts);
        const columnsDesignWidth = columns * WaveRewardSystem.baseItemWidth
            + (columns - 1) * WaveRewardSystem.baseGap;
        const scale = Math.max(
            0.5,
            Math.min(
                2.5,
                this.screenWidth
                / Math.max(WaveRewardSystem.designScreenWidth, columnsDesignWidth),
            ),
        );
        const itemWidth = WaveRewardSystem.baseItemWidth * scale;
        const itemHeight = WaveRewardSystem.baseItemHeight * scale;
        const gap = WaveRewardSystem.baseGap * scale;
        const totalHeight = itemHeight * rowCount + gap * (rowCount - 1);
        const startY = this.screenHeight * 0.32 - totalHeight / 2;

        let itemIndex = 0;

        for (const [row, count] of rowCounts.entries()) {
            const rowWidth = count * itemWidth + (count - 1) * gap;
            const startX = (this.screenWidth - rowWidth) / 2;

            for (let column = 0; column < count; column += 1) {
                const item = items[itemIndex];
                itemIndex += 1;

                if (item === undefined) {
                    continue;
                }

                item.size = { width: itemWidth, height: itemHeight };
                item.position.x = startX + column * (itemWidth + gap);
                item.position.y = startY + row * (itemHeight + gap);
                this.choices.push(item);
                world.addEntity(item);
            }
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

        if (selectedItem instanceof LabelWeightItem) {
            const previousIncrement = this.labelWeightIncrements.get(
                selectedItem.targetLabel,
            ) ?? 0;
            this.labelWeightIncrements.set(
                selectedItem.targetLabel,
                previousIncrement + selectedItem.weightIncrement,
            );
        }

        for (const item of this.choices) {
            item.active = false;
        }

        this.choices.length = 0;
        this.selecting = false;
        this.setPlayerControlsEnabled(true);

        if (this.remainingBossSelections > 0) {
            this.remainingBossSelections -= 1;

            if (this.remainingBossSelections > 0 && this.lastWorld !== null) {
                // Boss 掉落：还有剩余次数，紧接下一次选择（不推进波次）。
                this.beginSelection(this.lastWorld);
                return;
            }
        }

        if (this.initialSelection) {
            // 开局倾向选完才开启第一波。
            this.initialSelection = false;
            this.switchWave(0);
        } else {
            this.currentWaveIndex += 1;
            this.switchWave(this.currentWaveIndex);
        }
    }

    /**
     * 调试工具：手动增加某标签的抽取权重增量（对所有拥有该标签的道具生效，
     * 可传负数减少权重；增量归零后自动移除该标签的记录）。
     */
    public addLabelWeight(targetLabel: string, increment: number): void {
        if (targetLabel.length === 0) {
            throw new RangeError("The target item label must not be empty.");
        }

        if (!Number.isFinite(increment) || increment === 0) {
            throw new RangeError(
                "The label weight increment must be a non-zero finite number.",
            );
        }

        const next = (this.labelWeightIncrements.get(targetLabel) ?? 0)
            + increment;

        if (next > 0) {
            this.labelWeightIncrements.set(targetLabel, next);
        } else {
            this.labelWeightIncrements.delete(targetLabel);
        }
    }

    /** 调试工具：查看当前各标签的手动权重增量。 */
    public getLabelWeights(): Record<string, number> {
        return Object.fromEntries(this.labelWeightIncrements);
    }

    private updateChoiceAppearance(): void {
        for (const [index, item] of this.choices.entries()) {
            const selected = index === this.selectedIndex;
            item.scale = selected ? { x: 1.15, y: 1.15 } : { x: 1, y: 1 };
            item.opacity = selected ? 1 : 0.55;
        }
    }

    private pickItems(): Item[] {
        // 用 activePool（普通波 = itemPool，Boss 波 = bossPool 传说池）。
        const allCandidates = this.activePool.map((factory) => factory());
        const eligible = allCandidates.filter(
            (item) => item.displayCondition(this.player),
        );

        if (eligible.length < this.choiceCount) {
            // 满足条件的候选不足时，回退到全部候选，保证总能有足够选项。
            return this.drawItems(allCandidates, new Map());
        }

        return this.drawItems(
            eligible,
            this.distributeHiddenWeights(allCandidates, eligible),
        );
    }

    /**
     * 把不可显示道具的权重（品质基准 + 标签增量）平均分配给
     * 与其共享标签的可显示道具，避免前置道具隐藏导致流派绝迹。
     */
    private distributeHiddenWeights(
        allCandidates: Item[],
        eligible: Item[],
    ): Map<Item, number> {
        const bonus = new Map<Item, number>();

        for (const hidden of allCandidates) {
            if (hidden.displayCondition(this.player)) {
                continue;
            }

            const hiddenWeight = this.getItemWeight(hidden)
                + this.getLabelWeightIncrement(hidden);

            if (hiddenWeight <= 0) {
                continue;
            }

            const shared = eligible.filter((item) =>
                item.labels.some((label) => hidden.labels.includes(label)),
            );

            if (shared.length === 0) {
                continue;
            }

            const share = hiddenWeight / shared.length;

            for (const item of shared) {
                bonus.set(item, (bonus.get(item) ?? 0) + share);
            }
        }

        return bonus;
    }

    private getLabelWeightIncrement(item: Item): number {
        return item.labels.reduce(
            (total, label) => total
                + (this.labelWeightIncrements.get(label) ?? 0),
            0,
        );
    }

    private drawItems(
        candidates: Item[],
        weightBonus: Map<Item, number>,
    ): Item[] {
        const picked: Item[] = [];

        while (picked.length < this.choiceCount) {
            const weights = candidates.map((item) => {
                const weight = this.getItemWeight(item)
                    + this.getLabelWeightIncrement(item)
                    + (weightBonus.get(item) ?? 0);
                return Number.isFinite(weight) && weight > 0 ? weight : 0;
            });
            const totalWeight = weights.reduce((total, weight) => total + weight, 0);

            if (totalWeight <= 0) {
                throw new RangeError("At least one remaining item must have positive weight.");
            }

            let roll = Math.random() * totalWeight;
            let selectedIndex = weights.length - 1;

            for (let index = 0; index < weights.length; index += 1) {
                roll -= weights[index];

                if (roll < 0) {
                    selectedIndex = index;
                    break;
                }
            }

            const [selected] = candidates.splice(selectedIndex, 1);

            if (selected !== undefined) {
                picked.push(selected);
            }
        }

        return picked;
    }
}
