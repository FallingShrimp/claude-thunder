interface AudioPoolSlot {
    readonly audio: HTMLAudioElement;
    playing: boolean;
}

interface AudioPool {
    readonly objectUrl: string;
    readonly slots: AudioPoolSlot[];
}

export class AudioSystem {
    public static readonly maxParallelCount: number = 4;

    private readonly pools = new Map<string, AudioPool>();
    private readonly loadingTasks = new Map<string, Promise<void>>();

    public async loadAudio(source: string): Promise<void> {
        if (this.pools.has(source)) {
            return;
        }

        const loadingTask = this.loadingTasks.get(source);

        if (loadingTask !== undefined) {
            return loadingTask;
        }

        const task = this.createPool(source);
        this.loadingTasks.set(source, task);

        try {
            await task;
        } finally {
            this.loadingTasks.delete(source);
        }
    }

    public async playAudio(source: string): Promise<boolean> {
        await this.loadAudio(source);

        const pool = this.pools.get(source);
        const slot = pool?.slots.find((candidate) => !candidate.playing);

        if (slot === undefined) {
            return false;
        }

        slot.playing = true;
        slot.audio.currentTime = 0;

        try {
            await slot.audio.play();
            return true;
        } catch (error: unknown) {
            slot.playing = false;
            throw error;
        }
    }

    public unloadAudio(source: string): void {
        const pool = this.pools.get(source);

        if (pool === undefined) {
            return;
        }

        for (const slot of pool.slots) {
            slot.audio.pause();
            slot.audio.removeAttribute("src");
            slot.audio.load();
            slot.playing = false;
        }

        URL.revokeObjectURL(pool.objectUrl);
        this.pools.delete(source);
    }

    public destroy(): void {
        for (const source of [...this.pools.keys()]) {
            this.unloadAudio(source);
        }
    }

    private async createPool(source: string): Promise<void> {
        const response = await fetch(source);

        if (!response.ok) {
            throw new Error(
                `Failed to load audio: ${source} (${response.status}).`,
            );
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const slots = Array.from(
            { length: AudioSystem.maxParallelCount },
            () => this.createSlot(objectUrl),
        );

        if (this.pools.has(source)) {
            URL.revokeObjectURL(objectUrl);
            return;
        }

        this.pools.set(source, { objectUrl, slots });
    }

    private createSlot(objectUrl: string): AudioPoolSlot {
        const audio = new Audio(objectUrl);
        const slot: AudioPoolSlot = {
            audio,
            playing: false,
        };
        const release = (): void => {
            slot.playing = false;
        };

        audio.preload = "auto";
        audio.addEventListener("ended", release);
        audio.addEventListener("error", release);
        audio.load();
        return slot;
    }
}
