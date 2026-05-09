// events.js — 事件绑定与快捷键

function bindEvents() {
  // 视图切换
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.dataset.view;
      updateView();
    });
  });

  // 工具栏按钮
  document.getElementById('btn-new').onclick = showNewModal;
  document.getElementById('btn-save').onclick = saveFile;
  document.getElementById('btn-delete').onclick = deleteFile;
  document.getElementById('btn-refresh').onclick = refreshCurrent;

  // 搜索
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(e.target.value.trim()), 300);
  });
  document.getElementById('search-input').addEventListener('focus', e => {
    if (e.target.value.trim()) doSearch(e.target.value.trim());
  });

  // 搜索范围 tab
  document.getElementById('scope-all').onclick = () => {
    searchScope = 'all';
    document.getElementById('scope-all').classList.add('active');
    document.getElementById('scope-dir').classList.remove('active');
    const q = document.getElementById('search-input').value.trim();
    if (q) doSearch(q);
  };
  document.getElementById('scope-dir').onclick = () => {
    searchScope = 'dir';
    document.getElementById('scope-dir').classList.add('active');
    document.getElementById('scope-all').classList.remove('active');
    const q = document.getElementById('search-input').value.trim();
    if (q) doSearch(q);
  };

  // 点击搜索结果外部关闭
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap') && !e.target.closest('.search-results') && !e.target.closest('#search-scope-wrap')) {
      document.getElementById('search-results').classList.remove('show');
    }
  });

  // Ctrl+Enter 保存
  editor.addKeyMap({
    'Ctrl-Enter': saveFile,
    'Cmd-Enter': saveFile,
  });

  // 主题切换（按钮组直接切换）
  const themeNames = { dark: '暗色', simple: '简约明亮', apple: 'Apple' };
  const themeCmTheme = { dark: 'material-darker', simple: 'default', apple: 'default' };

  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === name);
    });
    if (editor) {
      editor.setOption('theme', themeCmTheme[name]);
      setTimeout(() => editor.refresh(), 10);
    }
    try { localStorage.setItem('vault-theme', name); } catch(e) {}
  }

  // 点击主题按钮直接切换
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.onclick = () => setTheme(btn.dataset.theme);
  });

  // 恢复上次选择
  try {
    const saved = localStorage.getItem('vault-theme');
    if (saved && themeNames[saved]) setTheme(saved);
  } catch(e) {}

  // 侧边栏宽度拖拽
  const resizeSidebar = document.getElementById('resize-v-sidebar');
  let draggingSidebar = false, sidebarStartX = 0, sidebarStartW = 0;
  resizeSidebar.addEventListener('mousedown', e => {
    draggingSidebar = true;
    sidebarStartX = e.clientX;
    const sb = document.getElementById('sidebar');
    sidebarStartW = sb.offsetWidth;
    resizeSidebar.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!draggingSidebar) return;
    const delta = e.clientX - sidebarStartX;
    const newW = Math.max(160, Math.min(600, sidebarStartW + delta));
    document.getElementById('sidebar').style.width = newW + 'px';
    // 持久化
    try { localStorage.setItem('vault-sidebar-w', newW); } catch(er) {}
  });
  document.addEventListener('mouseup', () => {
    if (!draggingSidebar) return;
    draggingSidebar = false;
    resizeSidebar.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // 水平拖拽（双栏视图）
  const resizeH = document.getElementById('resize-h');
  let draggingH = false, startX = 0, startW = 0;
  resizeH.addEventListener('mousedown', e => {
    if (currentView !== 'split') return;
    draggingH = true;
    startX = e.clientX;
    const pe = document.getElementById('pane-editor');
    startW = pe.offsetWidth;
    resizeH.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!draggingH) return;
    const total = document.getElementById('panes').offsetWidth;
    const delta = e.clientX - startX;
    const newW = Math.max(150, Math.min(total - 150, startW + delta));
    const pct = (newW / total * 100).toFixed(1);
    document.getElementById('pane-editor').style.flex = `0 0 ${pct}%`;
    document.getElementById('pane-preview').style.flex = `0 0 ${(100 - pct).toFixed(1)}%`;
  });
  document.addEventListener('mouseup', () => {
    draggingH = false;
    resizeH.classList.remove('dragging');
  });

  // 垂直拖拽（实时预览视图）
  const resizeV = document.getElementById('resize-v');
  let draggingV = false, startY = 0, startH = 0;
  resizeV.addEventListener('mousedown', e => {
    if (currentView !== 'vertical') return;
    draggingV = true;
    startY = e.clientY;
    const pp = document.getElementById('pane-preview');
    startH = pp.offsetHeight;
    resizeV.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!draggingV) return;
    const total = document.getElementById('panes').offsetHeight;
    const delta = e.clientY - startY;
    const newH = Math.max(100, Math.min(total - 100, startH + delta));
    const pct = (newH / total * 100).toFixed(1);
    document.getElementById('pane-preview').style.flex = `0 0 ${pct}%`;
    document.getElementById('pane-editor').style.flex = `0 0 ${(100 - pct).toFixed(1)}%`;
  });
  document.addEventListener('mouseup', () => {
    draggingV = false;
    resizeV.classList.remove('dragging');
  });
}

function loadKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      showNewModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      editor.focus();
      editor.execCommand('find');
    }
  });

  // 删除确认弹窗
  document.getElementById('modal-delete-cancel').onclick = () => {
    document.getElementById('modal-delete').classList.remove('show');
    _pendingDelete = null;
  };
  document.getElementById('modal-delete-confirm').onclick = doDeleteConfirmed;
  document.getElementById('modal-delete').onclick = e => {
    if (e.target === document.getElementById('modal-delete'))
      document.getElementById('modal-delete').classList.remove('show');
  };

  // 自动保存开关
  const autoToggle = document.getElementById('auto-save-toggle');
  const autoDelay = document.getElementById('auto-save-delay');
  try {
    const saved = localStorage.getItem('vault-auto-save');
    if (saved) {
      const cfg = JSON.parse(saved);
      autoToggle.checked = cfg.enabled;
      autoDelay.value = cfg.delay;
      autoSaveEnabled = cfg.enabled;
      autoSaveDelay = cfg.delay;
      autoDelay.style.display = cfg.enabled ? 'inline-block' : 'none';
    }
  } catch(e) {}
  autoToggle.addEventListener('change', () => {
    autoSaveEnabled = autoToggle.checked;
    autoDelay.style.display = autoToggle.checked ? 'inline-block' : 'none';
    try { localStorage.setItem('vault-auto-save', JSON.stringify({ enabled: autoSaveEnabled, delay: autoSaveDelay })); } catch(e) {}
  });
  autoDelay.addEventListener('change', () => {
    autoSaveDelay = parseInt(autoDelay.value);
    try { localStorage.setItem('vault-auto-save', JSON.stringify({ enabled: autoSaveEnabled, delay: autoSaveDelay })); } catch(e) {}
  });

  // 新建弹窗
  document.getElementById('modal-cancel').onclick = () => document.getElementById('modal-new').classList.remove('show');
  document.getElementById('modal-confirm').onclick = doNewNote;
  document.getElementById('new-file-name').onkeydown = e => { if (e.key === 'Enter') doNewNote(); };

  // 快速新建笔记（侧边栏 + 按钮）
  document.getElementById('btn-quick-new-note').onclick = showQuickNewNoteModal;
  document.getElementById('modal-quick-new').onclick = e => { if (e.target === document.getElementById('modal-quick-new')) document.getElementById('modal-quick-new').classList.remove('show'); };
  document.getElementById('quick-new-cancel').onclick = () => document.getElementById('modal-quick-new').classList.remove('show');
  document.getElementById('quick-new-confirm').onclick = doQuickNewNote;
  document.getElementById('quick-note-name').onkeydown = e => { if (e.key === 'Enter') doQuickNewNote(); };

  // 重命名弹窗
  document.getElementById('modal-rename').onclick = e => { if (e.target === document.getElementById('modal-rename')) document.getElementById('modal-rename').classList.remove('show'); };
  document.getElementById('rename-cancel').onclick = () => document.getElementById('modal-rename').classList.remove('show');
  document.getElementById('rename-confirm').onclick = doRename;
  document.getElementById('rename-input').onkeydown = e => { if (e.key === 'Enter') doRename(); };

  // 新建文件夹弹窗
  document.getElementById('modal-mkdir').onclick = e => { if (e.target === document.getElementById('modal-mkdir')) document.getElementById('modal-mkdir').classList.remove('show'); };
  document.getElementById('mkdir-cancel').onclick = () => document.getElementById('modal-mkdir').classList.remove('show');
  document.getElementById('mkdir-confirm').onclick = doMkdir;
  document.getElementById('mkdir-input').onkeydown = e => { if (e.key === 'Enter') doMkdir(); };

  // ── 同步滚动 ──
  const btnSync = document.getElementById('btn-sync-scroll');
  btnSync.onclick = () => {
    syncScroll = !syncScroll;
    btnSync.classList.toggle('active', syncScroll);
  };
  // 编辑器滚动 → 同步到预览
  editor.on('scroll', () => {
    if (!syncScroll || _scrollLock) return;
    _scrollLock = true;
    const info = editor.getScrollInfo();
    const ratio = info.top / Math.max(1, info.height - info.clientHeight);
    const pane = document.getElementById('pane-preview');
    pane.scrollTop = ratio * Math.max(0, pane.scrollHeight - pane.clientHeight);
    setTimeout(() => { _scrollLock = false; }, 50);
  });
  // 预览滚动 → 同步到编辑器
  document.getElementById('pane-preview').addEventListener('scroll', () => {
    if (!syncScroll || _scrollLock) return;
    _scrollLock = true;
    const pane = document.getElementById('pane-preview');
    const ratio = pane.scrollTop / Math.max(1, pane.scrollHeight - pane.clientHeight);
    const info = editor.getScrollInfo();
    editor.scrollTo(null, ratio * Math.max(0, info.height - info.clientHeight));
    setTimeout(() => { _scrollLock = false; }, 50);
  });

  // ── 侧边栏底部固定横向滚动条 ──
  (function() {
    const tree = document.getElementById('file-tree');
    const track = document.getElementById('sidebar-hscroll');
    const inner = document.getElementById('sidebar-hscroll-inner');
    function syncWidth() {
      inner.style.width = tree.scrollWidth + 'px';
    }
    track.addEventListener('scroll', () => { tree.scrollLeft = track.scrollLeft; });
    tree.addEventListener('scroll', () => { track.scrollLeft = tree.scrollLeft; });
    new MutationObserver(syncWidth).observe(tree, { childList: true, subtree: true });
    syncWidth();
  })();

  // 右键菜单
  document.getElementById('ctx-new-note-here').onclick = () => { const p = ctxTargetPath; const isDir = ctxTargetIsDir; hideCtxMenu(); currentTreePath = isDir ? p : p.split('/').slice(0,-1).join('/'); updateSidebarPathLabel(); showQuickNewNoteModal(); };
  document.getElementById('ctx-new-folder').onclick = () => { showMkdirModal(ctxTargetIsDir ? ctxTargetPath : ctxTargetPath.split('/').slice(0,-1).join('/')); };
  document.getElementById('ctx-rename').onclick = () => { showRenameModal(ctxTargetPath, ctxTargetIsDir); };
  document.addEventListener('click', e => { if (!e.target.closest('#ctx-menu')) hideCtxMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideCtxMenu(); document.getElementById('modal-rename').classList.remove('show'); document.getElementById('modal-mkdir').classList.remove('show'); document.getElementById('modal-quick-new').classList.remove('show'); } });
}

