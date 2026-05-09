// editor.js — CodeMirror 编辑器

function initEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById('editor-area'), {
    mode: 'markdown',
    theme: 'material-darker',
    lineNumbers: true,
    lineWrapping: true,
    autofocus: false,
    placeholder: '选择或新建一个笔记开始...',
    extraKeys: {
      'Ctrl-S': saveFile,
      'Cmd-S': saveFile,
    }
  });

  editor.on('change', () => {
    isDirty = true;
    updatePreview();
    updateView();
    // 防抖自动保存
    if (!autoSaveEnabled) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      if (isDirty && currentFile) {
        saveFile();
      }
    }, autoSaveDelay * 1000);
  });
}

function openFile(path) {
  if (isDirty && currentFile) {
    const ok = confirm('当前文件有未保存的更改，是否保存？');
    if (ok) saveFile();
  }
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/read?path=${encodeURIComponent(path)}`, false);
    xhr.send(null);
    if (xhr.status !== 200) {
      toast('打开文件失败: HTTP ' + xhr.status, 'error');
      return;
    }
    const data = JSON.parse(xhr.responseText);
    if (data.error) { toast(data.error, 'error'); return; }

    currentFile = path;
    editor.setValue(data.content || '');
    editor.clearHistory();
    isDirty = false;

    document.querySelectorAll('.tree-item').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
    document.getElementById('file-info').textContent = path;
    document.getElementById('btn-delete').disabled = false;
    updatePreview();
    updateView();
  } catch (e) {
    toast('打开文件失败: ' + e.message, 'error');
  }
}

function saveFile() {
  if (!currentFile) { toast('请先选择一个文件', 'error'); return; }
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/write', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ path: currentFile, content: editor.getValue() }));
    if (xhr.status !== 200) {
      toast('保存失败: HTTP ' + xhr.status, 'error');
      return;
    }
    const data = JSON.parse(xhr.responseText);
    if (data.ok) {
      isDirty = false;
      toast('已保存 ✓', 'success');
    } else {
      toast('保存失败: ' + data.error, 'error');
    }
  } catch (e) {
    toast('保存失败: ' + e.message, 'error');
  }
}

async function deleteFile() {
  if (!currentFile) { toast('请先选择一个文件', 'error'); return; }
  document.getElementById('delete-modal-filename').textContent = currentFile;
  document.getElementById('modal-delete').classList.add('show');
  _pendingDelete = currentFile;
}


async function doDeleteConfirmed() {
  const file = _pendingDelete;
  _pendingDelete = null;
  document.getElementById('modal-delete').classList.remove('show');
  if (!file) return;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/delete', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ path: file }));
    if (xhr.status !== 200) { toast('删除失败 HTTP', xhr.status); return; }
    const data = JSON.parse(xhr.responseText);
    if (data.ok) {
      currentFile = null;
      editor.setValue('');
      isDirty = false;
      document.getElementById('file-info').textContent = '';
      document.getElementById('btn-delete').disabled = true;
      await refreshCurrent();
      updateView();
      toast('已删除', 'success');
    } else {
      toast('删除失败: ' + data.error, 'error');
    }
  } catch (e) {
    toast('删除失败', 'error');
  }
}

async function navigateToNote(noteName) {
  // 先尝试精确路径
  const paths = [
    noteName + '.md',
    '00-控制台/' + noteName + '.md',
    '01-我与AI记忆/' + noteName + '.md',
    '02-收集箱/' + noteName + '.md',
    '10-自媒体与内容资产/' + noteName + '.md',
    '20-素材库/' + noteName + '.md',
    '30-学习与认知系统/' + noteName + '.md',
    '40-战略与商业系统/' + noteName + '.md',
    '50-输出与复盘/' + noteName + '.md',
  ];
  for (const p of paths) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/read?path=' + encodeURIComponent(p), false);
      xhr.send(null);
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.ok) { openFile(p); return; }
        } catch(e) {}
      }
    } catch (e) {}
  }
  // 没找到，提示
  toast('未找到笔记: ' + noteName, 'error');
}