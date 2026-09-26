import { BaseEntity } from "../core/entity";

/** 左上角波次信息 HUD：显示“第X波 - Boss将在R波后到来”。 */
export class WaveInfoHud extends BaseEntity {
    /** 渲染器每帧绘制的文字（在 ai 中根据当前波次刷新）。 */
    public text: string = "";

    public constructor(
        private readonly getWaveIndex: () => number,
        private readonly bossInterval: number = 15,
    ) {
        super(
            crypto.randomUUID(),
            { x: 10, y: 8 },
            { width: 240, height: 20 },
            { shape: "rectangle", color: "#f0f0f8" },
        );

        this.zIndex = 40;
    }

    public override ai(delta: number): void {
        void delta;

        const index = this.getWaveIndex();

        // Boss 波次隐藏波次信息（Boss 血条已占顶部）。
        this.visible = !(index > 0 && index % this.bossInterval === 0);

        const nextBossIndex = (Math.floor(index / this.bossInterval) + 1) * this.bossInterval;

        this.text = `第${index + 1}波 - Boss将在${nextBossIndex - index}波后到来`;
    }

    public override getEntityType(): "wave-info" {
        return "wave-info";
    }
}
