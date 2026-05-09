// tree.js — 文件树 accordion 渲染


function renderRoot(items) {
  const container = document.getElementById('file-tree');
  container.innerHTML = '';
  items.forEach(item => {
    (function(item) {
    container.appendChild(createTreeButton(item));
    })(item);
  });
  lucide.createIcons();
}

function createTreeButton(item) {
  const btn = document.createElement('button');
  btn.dataset.path = item.path;
  btn.className = 'tree-item' + (item.is_dir ? ' folder' : '') + (currentFile === item.path ? ' active' : '');
  if (!item.is_dir) {
    btn.innerHTML = '<i data-lucide="file-text"></i><span>' + item.name.replace(/\.md$/,'') + '</span>';
    btn.onclick = () => openFile(item.path);
  } else {
    btn.innerHTML = '<i data-lucide="folder"></i><span>' + item.name + '</span>';
    btn.onclick = () => { toggleFolder(item.path); updateSidebarPathLabel(); };
  }
  btn.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    showCtxMenu(e.clientX, e.clientY, item.path, item.is_dir);
  });
  return btn;
}

function toggleFolder(folderPath) {
  const container = document.getElementById('file-tree');
  const btn = container.querySelector('[data-path="' + CSS.escape(folderPath) + '"]');
  if (!btn) return;

  const existing = btn.nextElementSibling;
  const wasExpanded = existing && existing.dataset.subtree === folderPath;

  if (wasExpanded) {
    existing.remove();
    currentTreePath = '';
    localStorage.removeItem('vault-tree-path');
  } else {
    currentTreePath = folderPath;
    localStorage.setItem('vault-tree-path', folderPath);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/tree?path=' + encodeURIComponent(folderPath), false);
      xhr.send(null);
      if (xhr.status !== 200) return;
      const data = JSON.parse(xhr.responseText);
      if (!data.ok) return;

      const subDiv = document.createElement('div');
      subDiv.className = 'tree-children';
      subDiv.dataset.subtree = folderPath;
      data.items.forEach(item => {
        (function(item) {
        subDiv.appendChild(createTreeButton(item));
        })(item);
      });
      btn.after(subDiv);
      lucide.createIcons();
    } catch (e) {
      console.error('加载子目录失败', e);
    }
  }
}

function renderSubTree(items, folderPath) {
  const container = document.getElementById('file-tree');
  const btn = container.querySelector('[data-path="' + CSS.escape(folderPath) + '"]');
  if (!btn) return;

  const existing = btn.nextElementSibling;
  const alreadyExpanded = existing && existing.dataset.subtree === folderPath;

  const newDiv = document.createElement('div');
  newDiv.className = 'tree-children';
  newDiv.dataset.subtree = folderPath;
  items.forEach(item => {
    (function(item) {
    newDiv.appendChild(createTreeButton(item));
    })(item);
  });

  if (alreadyExpanded) {
    existing.replaceWith(newDiv);
  } else {
    btn.after(newDiv);
  }
  lucide.createIcons();
}

function loadTree(path) {
  if (path === undefined) path = currentTreePath;
  currentTreePath = path;
  if (path) localStorage.setItem('vault-tree-path', path);
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/tree?path=' + encodeURIComponent(path), false);
    xhr.send(null);
    if (xhr.status !== 200) return;
    const data = JSON.parse(xhr.responseText);
    if (!data.ok) return;

    if (!path) {
      renderRoot(data.items);
    } else {
      renderSubTree(data.items, path);
    }
  } catch (e) {
    console.error('加载目录失败', e);
  }
}

function refreshCurrent() {
  const savedFile = currentFile;
  const folderPath = currentTreePath;
  if (!folderPath) {
    // 根目录：重新加载
    loadTree('');
    return;
  }
  // 子目录：检查 accordion 是否已展开
  const container = document.getElementById('file-tree');
  const btn = container.querySelector('[data-path="' + CSS.escape(folderPath) + '"]');
  const existing = btn ? btn.nextElementSibling : null;
  if (!existing || existing.dataset.subtree !== folderPath) {
    // 未展开，不需要刷新
    if (savedFile) openFile(savedFile);
    return;
  }
  // 已展开：重新读取内容并替换 subtree
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/tree?path=' + encodeURIComponent(folderPath), false);
    xhr.send(null);
    if (xhr.status !== 200) return;
    const data = JSON.parse(xhr.responseText);
    if (!data.ok) return;

    const newDiv = document.createElement('div');
    newDiv.className = 'tree-children';
    newDiv.dataset.subtree = folderPath;
    data.items.forEach(item => {
      (function(item) {
      newDiv.appendChild(createTreeButton(item));
      })(item);
    });
    existing.replaceWith(newDiv);
    lucide.createIcons();
    if (savedFile) openFile(savedFile);
  } catch (e) {
    console.error('刷新失败', e);
  }
}

function updateSidebarPathLabel() {
  const label = document.getElementById('sidebar-path-label');
  if (!label) return;
  label.textContent = currentTreePath ? currentTreePath.split('/').pop() : '根目录';
  label.title = currentTreePath || '根目录';
}

function initFileTree() {
  loadTree('');
  updateSidebarPathLabel();
  const savedPath = localStorage.getItem('vault-tree-path');
  if (savedPath) {
    setTimeout(() => restoreTreePath(savedPath), 100);
  }
}

function restoreTreePath(path) {
  const parts = path.split('/');
  let idx = 0;
  function expandNext() {
    if (idx >= parts.length) return;
    const target = parts.slice(0, idx + 1).join('/');
    const btn = document.querySelector('[data-path="' + CSS.escape(target) + '"]');
    if (btn) {
      idx++;
      // 用 click() 触发 accordion 展开（用户操作方式）
      btn.click();
      setTimeout(expandNext, 100);
    } else {
      setTimeout(expandNext, 80);
    }
  }
  setTimeout(expandNext, 80);
}

