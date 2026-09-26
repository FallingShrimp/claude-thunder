import { BaseEntity } from "../core/entity";
import { Plane } from "./plane";

export class Healthbar extends BaseEntity {
    public readonly entity: BaseEntity;
    public backgroundColor: string = "#321010";
    public middleColor: string = "#f0b429";
    public foregroundColor: string = "#35d04f";
    /** 阶段分割线（血量比例位置，如 [1/3, 2/3]），空数组表示不绘制。 */
    public dividers: readonly number[] = [];
    public foregroundProgress: number;
    public middleProgress: number;

    public constructor(entity: BaseEntity, width: number = 48, height: number = 6) {
        if (!(entity instanceof Plane)) {
            throw new TypeError("Healthbar entity must be a Plane.");
        }

        super(
            `${entity.id}-healthbar`,
            { x: entity.position.x, y: entity.position.y - height - 10 },
            { width, height },
            { shape: "rectangle", color: "#35d04f" },
        );

        this.entity = entity;
        this.foregroundProgress = this.getHealthProgress();
        this.middleProgress = this.foregroundProgress;
        this.zIndex = entity.zIndex + 1;
    }

    public override ai(delta: number): void {
        this.position.x = this.entity.position.x + (this.entity.size.width - this.size.width) / 2;
        this.position.y = this.entity.position.y - this.size.height - 10;
        this.foregroundProgress = this.getHealthProgress();

        const lerpFactor = 1 - Math.pow(1 - 0.1, delta * 60);
        this.middleProgress += (this.foregroundProgress - this.middleProgress) * lerpFactor;
        this.active = this.entity.active;
        this.visible = this.entity.visible;
    }

    public override getEntityType(): "healthbar" {
        return "healthbar";
    }

    private getHealthProgress(): number {
        const plane = this.entity as Plane;

        if (plane.maxHealth <= 0) {
            return 0;
        }

        return Math.max(0, Math.min(1, plane.health / plane.maxHealth));
    }
}
