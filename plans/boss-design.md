# Boss 设计与会话交接文档

> 本文档为会话交接文档：包含已确认的 Boss 设计方案、现有系统技术细节、以及接下来的实现步骤。
> 需求确认（用户已拍板）：
>
> 1. Boss 战斗时长约 60 秒合适；
> 2. 招式数值先按现有敌机水准估，写代码时可再调；
> 3. **每 15 波出现一个 Boss**；
> 4. **击败 Boss 后玩家连续选两次道具，复用 WaveRewardSystem，但只出传说道具（Quality.LEGENDARY）**。

---

## 一、Boss 设计方案（已确认）：「熔核运输舰 CRIMSON HULK」

### 基础设定

| 项目 | 数值                                                    |
| ---- | ------------------------------------------------------- |
| 外观 | 宽大棕红色运输舰（约 220×120），顶部大血条 + 阶段分割线 |
| 血量 | 约玩家期望 DPS × 60 秒（三阶段，每阶段约 20 秒）        |
| 移动 | 正弦漂移横向游走；阶段切换时快速移动到新位置            |
| 出场 | 从顶部压入到 y≈120 停住，入场期间无敌                   |
| 击败 | 爆炸序列（多次小爆 + 终爆），分值 5000                  |

核心思路：大部分弹幕**可格挡**（鼓励完美格挡攒能量），少量**不可格挡**的激光/冲撞（鼓励冲刺无敌），弹幕密集处提供**擦弹收益**。

### 三阶段行为

**阶段一「运输护航」（100%~66% HP）**，循环 3 招：

1. 扇形弹：朝玩家 5~7 发可格挡橙色大弹，1.2 秒一轮；
2. 召唤护卫：左右舷各释放 2 个 Brown（同屏上限 2），**护卫被击杀时 Boss 受 3% 最大生命连带伤害**；
3. 横扫冲撞：红灯预警 0.8 秒后水平冲过屏幕（不可格挡），路径留 2 秒火焰带。

**阶段二「火力全开」（66%~33%）**：

1. 旋转弹幕：原地旋转螺旋发射 2 圈可格挡弹，持续 3 秒（主要擦弹机会）；
2. 追踪导弹齐射：一次 3 枚 MissileBullet；
3. 蓄能激光：红色警戒线 1 秒后贯穿整列激光（不可格挡）；
4. 护卫召唤升为 3 个。

**阶段三「自毁协议」（33%~0%）**：

1. 花瓣弹幕：整圆炸开、弹间留一个机身的走位缝隙；
2. 全屏收束波：每 6 秒从屏幕四角向 Boss 收束弹流（呼应玩家擦弹收束特效）；
3. 濒死冲锋（HP<10%）：连续 3 次冲撞 + 周期掉落可格挡燃烧残骸。

---

## 二、现有系统技术细节（实现时直接复用）

### 文件结构

- 实体基类：`src/core/entity.ts`（BaseEntity：position/size/appearance/velocity/active/collisionBounds）、`src/core/renderable-target.ts`（rotation/scale/opacity/visible/zIndex，默认 zIndex=0）、`src/core/render-appearance.ts`（shape: rectangle|ellipse|triangle|star|sprite）
- 敌人：`src/entities/enemy.ts`（抽象 Enemy extends Plane，需实现 `ai(delta)`/`upgrade()`/`getEntityType(): "enemy"`，有 scoreValue/fireCooldown/maxHealth/health/takeDamage）
- 现有敌机参考：`src/game/enemies/cyan.ts`（持有 player + spawnEntity，fireAtPlayer 模式）、`brown.ts`（发射 MissileBullet）
- 子弹基类：`src/entities/bullet.ts`（damage/faction/remainingLifetime/canParry/penetrate/hitTargets/energyGranted；方法 `hit()`、`hitOnSpawn()`、`canDamage(target)`、`hasHit(target)`、`resetHitTargets()`）
- `BasicBullet.advance(delta, rotation)`：移动 + remainingLifetime 递减归零即销毁（激光/雷电另有自己的 intersects）

### 能量系统（本会话刚改过）

- `PlayerPlane.gainEnergy(base)`：**直接加 base，不吃攻速加成**，上限钳制 ENERGY_CAP
- 蓄力（按住 I）：每秒消耗 `50 × ATK_SPD`，逐帧 `chargeConsumed += consumed × (1 + ENERGY_SAVING)`；能量耗尽**不自动发射**，保持蓄力等待；松开 I 才 `fireEnergyStar()`（伤害 = ATK × chargeConsumed × ENERGY_DMG_MULTIPLIER）
- `updateCharging(delta)` 在 `ai()` 里 controlsEnabled 检查后**无条件每帧调用**；`KeyI` 已加入 `keyboardActive`
- 蓄力开始播 `flash.ogg`（GAME_AUDIO_SOURCES.chargeStart），发射播 `heavy-shot.mp3`（energyStar）

