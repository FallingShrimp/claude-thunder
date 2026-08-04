import type { InputSnapshot, Vector2 } from '../core/types';

export class InputController {
    private readonly keys = new Set<string>();
    private pointer: Vector2 | null = null;
    private skillPulse = false;

    constructor(private readonly canvas: HTMLCanvasElement, skillButton: HTMLElement | null) {
        addEventListener('keydown', event => { this.keys.add(event.key.toLowerCase()); if (event.code === 'Space') this.skillPulse = true; });
        addEventListener('keyup', event => this.keys.delete(event.key.toLowerCase()));
        canvas.addEventListener('touchstart', event => { event.preventDefault(); this.updatePointer(event.touches[0]); this.keys.add('j'); this.keys.delete('k'); }, { passive: false });
        canvas.addEventListener('touchmove', event => { event.preventDefault(); this.updatePointer(event.touches[0]); }, { passive: false });
        canvas.addEventListener('touchend', event => { event.preventDefault(); this.pointer = null; this.keys.delete('j'); this.keys.add('k'); }, { passive: false });
        const useSkill = (event: Event) => { event.preventDefault(); this.skillPulse = true; };
        skillButton?.addEventListener('click', useSkill);
        skillButton?.addEventListener('touchstart', useSkill, { passive: false });
    }

    snapshot(): InputSnapshot {
        const skillPressed = this.skillPulse || this.keys.has(' '); this.skillPulse = false;
        return { left: this.keys.has('a') || this.keys.has('arrowleft'), right: this.keys.has('d') || this.keys.has('arrowright'), up: this.keys.has('w') || this.keys.has('arrowup'), down: this.keys.has('s') || this.keys.has('arrowdown'), shoot: this.keys.has('j'), parry: this.keys.has('k'), skillPressed, pointer: this.pointer };
    }

    private updatePointer(touch?: Touch): void {
        if (!touch) return; const rect = this.canvas.getBoundingClientRect();
        this.pointer = { x: (touch.clientX - rect.left) * this.canvas.width / rect.width, y: (touch.clientY - rect.top) * this.canvas.height / rect.height };
    }
}
