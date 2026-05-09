# 知识进化系统 PRD

**文档版本：** v1.0
**最后更新：** 2026-05-09
**维护者：** 林途
**GitHub：** https://github.com/dayby588/vault-web

---

## 1. 产品概述

### 1.1 产品定位

知识进化系统（原名：林途知识进化系统）是一款面向个人的**Obsidian 知识库网页编辑器**，支持在浏览器中管理、编辑、搜索笔记，并提供知识图谱可视化。

核心用户：拥有大量 Obsidian 笔记库（数百到数千篇），需要跨设备访问和管理的知识工作者。

### 1.2 核心价值

- **浏览器即客户端**：无需安装 Obsidian，任何设备的浏览器都能访问自己的知识库
- **开箱即用**：Windows 用户下载 exe 双击即可运行，无需配置 Python 环境
- **局域网可用**：可在家庭/办公室内网部署，手机和电脑同时访问同一笔记库
- **可离线使用**：所有前端资源（CSS/JS/字体）全部打包在项目内，无需外网依赖

### 1.3 使用场景

| 场景 | 说明 |
|------|------|
| 多设备同步 | 家里电脑编写的笔记，到公司手机上立即可见 |
| 躺着写作 | 用平板/手机浏览器访问，用大屏设备的外接键盘写长文 |
| 公共电脑访问 | 在他人设备上用浏览器临时访问自己的笔记库 |
| 分享知识 | 将笔记库部署在服务器上，供团队或公众浏览（只读模式可扩展） |

### 1.4 约束与限制

- **单用户设计**：认证为单账号密码，无多用户隔离
- **非官方客户端**：非 Obsidian 官方产品，不支持插件和同步功能
- **中文优先**：界面和文档以中文为主

---

## 2. 系统架构

### 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | 原生 HTML/CSS/JS（无框架） | 单文件 HTML，最大兼容性和最低门槛 |
| 编辑器 | CodeMirror 5 | Markdown 编辑，支持 GFM 实时预览 |
| 后端 | Flask（Python） | 轻量 HTTP 服务器，兼容 Windows |
| 生产部署（Linux） | Gunicorn 多进程 | 高并发，稳定运行 |
| 生产部署（Windows） | Flask 内置服务器（py app.py） | PyInstaller 打包后单文件运行 |
| 打包 | PyInstaller | Windows exe 打包工具 |
| 图谱可视化 | D3.js 力导向图 | 知识网络可视化 |

### 2.2 部署架构

```
[Windows 用户]
  └─ 知识进化系统.exe（PyInstaller 单文件）
       ├─ GUI 启动器（CustomTkinter）
       │    ├─ 检查 config.json
       │    ├─ 启动 Flask 服务（py app.py）
       │    └─ 自动打开浏览器
       └─ app.py（Flask 后端 + 前端静态文件）
            ├─ API 路由（/api/*）
            └─ 静态文件（index.html, graph.html, js/, vendor/）

[Linux/macOS 用户]
  └─ 手动运行 gunicorn -c gunicorn.conf.py app:app
       └─ app.py（Flask 后端 + 前端静态文件）
```

### 2.3 目录结构

```
/home/xp/vault-web/（Linux 部署）
vault-web/
├── app.py                  # Flask 主应用（所有 API 路由 + 静态文件服务）
├── config.json             # 用户配置（vault 路径、端口、账号密码）
├── config.example.json     # 配置模板（分发时附带）
├── requirements.txt        # Python 依赖（flask, gunicorn）
├── gunicorn.conf.py       # Gunicorn 生产配置
├── vault-web.log          # 访问日志
├── vault-web.pid          # 进程 PID
├── gui_launcher.py        # CustomTkinter GUI 启动器（Windows 用）
├── obsidian-web-vault.py  # 旧版 Python HTTP 服务器（已废弃）
├── index.html             # 主编辑器页面
├── graph.html             # 知识图谱页面
├── logs.html              # 运行日志查看页面
├── js/                    # 前端 JS 模块
│   ├── api.js             # API 调用封装
│   ├── editor.js          # CodeMirror 编辑器管理
│   ├── events.js          # 全局事件绑定
│   ├── globals.js         # 全局变量
│   ├── main.js            # 入口点
│   ├── modal.js           # 弹窗管理（新建/快速新建/确认删除）
│   ├── preview.js         # Markdown 实时预览
│   ├── theme.js           # 主题切换
│   ├── tree.js            # 文件树渲染
│   ├── utils.js           # 工具函数
│   └── view.js            # 视图切换
├── vendor/                 # 本地化前端依赖（无需外网）
│   ├── css/
│   │   ├── codemirror.min.css
│   │   ├── material-darker.min.css
│   │   └── dialog.min.css
│   └── js/
│       ├── codemirror.min.js
│       ├── d3.min.js
│       ├── dialog.min.js
│       ├── gfm.min.js
│       ├── lucide.min.js
│       ├── marked.min.js
│       ├── search.min.js
│       ├── searchcursor.min.js
│       └── d3.min.js
├── .github/
│   └── workflows/
│       └── build.yml      # GitHub Actions 构建 Windows exe
└── vault-web.spec         # PyInstaller 打包配置（GUI 模式）
```