### 擦弹（本会话新增）

- `GameCollisionSystem.processGraze(world)`：每帧（update 覆写中在 super.update 后调用）
- 半径 `GameCollisionSystem.grazeRadius = 100`（玩家圆心到子弹圆心距离）
- 条件：`Bullet.active && !energyGranted && canDamage(player)`（即只对敌方子弹生效），首次结算置 `energyGranted = true`
- 奖励：`player.gainEnergy(bullet.damage)`（能量 = 擦到的子弹伤害值）+ `emitGrazeEffect`（半径 100 圆周 28 颗粒子向玩家圆心收束，速度 440、drag 2.2、lifetime 0.24、色 #7fe0ff）+ 播放 `granted.mp3`（GAME_AUDIO_SOURCES.graze）

### 命中奖励（本会话新增）

- `GameCollisionSystem.grantHitEnergy(launcher, hitPlane)`：玩家（直接或召唤物归属 `SummonPlane.player`）每次对敌人（instanceof Enemy）造成伤害 +1 能量
- 已接入全部结算点：普通子弹命中、火球折射、激光折射/单敌残段、雷电连锁/球电连锁/分裂球电、突击召唤撞击、召唤物殉爆、玩家撞击敌人

### 导弹（本会话新增）

- `src/game/bullets/missile-bullet.ts`：MissileBullet extends BasicBullet，无限追踪（每帧直接朝目标转向），速度由外部传（Brown 传 `player.speed`=360），生命周期 5 秒，橙色三角弹头指向飞行方向
- 火焰拖尾：`src/game/systems/fireball-trail-system.ts` 的 `resolveConfig` 中按 instanceof 注册（MissileBullet 用 scale 0.55）；火焰粒子色 FLAME_COLORS

### 粒子与渲染

- `src/logic/systems/particle-system.ts`：`particles.emit({x,y,velocityX,velocityY,accelerationX,accelerationY,drag,size,endSize,lifetime,color})`，矩形粒子，globalAlpha 随寿命淡出
- 辅助：`src/game/particles/ring.ts`（emitRing 向外环形）、`burst.ts`（emitBurst 爆发）
- 渲染器：`src/rendering/canvas-renderer.ts` — `renderTarget()` 按 instanceof 分发（EnergyStarBullet/renderEnergyStar 等），通用形状分支支持 triangle/star（`traceStarPath`）；玩家附带 `renderEnergyArc`（能量扇环）与格挡盾
- 血条：实体 `Healthbar`（`renderHealthbar`）——Boss 大血条可参考其实现或新增专用绘制

### 波次系统（实现 Boss 波次前**必须先读**）

- `src/logic/wave.ts`（Wave 接口：startIndex/endIndex/spawnValue/spawnProgress/spawnEnemy）、`src/logic/wave-system.ts`（WaveSystem：switchTo、update、hasPendingEnemies）
- 注册处：`src/game/index.ts` 的 `waves: Set<Wave>`（Red/Orange/Cyan/Purple/Brown 各一条，startIndex 0/2/2/3/4）
- `engine.switchWave(index)` 由 WaveRewardSystem 在选完道具后调用（下一波 index）
- **注意：需要先弄清 wave 索引如何递进（spawnValue 是刷怪预算、刷完后如何进下一波），再决定 Boss 波次的挂接方式**（候选：单独 Wave 条目 startIndex=15, 30, 45…只 spawnEnemy 一个 Boss；或 WaveSystem 内特殊处理）

### 道具与奖励系统（实现 Boss 掉落前**必须先读**）

