# 召唤流（Summon Build）构筑体系落地计划

> 状态：设计完成，待实现
> 面向模式：Code

## 1. 流派概述

召唤流是一套**以常驻小飞机为核心输出单位**的构筑，与现有的暴击弹幕流、反击流、雷电流、通用幸运流形成差异化。

- **核心玩法**：玩家通过道具召唤 1 台或多台小飞机围绕自己旋转、自动索敌攻击。
- **三型小飞机**（随机召唤其一）：机枪手（普攻速射）、炮台（重炮齐射）、突击者（冲刺撞击）。
- **生存规则（已确认）**：召唤物**会被敌方子弹攻击**；被击毁后，系统**自动按数量上限补召一台新的随机型号小飞机**。
- **成长三轴**：数量（SUMMON_COUNT）× 质量（SUMMON_DAMAGE/HEALTH/REGEN）× 生存（回复/编队）。

## 2. 对齐的既有机制与规范

本计划完全复用现有框架模式，避免引入新架构：

| 既有机制 | 复用方式                                                             | 参考文件                                                                          |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 属性系统 | 在 `PlayerStats` 新增 `SUMMON_*` 字段，格式同 `PLAYER_STATS_FORMATS` | [`src/game/player-plane.ts`](../src/game/player-plane.ts)                         |
| 道具基类 | 全部继承 `PlayerStatUpgradeItem`（改 `statsValue` 生效）             | [`src/game/items/stat-upgrade-items.ts`](../src/game/items/stat-upgrade-items.ts) |
| 标签体系 | 召唤流道具标签统一为 `["召唤"]`                                      | 同上                                                                              |
| 倾向道具 | 新增「召唤倾向」`LabelWeightItem`，接入 `labelWeightItemFactories`   | [`src/game/index.ts`](../src/game/index.ts)                                       |
| 品质系统 | 沿用 `Quality`（废品/普通/稀有/史诗/传说）                           | [`src/game/items/quality.ts`](../src/game/items/quality.ts)                       |
| 道具池   | 新增道具类加入 `items` 数组                                          | [`src/game/items/stat-upgrade-items.ts`](../src/game/items/stat-upgrade-items.ts) |
| 子弹复用 | 机枪手复用 `BasicBullet`；炮台新增大体积子弹类                       | [`src/game/bullets/basic-bullet.ts`](../src/game/bullets/basic-bullet.ts)         |
| 实体挂载 | 小飞机继承 `Plane`，`GameWorld.addEntity` 自动挂血条                 | [`src/logic/game-world.ts`](../src/logic/game-world.ts)                           |

## 3. 新增玩家属性（道具落点）

在 [`PlayerStats`](../src/game/player-plane.ts) 中新增以下字段（`DataFormat` 按语义）：

| 属性                 | 格式    | 初始值 | 语义                                 |
| -------------------- | ------- | ------ | ------------------------------------ |
| `SUMMON_COUNT`       | VALUE   | 0      | 召唤物数量上限（流派入口道具设为 1） |
| `SUMMON_DAMAGE`      | PERCENT | 1      | 召唤物伤害全局乘区                   |
| `SUMMON_HEALTH`      | VALUE   | 0      | 召唤物生命上限加成                   |
| `SUMMON_REGEN`       | VALUE   | 0      | 召唤物每秒回复生命                   |
| `SUMMON_ORBIT_SPEED` | PERCENT | 1      | 环绕旋转速度乘区                     |
| `SUMMON_RANGE`       | PERCENT | 1      | 索敌/攻击范围乘区                    |

三型专属强化字段（供「定向喂牌」分化用）：

| 属性                      | 初始值 | 语义                         |
| ------------------------- | ------ | ---------------------------- |
| `SUMMON_GUNNER_RATE`      | 0      | 机枪手射速加成（百分比）     |
| `SUMMON_GUNNER_MULTISHOT` | 0      | 机枪手每次齐射额外子弹数     |
| `SUMMON_CANNON_DAMAGE`    | 0      | 炮台大子弹额外伤害           |
| `SUMMON_CANNON_MULTISHOT` | 0      | 炮台每轮额外齐射数           |
| `SUMMON_ASSAULT_DAMAGE`   | 0      | 突击者冲刺额外碰撞伤害       |
| `SUMMON_ASSAULT_SPEED`    | 0      | 突击者冲刺冷却缩减（百分比） |

