// modal.js — 弹窗管理

async function showNewModal() {
  document.getElementById('modal-new').classList.add('show');
  document.getElementById('new-file-name').value = '';
  document.getElementById('new-file-name').focus();
  // 从 localStorage 恢复上次选择的目录
  try { selectedFolder = localStorage.getItem('vault-last-folder') || ''; } catch(e) { selectedFolder = ''; }
  document.getElementById('selected-folder').textContent = selectedFolder ? '📁 ' + selectedFolder : '📁 根目录';
  renderFolderPicker();
  // 自动滚动到已选中的目录
  const sel = document.querySelector('.folder-picker-item.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}


async function renderFolderPicker() {
  const container = document.getElementById('folder-picker-root');
  container.innerHTML = '';

  // 根目录选项
  const rootBtn = document.createElement('button');
  rootBtn.className = 'folder-picker-item' + (selectedFolder === '' ? ' selected' : '');
  rootBtn.innerHTML = '<i data-lucide="folder"></i><span>📁 根目录</span>';
  rootBtn.onclick = () => selectFolder('', rootBtn);
  container.appendChild(rootBtn);

  // 获取所有目录
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/tree?path=', false);
    xhr.send(null);
    if (xhr.status !== 200) return;
    const data = JSON.parse(xhr.responseText);
    if (!data.ok) return;

    for (const item of data.items) {
      if (!item.is_dir) continue;
      const btn = document.createElement('button');
      btn.className = 'folder-picker-item folder' + (selectedFolder === item.name ? ' selected' : '');
      btn.innerHTML = `<i data-lucide="folder"></i><span>${item.name}</span>`;
      btn.onclick = () => selectFolder(item.name, btn);
      container.appendChild(btn);

      // 二级（展开子目录）
      await renderSubFolders(btn, item.name, container);
    }
    lucide.createIcons();
  } catch (e) {
    console.error('加载目录失败', e);
  }
}

async function renderSubFolders(parentBtn, parentPath, container) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/tree?path=' + encodeURIComponent(parentPath), false);
    xhr.send(null);
    if (xhr.status !== 200) return;
    const data = JSON.parse(xhr.responseText);
    if (!data.ok || !data.items.length) return;

    for (const item of data.items) {
      if (!item.is_dir) continue;
      const childPath = parentPath + '/' + item.name;
      const btn = document.createElement('button');
      btn.className = 'folder-picker-item folder' + (selectedFolder === childPath ? ' selected' : '');
      btn.innerHTML = `<i data-lucide="folder"></i><span>${item.name}</span>`;
      btn.style.paddingLeft = '24px';
      btn.onclick = () => selectFolder(childPath, btn);
      container.appendChild(btn);

      // 递归三级
      await renderSubFolders(btn, childPath, container);
    }
  } catch (e) {}
}

// ── 右键上下文菜单 ──
function showCtxMenu(x, y, path, isDir) {
  ctxTargetPath = path;
  ctxTargetIsDir = isDir;
  const menu = document.getElementById('ctx-menu');
  document.getElementById('ctx-new-note-here').style.display = isDir ? '' : 'none';
  document.getElementById('ctx-new-folder').style.display = isDir ? '' : 'none';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.display = 'block';
  // 防止菜单超出屏幕
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (x - r.width) + 'px';
    if (r.bottom > window.innerHeight) menu.style.top = (y - r.height) + 'px';
  });
}
function hideCtxMenu() {
  document.getElementById('ctx-menu').style.display = 'none';
}

// ── 重命名 ──
function showRenameModal(path, isDir) {
  hideCtxMenu();
  const name = path.split('/').pop();
  document.getElementById('rename-old-display').textContent = (isDir ? '📁 ' : '📝 ') + name;
  document.getElementById('rename-input').value = name;
  document.getElementById('modal-rename').classList.add('show');
  setTimeout(() => {
    const input = document.getElementById('rename-input');
    input.focus();
    // 选中除扩展名外的部分
    const dot = name.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : name.length);
  }, 80);
}
function doRename() {
  const newName = document.getElementById('rename-input').value.trim();
  if (!newName) { toast('请输入新名称', 'error'); return; }
  try {
    const data = apiRename(ctxTargetPath, newName);
    if (data.ok) {
      document.getElementById('modal-rename').classList.remove('show');
      // 若重命名的是当前打开的文件，更新路径
      if (!ctxTargetIsDir && currentFile === ctxTargetPath) {
        currentFile = data.new_path;
        document.getElementById('file-info').textContent = data.new_path;
      }
      refreshCurrent();
      toast('已重命名 ✓', 'success');
    } else {
      toast('重命名失败: ' + (data.error || '未知错误'), 'error');
    }
  } catch(e) {
    toast('重命名失败: ' + e.message, 'error');
  }
}

// ── 新建文件夹 ──
function showMkdirModal(parentPath) {
  hideCtxMenu();
  const label = parentPath ? ('📁 ' + parentPath) : '📁 根目录';
  document.getElementById('mkdir-parent-label').textContent = '位置：' + label;
  document.getElementById('mkdir-input').value = '';
  document.getElementById('modal-mkdir').classList.add('show');
  setTimeout(() => document.getElementById('mkdir-input').focus(), 80);
}
function doMkdir() {
  const name = document.getElementById('mkdir-input').value.trim();
  if (!name) { toast('请输入文件夹名称', 'error'); return; }
  const parent = ctxTargetIsDir ? ctxTargetPath : (ctxTargetPath ? ctxTargetPath.split('/').slice(0,-1).join('/') : '');
  const fullPath = parent ? parent + '/' + name : name;
  try {
    const data = apiMkdir(fullPath);
    if (data.ok) {
      document.getElementById('modal-mkdir').classList.remove('show');
      refreshCurrent();
      toast('文件夹已创建 ✓', 'success');
    } else {
      toast('创建失败: ' + (data.error || '未知错误'), 'error');
    }
  } catch(e) {
    toast('创建失败: ' + e.message, 'error');
  }
}

// ── 快速新建笔记（在当前目录）──
function showQuickNewNoteModal() {
  const folder = currentTreePath || '';
  document.getElementById('quick-note-folder-label').textContent = '📁 ' + (folder || '根目录');
  document.getElementById('quick-note-name').value = '';
  document.getElementById('modal-quick-new').classList.add('show');
  setTimeout(() => document.getElementById('quick-note-name').focus(), 80);
}
function doQuickNewNote() {
  const name = document.getElementById('quick-note-name').value.trim();
  if (!name) { toast('请输入笔记标题', 'error'); return; }
  const folder = currentTreePath || '';
  try {
    const data = apiNewNote(name, folder);
    if (data.ok) {
      document.getElementById('modal-quick-new').classList.remove('show');
      refreshCurrent();
      openFile(data.path);
      toast('笔记已创建 ✓', 'success');
    } else {
      toast('创建失败: ' + (data.error || '未知错误'), 'error');
    }
  } catch(e) {
    toast('创建失败: ' + e.message, 'error');
  }
}

async function doNewNote() {
  const name = document.getElementById('new-file-name').value.trim();
  if (!name) { toast('请输入文件名', 'error'); return; }
  try {
    const data = await apiNewNote(name, selectedFolder);
    if (data.ok) {
      document.getElementById('modal-new').classList.remove('show');
      refreshCurrent();
      openFile(data.path);
      toast('笔记已创建 ✓', 'success');
    } else {
      toast('创建失败: ' + (data.error || '未知错误'), 'error');
    }
  } catch (e) {
    toast('创建失败: ' + e.message, 'error');
  }
}