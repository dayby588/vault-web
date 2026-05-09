// utils.js — 通用工具函数

function toast(msg, type) {
  type = type || 'success';
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { el.classList.add('show'); }, 10);
  setTimeout(function() {
    el.classList.remove('show');
    setTimeout(function() { el.remove(); }, 300);
  }, 2500);
}


function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}