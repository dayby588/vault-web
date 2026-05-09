// view.js — 四视图切换


function updateView() {
  const workspace = document.querySelector('.workspace');
  const empty = document.getElementById('empty-state');
  const panes = document.getElementById('panes');
  const rh = document.getElementById('resize-h');
  const rv = document.getElementById('resize-v');

  if (!currentFile) {
    workspace.className = 'workspace view-' + currentView;
    empty.style.display = 'flex';
    panes.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  panes.style.display = 'flex';

  // 移除旧视图类，加新视图类
  workspace.className = 'workspace view-' + currentView;

  // 控制分隔条显隐
  rh.style.display = (currentView === 'split') ? 'block' : 'none';
  rv.style.display = (currentView === 'vertical') ? 'block' : 'none';

  // 预览模式都要渲染一次
  if (currentView !== 'edit') updatePreview();

  // CodeMirror 刷新
  if (editor) editor.refresh();
}
