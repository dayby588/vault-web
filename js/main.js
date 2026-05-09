// main.js — 应用入口与初始化
// 依赖: 所有模块（script 标签按顺序加载）
// 全局状态: editor, currentFile, isDirty, currentView, selectedFolder, currentTreePath

document.addEventListener('DOMContentLoaded', async () => {
  // 健康检查
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/health', false);
    xhr.send(null);
    if (xhr.status !== 200 || !JSON.parse(xhr.responseText).ok) throw new Error();
  } catch(e) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;gap:16px;color:#e94560;padding:20px;text-align:center;"><div style="font-size:48px;">⚠️</div><div style="font-size:20px;font-weight:600;">服务连接失败</div><div style="font-size:14px;color:#888;">后端服务可能已停止，请重启：</div><div style="font-size:13px;background:#1a1a2e;color:#e94560;padding:10px 20px;border-radius:8px;font-family:monospace;">python3 obsidian-web-vault.py</div></div>';
    return;
  }

  // 恢复侧边栏宽度
  try {
    const w = localStorage.getItem('vault-sidebar-w');
    if (w) document.getElementById('sidebar').style.width = w + 'px';
  } catch(e) {}

  // 图标库加载失败不影响主体功能
  try { lucide.createIcons(); } catch(e) { console.warn('Lucide 图标加载失败:', e); }
  initEditor();
  initFileTree();
  bindEvents();
  loadKeyboardShortcuts();
  updateView(); // 应用默认双栏视图

  // 图谱跳转 ?open=xxx
  const hash = location.hash;
  if (hash && hash.startsWith('#file=')) {
    const path = atob(hash.slice(6).replace(/-/g, '+').replace(/_/g, '/'));
    setTimeout(() => openFile(decodeURIComponent(path)), 200);
  }
});
