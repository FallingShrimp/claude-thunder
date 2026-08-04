import { ASSETS } from '../config/constants';

export interface GameAssets { playerImage: HTMLImageElement }

export class AssetLoader {
    async load(): Promise<GameAssets> {
        const playerImage = new Image(); playerImage.src = ASSETS.player;
        await new Promise<void>(resolve => { playerImage.onload = () => resolve(); playerImage.onerror = () => resolve(); });
        return { playerImage };
    }
}
