import { GameApplication } from './application/GameApplication';

new GameApplication().initialize().catch(error => {
    console.error(error);
    const loading = document.getElementById('loading');
    if (loading) loading.textContent = `加载失败：${error instanceof Error ? error.message : String(error)}`;
});
