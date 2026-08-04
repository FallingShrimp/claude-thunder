import { Game } from '../core/Game';
import { AssetLoader } from '../infrastructure/AssetLoader';
import { AudioManager } from '../infrastructure/AudioManager';
import { CharacterConfigStore } from '../infrastructure/CharacterConfigStore';
import { InputController } from '../infrastructure/InputController';
import { CanvasRenderer } from '../presentation/CanvasRenderer';
import { DomHud } from '../presentation/DomHud';
import { ResponsiveCanvas } from '../presentation/ResponsiveCanvas';

export class GameApplication {
    private readonly game = new Game();
    private readonly audio = new AudioManager();
    private readonly hud = new DomHud();
    private readonly configStore = new CharacterConfigStore();
    private input!: InputController;
    private renderer!: CanvasRenderer;
    private lastFrame = 0;

    async initialize(): Promise<void> {
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) throw new Error('无法初始化游戏画布');
        const [assets] = await Promise.all([new AssetLoader().load(), Promise.race([this.audio.preload(), new Promise(resolve => setTimeout(resolve, 8000))])]);
        const config = this.configStore.load(); if (config.imageData) assets.playerImage.src = config.imageData; this.updateTitle(config.name);
        this.renderer = new CanvasRenderer(canvas, context, assets); this.input = new InputController(canvas, document.getElementById('skillButton'));
        new ResponsiveCanvas(canvas, document.getElementById('stats'));
        this.bindUi(assets.playerImage);
        const loading = document.getElementById('loading'); if (loading) loading.style.display = 'none';
        requestAnimationFrame(timestamp => this.frame(timestamp));
    }

    private start = (): void => { this.game.start(); this.hud.setStarted(true); this.audio.startMusic(); };
    private frame(timestamp: number): void {
        const delta = this.lastFrame ? (timestamp - this.lastFrame) / 1000 : 1 / 60; this.lastFrame = timestamp;
        this.game.update(delta, this.input.snapshot());
        for (const event of this.game.drainEvents()) { this.audio.handle(event); if (event.type === 'shake') this.renderer.shake(event.intensity, event.duration); if (event.type === 'gameOver') { this.audio.stopMusic(); this.hud.showGameOver(event.score); } }
        this.renderer.render(this.game.state); this.hud.update(this.game.state); requestAnimationFrame(next => this.frame(next));
    }

    private bindUi(playerImage: HTMLImageElement): void {
        document.getElementById('startButton')?.addEventListener('click', this.start); document.getElementById('restartButton')?.addEventListener('click', this.start);
        const canvas = document.getElementById('gameCanvas'); canvas?.addEventListener('click', () => { if (!this.game.state.running) this.start(); });
        addEventListener('keydown', event => { if (!this.game.state.running && (event.key === 'Enter' || event.code === 'Space')) this.start(); });
        const modal = document.getElementById('charConfig'); const preview = document.getElementById('previewImage') as HTMLImageElement | null; const input = document.getElementById('charImage') as HTMLInputElement | null;
        const uploadArea = document.getElementById('uploadArea');
        const displayFile = async (file?: File) => { if (file?.type.startsWith('image/') && preview) { preview.src = await this.configStore.readImage(file); preview.style.display = 'block'; document.getElementById('uploadPlaceholder')?.style.setProperty('display', 'none'); } };
        const show = () => { if (modal) modal.style.display = 'flex'; }; const hide = () => { if (modal) modal.style.display = 'none'; };
        document.getElementById('showConfigButton')?.addEventListener('click', show); document.getElementById('cancelConfigButton')?.addEventListener('click', hide); uploadArea?.addEventListener('click', () => input?.click());
        uploadArea?.addEventListener('dragover', event => { event.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea?.addEventListener('drop', event => { event.preventDefault(); uploadArea.classList.remove('dragover'); void displayFile(event.dataTransfer?.files[0]); });
        input?.addEventListener('change', () => { void displayFile(input.files?.[0]); });
        document.getElementById('saveConfigButton')?.addEventListener('click', () => { const name = (document.getElementById('charName') as HTMLInputElement | null)?.value ?? ''; const imageData = preview?.src?.startsWith('data:') ? preview.src : null; this.configStore.save({ name, imageData }); if (imageData) playerImage.src = imageData; this.updateTitle(name); hide(); });
        document.getElementById('resetConfigButton')?.addEventListener('click', () => { this.configStore.reset(); location.reload(); });
    }
    private updateTitle(name: string): void { const display = name || 'Claude'; document.title = `${display} VS 雷电`; document.querySelector('.menu-title')!.textContent = `${display} VS 雷电`; const stats = document.getElementById('statsTitle'); if (stats) stats.textContent = display; }
}