> 说明：为了让三型专属道具生效，小飞机的 `ai()` 需要实时读取玩家的 `statsValue`（通过构造时传入的 `Player` 引用或事件回调）。这与现有 `Bullet.judgeCritical` 读取 launcher 属性的模式一致。

## 4. 核心召唤物设计

### 4.1 抽象基类 `SummonPlane`（新文件 `src/game/summons/summon-plane.ts`）

**`SummonPlane` 是抽象类**（`abstract class`），封装三种小飞机的**公共行为**；具体的三种小飞机继承它并实现各自的攻击方式。

构造参数：`player: PlayerPlane`、`spawnEntity` 回调、可选初始环绕角。基类公共要点：

- `maxHealth = 50 + SUMMON_HEALTH`，`health` 同步（构造时从 `player.readStat` 读取）。
- 围绕玩家旋转：轨道半径约 90（随 `SUMMON_RANGE` 微调），环绕速度基础约 2.2 rad/s，受 `SUMMON_ORBIT_SPEED` 放大。位置 = 玩家中心 + 极坐标偏移（维护私有 `orbitAngle`）。
- 自动索敌：注入查询回调 `findNearestEnemy: () => Enemy | undefined`，每帧在 `world.entities` 中找最近的 `active` 敌人，缓存在 `currentTarget` 供子类攻击使用。
- 每帧回血 `SUMMON_REGEN * delta`；环绕角推进 + 位置更新。
- `upgrade()`：空实现（召唤物不吃波次升级）。
- `getEntityType()`：返回 `"summon"`。
- `takeDamage` 沿用 `Plane`，血尽 `active = false`。

**抽象方法（子类实现各自攻击/索敌方式）**：

```ts
// 子类必须实现：
abstract attack(delta: number, target: Enemy | undefined): void;  // 攻击节奏与弹幕/冲刺
abstract getSummonType(): SummonType;                             // "gunner" | "cannon" | "assault"
```

**基类 `ai()` 模板方法**：每帧执行「回血 → 环绕位移 → 索敌刷新 → 调用子类 `attack(delta, target)`」。

> 这样设计让环绕、索敌、回血、存活逻辑只写一次，三种小飞机只需聚焦各自的武器行为。

**补召机制**（核心规则）：

- 需要一个**补召控制器**（建议做成 `GameSystem`：`SummonControllerSystem`），在 `update(world, delta)` 中统计当前 `world.entities` 中 `active` 的 `SummonPlane` 数量，若 `数量 < player.SUMMON_COUNT`，则立即随机三选一补召一台（出生位置为玩家当前环绕位）。
- 玩家拿「数量成长」道具时，也走同一补召逻辑补齐缺额。

### 4.2 三型小飞机（三个具体子类）

三个子类均 `extends SummonPlane`，实现其抽象 `attack(delta, target)` 与 `getSummonType()`；基类的环绕/索敌/回血逻辑被自动复用。

| 型号   | 类名            | 武器                              | 频率           | 数值/特点                                                                                                                                           |
| ------ | --------------- | --------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 机枪手 | `GunnerSummon`  | 复用 `BasicBullet`（玩家阵营）    | 每 0.1 秒 1 颗 | 伤害 = `SUMMON_DAMAGE × 玩家 ATK × 0.5`；射速受 `SUMMON_GUNNER_RATE` 提升；`SUMMON_GUNNER_MULTISHOT` 增加齐射数                                     |
| 炮台   | `CannonSummon`  | 新子弹类 `CannonBullet`（大体积） | 每 1 秒 2 颗   | 每颗基础 60 伤害，受 `SUMMON_DAMAGE` 与 `SUMMON_CANNON_DAMAGE` 加成；`SUMMON_CANNON_MULTISHOT` 增加齐射数；体积显著大于 `BasicBullet`（建议 28×16） |
| 突击者 | `AssaultSummon` | 冲刺碰撞                          | 每 0.5 秒 1 次 | 冲向最近敌人造成 90 碰撞伤害（`SUMMON_DAMAGE`、`SUMMON_ASSAULT_DAMAGE` 加成）；冲刺冷却受 `SUMMON_ASSAULT_SPEED` 缩减                               |

### 4.3 子弹/碰撞新增

