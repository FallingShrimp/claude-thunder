export interface CharacterConfig { name: string; imageData: string | null }

export class CharacterConfigStore {
    private readonly key = 'charConfig';
    load(): CharacterConfig { try { return { name: '', imageData: null, ...JSON.parse(localStorage.getItem(this.key) ?? '{}') }; } catch { return { name: '', imageData: null }; } }
    save(config: CharacterConfig): void { localStorage.setItem(this.key, JSON.stringify(config)); }
    reset(): void { localStorage.removeItem(this.key); }
    readImage(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
}