---

## 3. 功能规格

### 3.1 文件管理

| 功能 | 说明 | 状态 |
|------|------|------|
| 浏览文件树 | 左侧树形目录，支持折叠/展开 | ✅ |
| 创建笔记 | 输入文件名，选择目标目录，创建 .md 文件 | ✅ |
| 快速创建 | 在当前目录直接新建笔记并打开 | ✅ |
| 编辑笔记 | CodeMirror Markdown 编辑器，语法高亮 | ✅ |
| 保存笔记 | Ctrl+S 或保存按钮，实时保存到磁盘 | ✅ |
| 重命名 | 对文件或文件夹重命名 | ✅ |
| 删除 | 删除文件或空文件夹（有多级内容时禁止删除） | ✅ |
| 新建文件夹 | 在指定路径下创建新目录 | ✅ |
| 回到根目录 | 一键返回 vault 根目录视图 | ✅ |

### 3.2 搜索

| 功能 | 说明 | 状态 |
|------|------|------|
| 全文搜索 | 实时搜索笔记标题和内容 | ✅ |
| 高亮匹配 | 搜索结果中关键词高亮显示 | ✅ |
| 搜索历史 | 保留最近搜索关键词 | ✅ |

### 3.3 知识图谱

| 功能 | 说明 | 状态 |
|------|------|------|
| 节点可视化 | D3.js 力导向图展示笔记关系 | ✅ |
| 节点颜色分类 | 按目录前缀分色（10-系统维护/20-素材库 等） | ✅ |
| 节点大小 | 按入链数量计算，入链越多节点越大 | ✅ |
| 边权重 | 按双向链接数量决定边粗细 | ✅ |
| 点击跳转 | 点击节点在新标签页打开对应笔记 | ✅ |
| 粒子动画 | 边上有流动光点动画效果 | ✅ |
| 呼吸光晕 | 节点周围有呼吸节奏的光晕 | ✅ |

### 3.4 主题与界面

| 功能 | 说明 | 状态 |
|------|------|------|
| 暗色主题 | 默认深色主题，适合长时间写作 | ✅ |
| 明亮主题 | 简约明亮风格 | ✅ |
| Apple 主题 | macOS 风格浅色 | ✅ |
| 主题切换 | 工具栏一键切换，自动记住偏好 | ✅ |
| 实时预览 | 编辑/预览分栏，Markdown 实时渲染 | ✅ |
| 全屏编辑 | 专注模式，隐藏工具栏 | ✅ |

### 3.5 日志与运维

| 功能 | 说明 | 状态 |
|------|------|------|
| 运行日志页面 | 浏览器查看 /logs.html，彩色高亮 | ✅ |
| 健康检查 | GET /api/health 返回服务状态 | ✅ |
| 自动重启 | GUI 启动器可一键停止/启动服务 | ✅ |
| 进程状态显示 | GUI 显示服务运行状态和 PID | ✅ |

### 3.6 Windows 打包（exe）

| 功能 | 说明 | 状态 |
|------|------|------|
| 单文件 exe | PyInstaller --onefile 打包，无需安装 Python | ✅ |
| GUI 启动器 | CustomTkinter 图形界面，傻瓜式操作 | ✅ |
| 自动打开浏览器 | 启动后自动跳转到 localhost:8765 | ✅ |
| SmartScreen 兼容 | 需要用户手动解除锁定（安全机制） | ⚠️ 需用户操作 |

---

## 4. API 文档

### 4.1 健康检查

```
GET /api/health

Response 200:
{
  "ok": true,
  "vault": "/home/xp/OBScangku",
  "version": "v3.0-Flask"
}
```

