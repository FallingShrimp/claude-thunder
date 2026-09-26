/**
 * 触摸 / 鼠标输入：为移动端提供「按住移动+攻击 / 松开格挡」的操控方式，
 * 同时为道具选择提供点击（tap）判定。
 *
 * 坐标统一换算为 Canvas 逻辑坐标（考虑画布缩放与设备像素比），
 * 与渲染层使用的坐标系保持一致。
 */
export class TouchInput {
    /** 是否有手指/鼠标按住屏幕。 */
    public isDown: boolean = false;
    /** 手指/鼠标当前所在位置的逻辑坐标（Canvas 坐标系）。 */
    public targetX: number = 0;
    public targetY: number = 0;
    /** 绑定的画布，供读取逻辑尺寸做边界限制。 */
    public readonly canvas: HTMLCanvasElement;

    /** 按下时的位置，用于区分「点击」与「拖动」。 */
    private pressX: number = 0;
    private pressY: number = 0;
    private readonly moveThreshold: number = 12;
    private readonly tapListeners = new Set<(x: number, y: number) => void>();

    public constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        canvas.addEventListener("touchstart", this.handleTouchStart, {
            passive: false,
        });
        canvas.addEventListener("touchmove", this.handleTouchMove, {
            passive: false,
        });
        canvas.addEventListener("touchend", this.handleTouchEnd, {
            passive: false,
        });
        canvas.addEventListener("touchcancel", this.handleTouchCancel, {
            passive: false,
        });
        canvas.addEventListener("mousedown", this.handleMouseDown);
        canvas.addEventListener("mousemove", this.handleMouseMove);
        canvas.addEventListener("mouseup", this.handleMouseUp);
        canvas.addEventListener("mouseleave", this.handleMouseLeave);
    }

    /** 注册点击回调（松开时位移小于阈值视为点击）。 */
    public onTap(listener: (x: number, y: number) => void): void {
        this.tapListeners.add(listener);
    }

    /** 是否处于「点按卡片」的点击状态（按下且未超过移动阈值）。 */
    public isTap(): boolean {
        return (
            this.isDown &&
            Math.hypot(this.targetX - this.pressX, this.targetY - this.pressY) < this.moveThreshold
        );
    }

    public destroy(): void {
        this.canvas.removeEventListener("touchstart", this.handleTouchStart);
        this.canvas.removeEventListener("touchmove", this.handleTouchMove);
        this.canvas.removeEventListener("touchend", this.handleTouchEnd);
        this.canvas.removeEventListener("touchcancel", this.handleTouchCancel);
        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        this.canvas.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("mouseup", this.handleMouseUp);
        this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
        this.tapListeners.clear();
    }

    private toLogicalCoordinates(
        clientX: number,
        clientY: number,
    ): {
        x: number;
        y: number;
    } {
        const rect = this.canvas.getBoundingClientRect();
        const viewportAspect = rect.width / rect.height;
        const canvasAspect = this.canvas.width / this.canvas.height;

        // 游戏画面始终等比缩放（object-fit: contain），画布元素内可能有留白。
        // 这里计算实际绘制区域，把屏幕坐标正确映射回 480×720 逻辑坐标系。
        let drawWidth = rect.width;
        let drawHeight = rect.height;
        let offsetX = 0;
        let offsetY = 0;

        if (viewportAspect > canvasAspect) {
            drawWidth = rect.height * canvasAspect;
            offsetX = (rect.width - drawWidth) / 2;
        } else {
            drawHeight = rect.width / canvasAspect;
            offsetY = (rect.height - drawHeight) / 2;
        }

        return {
            x: (clientX - rect.left - offsetX) * (this.canvas.width / drawWidth),
            y: (clientY - rect.top - offsetY) * (this.canvas.height / drawHeight),
        };
    }

    private updatePointer(clientX: number, clientY: number): void {
        const { x, y } = this.toLogicalCoordinates(clientX, clientY);
        this.targetX = x;
        this.targetY = y;
    }

    private readonly handleTouchStart = (event: TouchEvent): void => {
        event.preventDefault();
        const touch = event.touches[0];

        if (touch === undefined) {
            return;
        }

        this.updatePointer(touch.clientX, touch.clientY);
        this.pressX = this.targetX;
        this.pressY = this.targetY;
        this.isDown = true;
    };

    private readonly handleTouchMove = (event: TouchEvent): void => {
        event.preventDefault();
        const touch = event.touches[0];

        if (touch !== undefined) {
            this.updatePointer(touch.clientX, touch.clientY);
        }
    };

    private readonly handleTouchEnd = (event: TouchEvent): void => {
        event.preventDefault();

        if (!this.isDown) {
            return;
        }

        const wasTap = this.isTap();
        this.isDown = false;

        if (wasTap) {
            for (const listener of this.tapListeners) {
                listener(this.targetX, this.targetY);
            }
        }
    };

    private readonly handleTouchCancel = (event: TouchEvent): void => {
        event.preventDefault();
        this.isDown = false;
    };

    private readonly handleMouseDown = (event: MouseEvent): void => {
        event.preventDefault();
        this.updatePointer(event.clientX, event.clientY);
        this.pressX = this.targetX;
        this.pressY = this.targetY;
        this.isDown = true;
    };

    private readonly handleMouseMove = (event: MouseEvent): void => {
        if (this.isDown) {
            this.updatePointer(event.clientX, event.clientY);
        }
    };

    private readonly handleMouseUp = (event: MouseEvent): void => {
        event.preventDefault();

        if (!this.isDown) {
            return;
        }

        this.updatePointer(event.clientX, event.clientY);
        const wasTap = this.isTap();
        this.isDown = false;

        if (wasTap) {
            for (const listener of this.tapListeners) {
                listener(this.targetX, this.targetY);
            }
        }
    };

    private readonly handleMouseLeave = (): void => {
        this.isDown = false;
    };
}
