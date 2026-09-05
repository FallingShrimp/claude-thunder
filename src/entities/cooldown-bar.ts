import { BaseEntity } from "../core/entity";

export type CooldownBarAlignment = "left" | "right";

export interface CooldownBarOptions {
    /** 进度提供者：返回 0（刚触发）到 1（就绪）之间的冷却恢复进度。 */
    getProgress: () => number;
    alignment: CooldownBarAlignment;
    foregroundColor: string;
}

/** 玩家机身侧边的冷却进度条（左侧格挡、右侧冲刺），竖向自下而上填充。 */
export class CooldownBar extends BaseEntity {
    public static readonly width: number = 6;
    public static readonly height: number = 40;
    public static readonly gap: number = 6;

    public readonly alignment: CooldownBarAlignment;
    public readonly getProgress: () => number;
    public readonly backgroundColor: string = "#102030";
    public readonly foregroundColor: string;
    private readonly player: BaseEntity;
    private readonly playerSize: { width: number; height: number };

    public constructor(
        player: BaseEntity,
        options: CooldownBarOptions,
    ) {
        super(
            crypto.randomUUID(),
            { x: 0, y: 0 },
            { width: CooldownBar.width, height: CooldownBar.height },
            { shape: "rectangle", color: options.foregroundColor },
        );

        this.player = player;
        this.playerSize = { ...player.size };
        this.alignment = options.alignment;
        this.getProgress = options.getProgress;
        this.foregroundColor = options.foregroundColor;
        this.zIndex = player.zIndex + 1;
    }

    public override ai(delta: number): void {
        void delta;
        // 竖条贴在机身左右两侧，垂直居中。
        this.position.x = this.alignment === "left"
            ? this.player.position.x - this.size.width - CooldownBar.gap
            : this.player.position.x + this.playerSize.width
                + CooldownBar.gap;
        this.position.y = this.player.position.y
            + (this.playerSize.height - this.size.height) / 2;
        this.active = this.player.active;
        this.visible = this.player.visible;
    }

    public override getEntityType(): string {
        return "cooldownbar";
    }
}