- `CannonBullet`（新文件 `src/game/bullets/cannon-bullet.ts`）：继承 `BasicBullet` 或 `Bullet`，玩家阵营、大体积、`judgeCritical` 返回 `[false, damage]`（特殊子弹不暴击，对齐雷电/反击规则）。
- 突击者冲刺伤害：复用现有**机体碰撞**路径（`getOpposingPlanes`），但需区分「玩家机体 vs 召唤物机体」，并让召唤物对敌人造成冲刺伤害——建议在 `GameCollisionSystem` 新增 `SummonPlane × Enemy` 配对分支。
- **敌方子弹攻击召唤物**：`GameCollisionSystem` 的 `getBulletAndPlane` 目前只看 `Bullet × Plane`，召唤物继承 `Plane`，因此敌方子弹天然能命中召唤物，仅需补一个「敌方子弹×召唤物」的结算分支（掉血、粒子、飘字）。
- **友方子弹避免误伤召唤物**：`BasicBullet.isOpposingTarget` 按 `Player/Enemy` 判定，需确保召唤物发射的子弹阵营为 `player` 且不会被己方玩家子弹误伤（现有 `canDamage` 按 launcher 阵营，天然满足，但需回归测试）。

## 5. 升级道具设计（共 17 项）

### 5.1 流派入口（1）

| 道具                      | 品质 | 标签 | 效果                                                      |
| ------------------------- | ---- | ---- | --------------------------------------------------------- |
| `SummonCoreItem` 召唤核心 | 普通 | 召唤 | 立即随机召唤 1 台三型之一；`SUMMON_COUNT = 1`（流派起点） |

### 5.2 数量成长（2）

| 道具                       | 品质 | 标签 | 效果                            |
| -------------------------- | ---- | ---- | ------------------------------- |
| `SummonCountItem` 援军到来 | 稀有 | 召唤 | `SUMMON_COUNT +1`，随后补召缺额 |
| `SummonArmyItem` 召唤大军  | 传说 | 召唤 | `SUMMON_COUNT +2`（数量流上限） |

### 5.3 通用乘区（5）

| 道具                             | 品质 | 标签 | 效果                      |
| -------------------------------- | ---- | ---- | ------------------------- |
| `SummonDamageItem` 召唤强化      | 稀有 | 召唤 | `SUMMON_DAMAGE +30%`      |
| `SummonDamageBigItem` 召唤再强化 | 传说 | 召唤 | `SUMMON_DAMAGE +60%`      |
| `SummonHealthItem` 合金机身      | 稀有 | 召唤 | `SUMMON_HEALTH +30`       |
| `SummonRegenItem` 纳米修复       | 史诗 | 召唤 | `SUMMON_REGEN +1.5`       |
| `SummonOrbitItem` 环形编队       | 普通 | 召唤 | `SUMMON_ORBIT_SPEED +40%` |

### 5.4 三型专属强化（6，定向构筑）

| 道具                           | 品质 | 标签 | 对象   | 效果                         |
| ------------------------------ | ---- | ---- | ------ | ---------------------------- |
| `GunnerRateItem` 速射核心      | 稀有 | 召唤 | 机枪手 | `SUMMON_GUNNER_RATE +40%`    |
| `GunnerMultishotItem` 双管机枪 | 史诗 | 召唤 | 机枪手 | `SUMMON_GUNNER_MULTISHOT +1` |
| `CannonDamageItem` 重炮核心    | 稀有 | 召唤 | 炮台   | `SUMMON_CANNON_DAMAGE +30`   |
| `CannonMultishotItem` 三发齐射 | 史诗 | 召唤 | 炮台   | `SUMMON_CANNON_MULTISHOT +1` |
| `AssaultDamageItem` 突进核心   | 稀有 | 召唤 | 突击者 | `SUMMON_ASSAULT_DAMAGE +40`  |
| `AssaultSpeedItem` 连续突进    | 史诗 | 召唤 | 突击者 | `SUMMON_ASSAULT_SPEED +30%`  |

### 5.5 传说质变（2）

| 道具                          | 品质 | 标签 | 效果                                                             |
| ----------------------------- | ---- | ---- | ---------------------------------------------------------------- |
| `SummonSacrificeItem` 殉爆    | 传说 | 召唤 | 召唤物被击毁时爆炸，对周围敌人造成 `SUMMON_DAMAGE × 50` 范围伤害 |
| `SummonOverloadItem` 共振过载 | 传说 | 召唤 | 所有召唤物伤害与攻速再 `+25%`（全局乘区）                        |

### 5.6 运营倾向（1）