- `src/game/systems/wave-reward-system.ts`：WaveRewardSystem 构造参数 `(player, input, itemPool, weightFn, switchWave, hasPendingWaveEnemies, setControlsEnabled, canvasWidth, canvasHeight, touch)`；`beginInitialSelection(world, labelWeightItemFactories)`；`addLabelWeight(label, increment)` / `getLabelWeights()`（gameDebug）
- `src/game/items/quality.ts`：`Quality` 枚举 `WASTE/NORMAL/RARE/EPIC/LEGENDARY`；`getQualityWeight(quality, luck)`（传说 weight=1, luckOffset=0.5，色 #ff9f1c 名"传说"）
- 道具池：`src/game/items/stat-upgrade-items.ts` 的 `items` 数组（每个条目是可实例化类），另有 LabelWeightItem 工厂（`更多[标签]道具`）
- Item 基类带 `quality` 与 `label`（LabelWeightItem、PlayerStatUpgradeItem 构造里传入）
- **Boss 掉落需求：连续两次选道具，itemPool 只保留 Quality.LEGENDARY 的条目（过滤 `new ItemType()` 后读 quality，或给工厂加 quality 元数据）——需读 wave-reward-system 的选择流程后再定挂接点（可能需要支持"排队多次选择"）**

### 音频

- `src/game/audio-assets.ts`：GAME_AUDIO_SOURCES 常量表，新增条目即自动进 `ALL_GAME_AUDIO_SOURCES` 预加载（game/index.ts 加载界面统一计数）
- 播放：`audioSystem.playAudio(source)`（失败静默 catch）；PlayerPlane 有 `playSound()`；GameCollisionSystem 有 `playAudio()`

### 其他本会话改动（已验证 tsc 通过）

- EnergyStarBullet：拖尾（Afterimage + 新 "star" 形状 + traceStarPath）、锁敌排除已命中目标、全部命中过后 resetHitTargets 开启新一轮
- 节能道具 EnergySavingItem（ENERGY_SAVING +0.15，稀有，标签"充能"）
- 新敌人 Brown（brown.ts，每 3.5 秒发射导弹，波次注册 startIndex 4 / spawnValue 40）
- 工作目录：`d:\Project\Rundll86.github.io\submodules\claude-thunder`（子模块），根仓库 vite 构建
- 类型检查命令：`npx tsc --noEmit`
- **陷阱：IDE 旧缓冲/自动保存曾覆盖磁盘修改（历史教训），编辑 player-plane.ts 等文件前先确认文件内容最新**

---

## 三、接下来要实现的步骤（按序）

1. **通读 `src/logic/wave-system.ts` + `wave-reward-system.ts`**，弄清：波次索引递进机制、spawnValue 语义、道具选择触发/排队机制（能否连续两次）。
2. **新建 `src/game/enemies/boss.ts`**：BossPlane extends Enemy，按第一节设计实现三阶段状态机：
    - 阶段切换按血量阈值（66%/33%），切换时清场弹幕 + 快速位移 + 短暂无敌；
    - 可格挡弹用 DangerBullet/GreatDangerBullet 风格（faction "enemy"，canParry true）；不可格挡的设 `canParry = false`；冲撞期间 Boss 自身给玩家碰撞伤害（走 planePair 碰撞管线）；
    - 召唤 Brown 用 spawnEntity 回调；护卫死亡反伤需监听（可在 Boss.ai 里跟踪已召唤的 Brown 实例的 active 状态，或给 Brown 加 onDeath 钩子——倾向后者，但需看 Enemy 基类有无死亡回调，没有就在 Boss.ai 轮询）；
    - 蓄能激光可复用 LaserBullet（faction "enemy"、remainingRefractions 0）或新写一条竖向警戒线 + 贯穿激光；
    - Boss 大血条：新建实体或扩展 Healthbar，zIndex 高于场景。
3. **波次挂接**：每 15 波（index 15/30/45…）出现 Boss——按步骤 1 结论实现（单独 Wave 条目或 WaveSystem 特判），Boss 存活期间暂停普通刷怪（Wave 预算为 0 或特殊 flag）。
4. **Boss 掉落**：击败后触发**连续两次**道具选择，池子只含 LEGENDARY（过滤方式见第二节；注意 `更多[标签]道具` 工厂是 EPIC，应被排除，除非用户另有要求）。选完两次后 switchWave 进入下一波。
5. **打磨**：入场/阶段切换演出（镜头震动已有 `renderer.camera.shake`）、爆炸序列（emitBurst + 多段延时可用简单计时实体）、死亡掉落。
6. 全程 `npx tsc --noEmit` 验证。

## 四、开放问题（已拍板，2026-09-06 实现）

- Boss 击败后进入无尽循环：每 15 波（index%15==0）出下一个 Boss，血量机制与普通小怪相同（upgrade() 逐波 ×1.2，基础血量 400）；
- Boss 战中波次奖励禁用：Boss 波期间普通波全部停刷，仅 Boss 掉落（连续两次传说选择）生效；
- 护卫死亡反伤数值随阶段提高：每阶段 +3%（阶段一 3% / 二 6% / 三 9%）。
