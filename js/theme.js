// theme.js — 三套主题切换

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
