import { AudioSystem } from "../audio/audio-system";
import { GameEngine } from "../logic/game-engine";
import type { GameSystem } from "../logic/game-system";
import { GameWorld } from "../logic/game-world";
import type { Wave } from "../logic/wave";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import { items } from "./items/stat-upgrade-items";
import { getQualityWeight, type Quality } from "./items/quality";
import { ALL_GAME_AUDIO_SOURCES } from "./audio-assets";
import { KeyboardInput } from "./keyboard-input";
import { PlayerPlane } from "./player-plane";
import { SpaceEnvironment } from "./space-environment";
import { GameCollisionSystem } from "./systems/game-collision-system";
import {
    type ItemFactory,
    WaveRewardSystem,
} from "./systems/wave-reward-system";
import { Cyan, Orange, Purple, Red } from "./enemies";

export async function startGame(): Promise<GameEngine> {
    const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
    const loadingScreen = document.querySelector<HTMLElement>("#loading-screen");
    const loadingStatus = document.querySelector<HTMLElement>("#loading-status");
    const loadingProgress = document.querySelector<HTMLProgressElement>(
        "#loading-progress",
    );

    if (canvas === null) {
        throw new Error("Game canvas element was not found.");
    }

    if (
        loadingScreen === null
        || loadingStatus === null
        || loadingProgress === null
    ) {
        throw new Error("Game loading screen elements were not found.");
    }

    const world = new GameWorld();
    const renderer = new CanvasRenderer(canvas);
    const input = new KeyboardInput();
    const audioSystem = new AudioSystem();
    const player = new PlayerPlane(
        input,
        audioSystem,
        (entity) => world.addEntity(entity),
    );
    const environment = new SpaceEnvironment(canvas.width, canvas.height);
    const waves = new Set<Wave>([
        {
            startIndex: 0,
            endIndex: Number.POSITIVE_INFINITY,
            spawnValue: 463,
            spawnProgress: 0,
            spawnEnemy() {
                return new Red(
                    Math.random() * (canvas.width - 36),
                    canvas.height,
                    (entity) => world.addEntity(entity),
                );
            },
        },
        {
            startIndex: 2,
            endIndex: Number.POSITIVE_INFINITY,
            spawnValue: 371,
            spawnProgress: 0,
            spawnEnemy() {
                return new Orange(Math.random() * (canvas.width - 27), canvas.height);
            },
        },
        {
            startIndex: 2,
            endIndex: Number.POSITIVE_INFINITY,
            spawnValue: 23,
            spawnProgress: 0,
            spawnEnemy() {
                return new Cyan(
                    Math.random() * (canvas.width - 40),
                    canvas.height,
                    player,
                    (entity) => world.addEntity(entity),
                );
            },
        },
        {
            startIndex: 3,
            endIndex: Number.POSITIVE_INFINITY,
            spawnValue: 35,
            spawnProgress: 0,
            spawnEnemy() {
                return new Purple(
                    Math.random() * (canvas.width - 44),
                    canvas.height,
                    (entity) => world.addEntity(entity),
                );
            },
        },
    ]);
    const itemPool: ItemFactory[] = items.map(e => () => new e());
    const systems: GameSystem[] = [new GameCollisionSystem()];
    const engine = new GameEngine(world, renderer, systems, waves);

    systems.push(new WaveRewardSystem(
        player,
        input,
        itemPool,
        (item) => getQualityWeight(
            item.quality as Quality,
            player.readStat("LUCK"),
        ),
        (index) => engine.switchWave(index),
        () => engine.hasPendingWaveEnemies(),
        (enabled) => player.setControlsEnabled(enabled),
        canvas.width,
    ));

    const audioCount = ALL_GAME_AUDIO_SOURCES.length;
    let processedAudioCount = 0;

    loadingProgress.max = audioCount;
    loadingProgress.value = 0;
    loadingStatus.textContent = `正在加载音频……0 / ${audioCount}`;

    await Promise.allSettled(ALL_GAME_AUDIO_SOURCES.map(async (source) => {
        try {
            await audioSystem.loadAudio(source);
        } finally {
            processedAudioCount += 1;
            loadingProgress.value = processedAudioCount;
            loadingStatus.textContent = "正在加载音频……"
                + `${processedAudioCount} / ${audioCount}`;
        }
    }));

    loadingScreen.hidden = true;
    world.setEnvironment(environment);
    world.addEntity(player);
    engine.switchWave(0);
    engine.start();
    return engine;
}

void startGame();