### 4.2 获取配置

```
GET /api/config

Response 200:
{
  "username": "admin"
}
```

### 4.3 目录树

```
GET /api/tree?path=<folder_path>

Response 200:
{
  "ok": true,
  "path": "20-素材库",
  "items": [
    { "name": "AI工具", "is_dir": true, "size": 0 },
    { "name": "公众号运营.md", "is_dir": false, "size": 2048 }
  ]
}
```

### 4.4 全文搜索

```
GET /api/search?q=<keyword>

Response 200:
{
  "ok": true,
  "query": "AI工具",
  "results": [
    { "path": "20-素材库/AI工具/GPT-4.md", "snippet": "...相关片段...", "title": "GPT-4" }
  ]
}
```

### 4.5 读取笔记

```
GET /api/read?path=<file_path>

Response 200:
{
  "ok": true,
  "path": "20-素材库/AI工具/GPT-4.md",
  "content": "# GPT-4\n\n这是笔记内容..."
}
```

### 4.6 保存笔记

```
POST /api/write
Content-Type: application/json

{
  "path": "20-素材库/AI工具/GPT-4.md",
  "content": "# GPT-4\n\n更新后的内容..."
}

Response 200:
{ "ok": true }
```

### 4.7 新建笔记

```
POST /api/create
Content-Type: application/json

{
  "name": "新建笔记.md",
  "path": "20-素材库"   // 或 "folder": "20-素材库"
}

Response 200:
{ "ok": true, "path": "20-素材库/新建笔记.md" }

Response 400 (已存在):
{ "ok": false, "error": "文件已存在" }
```

### 4.8 重命名

```
POST /api/rename
Content-Type: application/json

{
  "path": "20-素材库/旧名.md",
  "new_name": "新名.md"
}

Response 200:
{ "ok": true, "old_path": "...", "new_path": "..." }
```

### 4.9 删除

```
POST /api/delete
Content-Type: application/json

{
  "path": "20-素材库/旧笔记.md"
}

Response 200:
{ "ok": true }
```

### 4.10 新建文件夹

```
POST /api/mkdir
Content-Type: application/json

{
  "path": "20-素材库/新子目录"
}

Response 200:
{ "ok": true }
```

### 4.11 知识图谱

```
GET /api/graph

Response 200:
{
  "ok": true,
  "nodes": [
    { "id": "20-素材库/AI工具/GPT-4.md", "title": "GPT-4", "group": 2, "size": 5 }
  ],
  "links": [
    { "source": "20-素材库/AI工具/GPT-4.md", "target": "20-素材库/AI工具/提示词技巧.md", "weight": 2 }
  ]
}
```

### 4.12 日志查询

```
GET /api/logs?n=200

Response 200:
{
  "ok": true,
  "lines": ["192.168.1.1 - - [09/May/2026:19:26:06] \"GET /api/tree ...\" 200 ..."],
  "total": 1523
}
```

### 4.13 清空日志

```
POST /api/logs/clear

Response 200:
{ "ok": true }
```

---

## 5. 配置说明

### 5.1 config.json

```json
{
  "vault": "/home/xp/OBScangku",
  "port": 8765,
  "host": "0.0.0.0",
  "username": "admin",
  "password": "lintu"
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| vault | string | 必填 | Obsidian 笔记库根目录路径 |
| port | int | 8765 | HTTP 服务端口 |
| host | string | 0.0.0.0 | 监听地址，0.0.0.0 表示所有网卡 |
| username | string | admin | 登录用户名 |
| password | string | 必填 | 登录密码 |

### 5.2 目录前缀规范（约定）

vault 根目录下的文件夹建议使用数字前缀进行分类：

| 前缀 | 分类 | 示例 |
|------|------|------|
| 10- | 系统维护 | 系统维护与标准 |
| 20- | 素材库 | 素材库/AI工具 |
| 30- | 学习与认知 | 学习与认知系统 |
| 40- | 战略与商业 | 战略与商业系统 |
| 50- | 输出与复盘 | 输出与复盘 |
| 60- | Bases看板 | Bases看板 |
| 80- | 系统维护与标准 | （同 10-） |
| 90- | 归档 | 归档 |
| 99- | 模板 | 模板 |

### 5.3 图谱颜色映射

```
group 0: #4B7BE5  蓝色   — 归档
group 1: #FF6B6B  红色   — 学习与认知
group 2: #4ECDC4  青色   — 素材库
group 3: #FFE66D  黄色   — 战略与商业
group 4: #A66CFF  紫色   — 系统维护
group 5: #FF9F43  橙色   — 输出与复盘
group 6: #FF6B9D  粉色   — Bases看板
group 7: #95E1D3  薄荷绿 — 模板
group 8: #F8B500  金色   — 其他
```

---

## 6. 打包与分发

### 6.1 Windows exe 构建

**构建方式：** GitHub Actions 自动构建

**触发方式：** 手动 `workflow_dispatch`

**构建流程：**
1. 拉取仓库代码
2. 安装 Python + PyInstaller
3. 执行 `pyinstaller --onefile gui_launcher.py`
4. 打包所有必要文件（app.py、前端文件、vendor/、js/）
5. 生成 `知识进化系统.exe`
6. 上传为 GitHub Actions artifact

**下载 artifact：** 每次构建完成后从 Actions 页面下载，artifact 保留 7 天

**exe 使用步骤：**
1. 解压下载的压缩包
2. 右键 `知识进化系统.exe` → 属性 → 安全 → 解除锁定（Windows SmartScreen 安全机制）
3. 双击 exe 启动，或运行 `启动知识系统.bat`
4. 浏览器自动打开 `http://localhost:8765`

