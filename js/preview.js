// preview.js — Markdown 预览渲染

function updatePreview() {
  const md = editor ? editor.getValue() : '';
  // 1. 预处理：把 [[笔记名]] 和 [[笔记名|别名]] 转为标准链接
  const processed = md.replace(
    /\[\[([^\]]+?)\]\]/g,
    (match, inner) => {
      const parts = inner.split('|');
      const target = parts[0].trim();
      const label = (parts[1] || parts[0]).trim();
      return `[${label}](#wikilink:${encodeURIComponent(target)})`;
    }
  );
  const html = marked.parse(processed, { breaks: true, gfm: true });
  const container = document.getElementById('preview-content');
  container.innerHTML = html;

  // 2. 后处理：所有 a 链接按类型绑定行为
  // 3. 给 h1/h2/h3 添加 id 锚点（供目录跳转）
  container.querySelectorAll('h1,h2,h3').forEach((el, i) => {
    if (!el.id) {
      el.id = 'heading-' + i + '-' + (el.textContent || '').replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase().slice(0, 30);
    }
  });

  // 4. 后处理：所有 a 链接按类型绑定行为
  container.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || '';

    // Wiki 链接（我们在预处理时转换的）
    if (href.startsWith('#wikilink:')) {
      const noteName = decodeURIComponent(href.replace('#wikilink:', ''));
      a.style.cursor = 'pointer';
      a.style.color = 'var(--accent)';
      a.style.textDecoration = 'underline dotted';
      a.setAttribute('title', '打开笔记: ' + noteName);
      a.addEventListener('click', e => {
        e.preventDefault();
        navigateToNote(noteName);
      });
    }
    // 普通 .md 文件链接
    else if (href.endsWith('.md')) {
      a.style.cursor = 'pointer';
      a.style.color = 'var(--accent)';
      a.style.textDecoration = 'underline dotted';
      a.addEventListener('click', e => {
        e.preventDefault();
        const path = href.replace(/^\.\//, '').replace(/\.md$/, '');
        navigateToNote(path);
      });
    }
    // 外部链接新标签页
    else if (href.startsWith('http://') || href.startsWith('https://')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    // 其他内部相对路径
    else if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
      a.style.cursor = 'pointer';
      a.addEventListener('click', e => {
        e.preventDefault();
        const noteName = href.replace(/\.md$/, '').replace(/^\.\//, '').replace(/^\//, '');
        navigateToNote(noteName);
      });
    }
  });
}
