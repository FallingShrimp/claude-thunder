import type { Wave } from "../../logic/wave";
import { Red } from "../enemies/red";

export class RedWave implements Wave {
    public readonly startIndex: number = 0;
    public readonly endIndex: number = Number.POSITIVE_INFINITY;
    public readonly spawnValue: number = 100;
    public spawnProgress: number = 0;

    public constructor(
        private readonly screenWidth: number,
        private readonly screenHeight: number,
    ) { }

    public spawnEnemy(): Red {
        const enemyWidth = 36;
        const x = Math.random() * (this.screenWidth - enemyWidth);

        return new Red(x, this.screenHeight);
    }
}