### 6.2 Linux/macOS 部署

```bash
# 1. 克隆仓库
git clone https://github.com/dayby588/vault-web.git
cd vault-web

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置 vault 路径
cp config.example.json config.json
# 编辑 config.json，填入自己的 vault 路径

# 4. 启动服务
gunicorn -c gunicorn.conf.py app:app

# 或使用管理脚本
./manage.sh start
```

### 6.3 开机自启（Linux systemd）

```bash
# 安装服务
sudo cp vault-web.service /etc/systemd/system/
sudo systemctl enable vault-web
sudo systemctl start vault-web

# 管理命令
sudo systemctl status vault-web
sudo systemctl restart vault-web
sudo journalctl -u vault-web -f
```

---

## 7. 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-05-09 | 林途 | 初始版本发布 |
| v2.21-stable | 2026-05-09 | 林途 | 从旧版 obsidian-web-vault.py 迁移 |
| v3.0 | 2026-05-09 | 林途 | Flask + Gunicorn 重构，支持 Windows exe 打包 |
| v3.0-Flask | 2026-05-09 | 林途 | 当前运行版本，Flask 后端 + gunicorn 多进程托管 |

### 关键修复记录

| 日期 | Commit | 修复内容 |
|------|--------|----------|
| 2026-05-09 | d33b06e | fix: accept both 'folder' and 'path' params for /api/create |
| 2026-05-09 | 6f42d09 | fix: GUI launcher fully supports Windows（移除 gunicorn 依赖） |
| 2026-05-09 | af23433 | feat: 知识进化系统品牌更名 + 日志页面 |

---

## 8. 已知问题与限制

| 问题 | 严重程度 | 说明 | 解决方式 |
|------|----------|------|----------|
| Windows SmartScreen 拦截 | 低 | 未签名 exe 被 Windows SmartScreen 标记 | 用户手动在属性中解除锁定 |
| 跨 worker 请求解析异常 | 低 | gunicorn 多 worker 下 JSON 解析偶发失败 | 使用同步 worker + single process 规避 |
| 多用户无隔离 | 中 | 所有用户共用同一账号密码 | 未来可扩展基于 token 的多用户体系 |
| 不支持 Obsidian 插件 | 低 | 非官方实现，先天限制 | 无计划支持 |
| 不支持双向同步 | 低 | 仅本地文件读写，无云端同步 | 依赖 Obsidian 官方同步或第三方同步方案 |

---

## 9. 未来规划

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0 | 移动端适配 | 优化手机浏览器的触摸操作体验 |
| P1 | 多账号支持 | 基于 config.json 配置多用户及密码 |
| P1 | 只读分享模式 | 生成带密码的只读链接分享给外部人员 |
| P2 | 夜间模式自动切换 | 根据系统时间自动切换暗/亮主题 |
| P2 | 笔记标签管理 | 支持按标签筛选和聚合笔记 |
| P3 | AI 写作助手 | 接入 LLM API 提供写作续写功能 |
| P3 | WebDAV 同步 | 支持与 NAS 或云盘双向同步 |

---

*文档编写：Hermes AI Assistant · 2026-05-09*