| 道具                          | 效果                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `SummonTendencyItem` 召唤倾向 | `LabelWeightItem`，`targetLabel="召唤"`，`weightIncrement=20`，加入 `labelWeightItemFactories` |

## 6. 接入点清单（实现顺序）

### 6.1 属性层

- [ ] [`src/game/player-plane.ts`](../src/game/player-plane.ts)：`PlayerStats` 类型新增 13 个 `SUMMON_*` 字段；`PLAYER_STATS_FORMATS` 补充格式；构造器初始值补全。

### 6.2 召唤物实体

- [ ] 新目录 `src/game/summons/`：
    - `summon-plane.ts`（**抽象基类**，含环绕/索敌/回血/模板 `ai()` + 抽象 `attack()`/`getSummonType()`）
    - `gunner-summon.ts`、`cannon-summon.ts`、`assault-summon.ts`（三个具体子类，实现抽象方法）
    - `index.ts` 导出（含 `SummonType` 联合类型 `"gunner" | "cannon" | "assault"` 与随机工厂 `randomSummonType()`）
- [ ] 新子弹 `src/game/bullets/cannon-bullet.ts`，加入 [`src/game/bullets/index.ts`](../src/game/bullets/index.ts)

### 6.3 补召与生成逻辑

- [ ] 新系统 `src/game/systems/summon-controller-system.ts`：统计/补召/清场归零
- [ ] 随机三选一工厂（放 `summons/index.ts` 或 `summon-controller-system.ts`）

### 6.4 碰撞系统

- [ ] [`src/game/systems/game-collision-system.ts`](../src/game/systems/game-collision-system.ts)：
    - 敌方子弹 × `SummonPlane` 结算（掉血、粒子、飘字）
    - `SummonPlane` × 敌人 的冲刺碰撞分支（仅突击者触发冲刺伤害）
    - 友方子弹不误伤召唤物（回归确认）

### 6.5 道具

- [ ] [`src/game/items/stat-upgrade-items.ts`](../src/game/items/stat-upgrade-items.ts)：新增 17 个道具类，加入 `items` 数组
- [ ] 新增「召唤倾向」`LabelWeightItem` 接入 [`src/game/index.ts`](../src/game/index.ts) 的 `labelWeightItemFactories`

### 6.6 系统注册与入口

- [ ] [`src/game/index.ts`](../src/game/index.ts)：将 `SummonControllerSystem` 加入 `systems` 数组（在碰撞系统之前，保证补召帧序正确）

### 6.7 渲染

- [ ] [`src/rendering/canvas-renderer.ts`](../src/rendering/canvas-renderer.ts)：为 `SummonPlane` 增加定制绘制（三型不同颜色/形状：机枪手细长三角、炮台方块+炮管、突击者楔形箭头），或在通用 shape 绘制基础上用 `appearance` 区分（优先复用通用路径，减少改动）。

### 6.8 数值/标签常量

- [ ] 统一在 `player-plane.ts` 或新常量文件中定义各道具默认数值，供道具与召唤物 AI 引用。

## 7. 平衡与验证要点

- **入口门槛**：`SUMMON_COUNT` 初始 0，只有拿到「召唤核心」才开启召唤，避免开局强度溢出。
- **三型均衡**：机枪手持续低伤、炮台周期爆发、突击者近战冲锋，三型各有适用场景（Boss 战炮台占优、弹幕密集期机枪手占优、近身混战突击者占优）。
- **生存压力**：召唤物被敌方子弹攻击，所以 `SUMMON_HEALTH/REGEN` 有价值；被击毁自动补召保证数量流不会永久损失，但需注意「补召点」的死亡惩罚节奏（可考虑短暂延迟，避免无限坦克）。
- **殉爆联动**：`SUMMON_HEALTH` 越高，殉爆的"肉盾+自爆"玩法越强，形成数量流内的又一分支。
- **回归测试**：友方子弹不误伤召唤物；敌方子弹对召唤物掉血；玩家死亡/波次切换时召唤物状态重置。

## 8. 待确认（实现前）

- 补召是否加**短暂延迟**（如 0.5s）以防止无限坦克？（当前设计倾向不加延迟，保持简单；如需节奏惩罚可实现为可选参数）
- 召唤物是否参与**波次奖励判定**（`WaveRewardSystem` 用 `world.entities.some(e => e instanceof Enemy)` 判定清场，召唤物不属于 Enemy，不影响清场判定，天然正确）。