function selectFolder(path, btn) {
  selectedFolder = path;
  document.getElementById('selected-folder').textContent = '📁 ' + (path || '根目录');
  // 更新选中高亮
  document.querySelectorAll('.folder-picker-item').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  // 记住选择
  try { localStorage.setItem('vault-last-folder', path); } catch(e) {}
}

function doSearch(q) {
  const panel = document.getElementById('search-results');
  const list = document.getElementById('search-list');
  if (!q) { panel.classList.remove('show'); return; }

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/search?q=${encodeURIComponent(q)}`, false);
    xhr.send(null);
    if (xhr.status !== 200) { console.error('搜索失败 HTTP', xhr.status); return; }
    const data = JSON.parse(xhr.responseText);
    let results = data.results || [];
    if (searchScope === 'dir' && currentTreePath) {
      results = results.filter(r => r.path.startsWith(currentTreePath + '/') || r.path === currentTreePath);
    }
    // 更新 tab 提示
    document.getElementById('scope-dir').title = currentTreePath ? ('当前目录：' + currentTreePath) : '当前目录（根目录）';
    if (!results || results.length === 0) {
      list.innerHTML = '<div class="search-item"><div class="search-item-name">未找到结果</div></div>';
    } else {
      list.innerHTML = results.map(r => `
        <div class="search-item" onclick="openFileFromSearch('${r.path.replace(/'/g,"\\'")}')">
          <div class="search-item-name">${r.name}</div>
          <div class="search-item-snippet">${escapeHtml(r.snippet)}</div>
          <div class="search-item-path">${r.path}</div>
        </div>
      `).join('');
    }
    panel.classList.add('show');
  } catch (e) {
    console.error('搜索失败', e);
  }
}

function openFileFromSearch(path) {
  document.getElementById('search-results').classList.remove('show');
  document.getElementById('search-input').value = '';
  openFile(path);
}
