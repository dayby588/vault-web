// api.js — 所有后端 API 调用（XHR 同步）
// 调用方负责 try/catch，失败抛出 Error

function apiRead(path) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/read?path=' + encodeURIComponent(path), false);
  xhr.send(null);
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiSave(path, content) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/write', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ path, content }));
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiDelete(path) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/delete', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ path }));
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiTree(path) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/tree?path=' + encodeURIComponent(path || ''), false);
  xhr.send(null);
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiNewNote(name, folder) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/create', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ name, path: folder || '' }));
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiSearch(q) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/search?q=' + encodeURIComponent(q), false);
  xhr.send(null);
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiHealth() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/health', false);
  xhr.send(null);
  if (xhr.status !== 200) return { ok: false };
  return JSON.parse(xhr.responseText);
}
function apiRename(path, newName) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/rename', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ path, new_name: newName }));
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiMkdir(path) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/mkdir', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ path }));
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
function apiGraph() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/graph', false);
  xhr.send(null);
  if (xhr.status !== 200) throw new Error('HTTP ' + xhr.status);
  return JSON.parse(xhr.responseText);
}
