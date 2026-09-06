import { AudioSystem } from "../audio/audio-system";
import { CooldownBar } from "../entities/cooldown-bar";
import { Enemy } from "../entities/enemy";
import { GameEngine } from "../logic/game-engine";
import type { GameSystem } from "../logic/game-system";
import { GameWorld } from "../logic/game-world";
import type { Wave } from "../logic/wave";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import { LabelWeightItem } from "./items/label-weight-item";
import { getQualityWeight, Quality } from "./items/quality";
import { items } from "./items/stat-upgrade-items";
import { ALL_GAME_AUDIO_SOURCES } from "./audio-assets";
import { KeyboardInput } from "./keyboard-input";
import { PlayerPlane } from "./player-plane";
import { TouchInput } from "./touch-input";
import { SpaceEnvironment } from "./space-environment";
import { FireballTrailSystem } from "./systems/fireball-trail-system";
import { GameCollisionSystem } from "./systems/game-collision-system";
import { SummonControllerSystem } from "./systems/summon-controller-system";
import {
    type ItemFactory,
    WaveRewardSystem,
} from "./systems/wave-reward-system";
import {
    Boss,
    BossHealthbar,
    Brown,
    Cyan,
    Orange,
    Purple,
    Red,
} from "./enemies";

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
    const touch = new TouchInput(canvas);
    const audioSystem = new AudioSystem();

    // 逻辑分辨率固定为设计基准 480×720，世界/实体尺寸不随屏幕放大；
    // 铺满屏幕由 CSS 的 object-fit: contain 等比缩放完成，桌面端画面保持合适大小。
    canvas.width = 480;
    canvas.height = 720;

    const player = new PlayerPlane(
        input,
        audioSystem,
        (entity) => world.addEntity(entity),
        touch,
        // 激光角度修正用：返回场上全部存活敌人，
        // 由玩家从中选取预期偏转角最小者。
        () => {
            const enemies: Enemy[] = [];

            for (const entity of world.entities) {
                if (entity instanceof Enemy && entity.active) {
                    enemies.push(entity);
                }
            }

            return enemies;
        },
    );
    const environment = new SpaceEnvironment(canvas.width, canvas.height);
    // 每 15 波（index 15/30/45…）出现一次 Boss；Boss 战期间普通波全部暂停。
    const isBossWave = (index: number): boolean => index > 0 && index % 15 === 0;
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
            startIndex: 1,
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
        {
            startIndex: 4,
            endIndex: Number.POSITIVE_INFINITY,
            spawnValue: 30,
            spawnProgress: 0,
            spawnEnemy() {
                return new Brown(
                    Math.random() * (canvas.width - 42),
                    canvas.height,
                    player,
                    (entity) => world.addEntity(entity),
                );
            },
        },
        {
            // Boss 波：spawnValue 100 恰好在切换到 Boss 波时刷出 1 个 Boss。
            startIndex: 15,
            endIndex: Number.POSITIVE_INFINITY,
            isBoss: true,
            spawnValue: 100,
            spawnProgress: 0,
            spawnEnemy() {
                const boss = new Boss(
                    canvas.width,
                    canvas.height,
                    player,
                    (entity) => world.addEntity(entity),
                    () => [...world.entities],
                    world.particles,
                    audioSystem,
                    (amplitude, duration, frequency, decay) => {
                        renderer.camera.shake({
                            amplitude,
                            duration,
                            frequency,
                            decay,
                        });
                    },
                );

                // 顶部大血条（先于 Boss 加入世界，避免重复生成小血条）。
                world.addEntity(new BossHealthbar(boss, canvas.width));
                return boss;
            },
        },
    ]);
    const labelWeightItemFactories: ItemFactory[] = [
        "通用",
        "暴击",
        "反击",
        "雷电",
        "召唤",
        "激光",
        "充能"
    ]
        .map(e => [`更多[${e}]道具`, e])
        .map(([displayName, targetLabel]) => () => new LabelWeightItem({
            displayName,
            avatarSource: ".",
            quality: Quality.EPIC,
            targetLabel,
            weightIncrement: 40,
        }));
    const itemPool: ItemFactory[] = [
        ...items.map((ItemType) => () => new ItemType()),
        ...labelWeightItemFactories,
    ];
    // Boss 掉落：只保留传说品质道具（LabelWeightItem 为史诗，自动排除）。
    const bossItemPool: ItemFactory[] = items
        .filter((ItemType) => new ItemType().quality === Quality.LEGENDARY)
        .map((ItemType) => () => new ItemType());
    const waveRewardSystem = new WaveRewardSystem(
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
        canvas.height,
        touch,
        {
            isBossWave,
            bossPool: bossItemPool,
            bossSelectionCount: 2,
        },
    );
    const systems: GameSystem[] = [
        world.particles,
        new FireballTrailSystem(),
        new SummonControllerSystem({
            player,
            spawnEntity: (entity) => world.addEntity(entity as never),
        }),
        new GameCollisionSystem(
            audioSystem,
            (amplitude, duration, frequency, decay) => {
                renderer.camera.shake({ amplitude, duration, frequency, decay });
            },
        ),
        waveRewardSystem
    ];
    const engine = new GameEngine(world, renderer, systems, waves, isBossWave);

    // 调试工具：在浏览器控制台手动调整道具标签的抽取权重，
    // 例如 gameDebug.addLabelWeight("激光", 200)、gameDebug.getLabelWeights()。
    Object.defineProperty(globalThis, "gameDebug", {
        value: {
            addLabelWeight: (label: string, increment: number) => {
                waveRewardSystem.addLabelWeight(label, increment);
            },
            getLabelWeights: () => waveRewardSystem.getLabelWeights(),
        },
        configurable: true,
    });

    // 音频与贴图统一计数，在加载界面全部就绪后再进入游戏。
    const spriteSources = [PlayerPlane.textureSource];
    const totalCount = ALL_GAME_AUDIO_SOURCES.length + spriteSources.length;
    let processedCount = 0;

    const refreshLoadingProgress = (): void => {
        loadingProgress.value = processedCount;
        loadingStatus.textContent = `正在加载资源……${processedCount} / ${totalCount}`;
    };

    loadingProgress.max = totalCount;
    loadingProgress.value = 0;
    refreshLoadingProgress();

    const trackLoading = async (load: () => Promise<void>): Promise<void> => {
        try {
            await load();
        } finally {
            processedCount += 1;
            refreshLoadingProgress();
        }
    };

    await Promise.allSettled([
        ...ALL_GAME_AUDIO_SOURCES.map((source) => trackLoading(() => audioSystem.loadAudio(source))),
        ...spriteSources.map((source) => trackLoading(() => renderer.preloadImage(source))),
    ]);

    loadingScreen.hidden = true;
    world.setEnvironment(environment);
    world.addEntity(player);
    // 机身两侧的冷却进度条：左侧格挡冷却、右侧冲刺冷却（受闪避充能影响）。
    world.addEntity(new CooldownBar(player, {
        getProgress: () => player.getGuardCooldownProgress(),
        alignment: "left",
        foregroundColor: "#f0e68c",
    }));
    world.addEntity(new CooldownBar(player, {
        getProgress: () => player.getDodgeCooldownProgress(),
        alignment: "right",
        foregroundColor: "#8fd8ff",
    }));
    // 开局先让玩家从标签倾向道具中选一个，选完才开启第一波。
    waveRewardSystem.beginInitialSelection(world, labelWeightItemFactories);
    engine.start();
    return engine;
}

void startGame();
