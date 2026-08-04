# Claude VS 雷电

使用 TypeScript 重构的 Canvas 纵版射击游戏。构建工具为 pnpm + tsup。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm build
```

构建产物为 `dist/game.js`。请使用任意静态 HTTP 服务打开项目根目录的 `index.html`，例如 VS Code Live Server。

开发时可运行 `pnpm dev` 监听 TypeScript 变更；完整检查使用 `pnpm check`。

## 架构

- `src/core`：纯游戏逻辑层。包含集中状态、游戏循环逻辑、实体、弹体、道具、特效以及波次/碰撞/掉落系统，不依赖 DOM、Canvas 和音频。
- `src/presentation`：渲染层。CanvasRenderer 只读取逻辑状态进行绘制，DomHud 负责页面状态，ResponsiveCanvas 负责布局。
- `src/infrastructure`：浏览器输入、音频、资源加载和 localStorage 角色配置适配器。
- `src/application`：应用编排层，将输入、逻辑更新、领域事件、音频、DOM 和逐帧渲染连接起来。
- `src/main.ts`：组合根和浏览器入口。

逻辑层通过 `GameEvent` 发出通知、声音、震屏和游戏结束事件，而不直接调用浏览器 API，从而保持渲染层与玩法逻辑解耦。
