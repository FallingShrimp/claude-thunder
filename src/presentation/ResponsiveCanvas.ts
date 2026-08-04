import { VIEWPORT } from '../config/constants';

export class ResponsiveCanvas {
    constructor(private readonly canvas: HTMLCanvasElement, private readonly stats: HTMLElement | null) {
        addEventListener('resize', () => this.resize()); this.resize();
    }
    resize(): void {
        const container = this.canvas.parentElement; if (!container) return;
        const scale = Math.min(container.clientWidth / VIEWPORT.width, container.clientHeight / VIEWPORT.height);
        this.canvas.style.width = `${VIEWPORT.width * scale}px`; this.canvas.style.height = `${VIEWPORT.height * scale}px`;
        if (this.stats) { const rect = this.canvas.getBoundingClientRect(); this.stats.style.left = `${rect.right}px`; this.stats.style.top = `${rect.top + rect.height / 2}px`; }
    }
}
