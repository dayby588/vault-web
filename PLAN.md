# Vault Web — 重构计划（Flask + 配置化 + 打包分发）

**目标**：将现有 `_web-editor` 改造为可分发给任何人使用的标准化应用  
**原则**：业务逻辑零改动，只动框架层和配置层  
**当前版本**：v2.21-stable（位于 `/home/xp/OBScangku/_web-editor/`，不动）  
**新版本**：v3.0（位于 `/home/xp/vault-web/`）

---

## 目录结构（完成后）

```
/home/xp/vault-web/
├── app.py                  # Flask 主应用（替代 obsidian-web-vault.py）
├── config.json             # 用户配置（vault路径、端口、账号密码）
├── config.example.json     # 配置模板（分发时附带）
├── requirements.txt        # Python 依赖
├── gunicorn.conf.py        # Gunicorn 生产配置
├── manage.sh               # 服务管理脚本（start/stop/restart/status/log）
├── install.sh              # 一键安装脚本（新用户使用）
├── vault-web.service       # systemd 服务单元
├── README.md               # 使用说明（5分钟上手）
├── PLAN.md                 # 本文件（开发计划）
├── index.html              # 前端主页面
├── graph.html              # 知识图谱页面
├── js/                     # 前端 JS 模块
│   ├── globals.js
│   ├── utils.js
│   ├── api.js
│   ├── editor.js
│   ├── preview.js
│   ├── theme.js
│   ├── tree.js
│   ├── view.js
│   ├── modal.js
│   ├── events.js
│   └── main.js
└── vendor/                 # 本地化前端依赖（无需外网）
    ├── css/
    │   ├── codemirror.min.css
    │   ├── material-darker.min.css
    │   └── dialog.min.css
    └── js/
        ├── codemirror.min.js
        ├── gfm.min.js
        ├── searchcursor.min.js
        ├── search.min.js
        ├── dialog.min.js
        ├── marked.min.js
        ├── lucide.min.js
        └── d3.min.js
```

---

## Phase 1 — Flask + Gunicorn 迁移

**预计时间**：2 小时  
**交付标准**：服务能正常启动，所有 API 和静态文件访问正常

### 步骤 1：复制前端文件

将以下内容从 `_web-editor/` 原样复制到 `vault-web/`：
- `index.html`
- `graph.html`
- `js/`（整个目录）
- `vendor/`（整个目录）

**不复制**：`obsidian-web-vault.py`（要重写）、`vault-web.log`、`vault-web.pid`、备份目录

---

### 步骤 2：创建 requirements.txt

```
flask>=3.0
gunicorn>=21.0
```

无其他第三方依赖，标准库（pathlib、threading、re 等）全部保留。

---

### 步骤 3：重写后端为 Flask（app.py）

**保持不变的部分（直接复制）**：
- `get_lan_ip()`
- `_do_scan_vault()` / `scan_vault()`（含缓存）
- `_vault_max_mtime()`
- `build_tree()`
- `search_notes()`
- `read_note()`
- `write_note()`
- `create_note()`
- `rename_item()`
- `mkdir_item()`
- `delete_item()`
- `_build_graph_uncached()` / `build_graph()`（含缓存）
- 所有缓存变量和 Lock

**改动的部分（框架层）**：

| 旧写法（http.server） | 新写法（Flask） |
|----------------------|----------------|
| `class VaultHandler` | `@app.route('/api/...')` |
| `self.send_json(data)` | `return jsonify(data)` |
| `if isinstance(result, tuple): self.send_json(*result)` | `return jsonify(result[0]), result[1]` |
| `self._serve_static(path)` | `send_from_directory()` 或 Flask 静态文件 |
| `class TimeoutTCPServer` + `serve()` | `if __name__ == '__main__': app.run()` |
| 手写错误处理 | `@app.errorhandler(404)` / `@app.errorhandler(500)` |

**新增的部分**：
- `GET /api/config`：返回 `{"username": "admin"}`（只返回用户名，密码不出接口）
- 统一异常捕获：所有路由加 try/except，500 时记录日志并返回 JSON 错误

**Flask 路由映射**（对应旧版 VaultHandler）：

```
GET  /                          → 返回 index.html
GET  /graph.html                → 返回 graph.html
GET  /js/<path>                 → 返回 js/ 目录文件
GET  /vendor/<path>             → 返回 vendor/ 目录文件
GET  /api/health                → 健康检查
GET  /api/config                → 返回用户名（供登录页使用）
GET  /api/tree?path=            → 目录树
GET  /api/files                 → 全部文件列表
GET  /api/search?q=             → 全文搜索
GET  /api/read?path=            → 读取文件
GET  /api/graph                 → 图谱数据
POST /api/write                 → 保存文件
POST /api/create                → 新建笔记
POST /api/delete                → 删除文件/目录
POST /api/rename                → 重命名
POST /api/mkdir                 → 新建文件夹
```

---

### 步骤 4：创建 gunicorn.conf.py

```python
# Gunicorn 生产配置
bind = "0.0.0.0:8765"          # 从 config.json 读取端口
workers = 2                     # 单用户场景 2 个 worker 足够
worker_class = "sync"           # 同步模式（与现有缓存锁兼容）
timeout = 30                    # 请求超时 30 秒
keepalive = 5
accesslog = "vault-web.log"
errorlog = "vault-web.log"
loglevel = "info"
capture_output = True           # 把 print 也写入日志
```

---

### 步骤 5：更新 manage.sh

启动命令从：
```bash
nohup python3 obsidian-web-vault.py >> vault-web.log 2>&1 &
```
改为：
```bash
nohup gunicorn -c gunicorn.conf.py app:app >> vault-web.log 2>&1 &
```

其余 stop / restart / status / log 逻辑不变。

---

### Phase 1 验收标准

- [ ] `./manage.sh start` 服务启动，无报错
- [ ] 浏览器访问 `http://localhost:8765` 显示登录页
- [ ] 登录后文件树正常加载
- [ ] 打开/编辑/保存笔记正常
- [ ] 搜索正常
- [ ] 图谱正常（含边和颜色）
- [ ] `./manage.sh log` 能看到请求日志

---

## Phase 2 — config.json 配置化

**预计时间**：30 分钟  
**交付标准**：所有硬编码路径和凭据消失，改 config.json 即可适配任意环境

### 步骤 6：创建 config.json

```json
{
  "vault": "/home/xp/OBScangku",
  "port": 8765,
  "host": "0.0.0.0",
  "username": "admin",
  "password": "123456"
}
```

同时创建 `config.example.json`（分发时附带，用户复制后填写自己的路径）：

```json
{
  "vault": "/path/to/your/obsidian/vault",
  "port": 8765,
  "host": "0.0.0.0",
  "username": "admin",
  "password": "your_password"
}
```

---

### 步骤 7：app.py 读取 config

启动时自动推导路径：
```python
BASE_DIR = Path(__file__).parent          # vault-web/ 目录（无论放在哪里）
CONFIG_FILE = BASE_DIR / "config.json"    # 同级 config.json

# 启动校验
if not CONFIG_FILE.exists():
    print("❌ 未找到 config.json，请复制 config.example.json 并填写配置")
    sys.exit(1)

config = json.loads(CONFIG_FILE.read_text())
VAULT = Path(config["vault"])

if not VAULT.exists():
    print(f"❌ vault 目录不存在: {VAULT}")
    sys.exit(1)

PORT = config.get("port", 8765)
USERNAME = config["username"]
PASSWORD = config["password"]
```

---

### 步骤 8：新增 /api/config 端点

```python
@app.route("/api/config")
def api_config():
    # 只返回用户名，密码绝不出接口
    return jsonify({"username": USERNAME})
```

---

### 步骤 9：index.html 登录逻辑改造

登录页启动时请求 `/api/config` 拿到用户名显示提示，校验逻辑：
- 用户输入的用户名和密码通过 `/api/login` 发送到服务端校验（或保持前端校验）
- 保持现有 sessionStorage 记住登录状态的逻辑不变

**注意**：密码校验继续在前端做（与现状一致），`/api/config` 只是让前端知道「这个系统的用户名叫什么」，不承担安全责任。

---

### 步骤 10：vault-web.service 解耦用户名

将：
```ini
User=xp
WorkingDirectory=/home/xp/vault-web
ExecStart=/usr/bin/python3 /home/xp/vault-web/obsidian-web-vault.py
```
改为读取当前用户和脚本实际位置，或在 `install.sh` 里动态生成。

---

### Phase 2 验收标准

- [ ] 删掉代码里所有 `/home/xp/` 字样，无硬编码路径
- [ ] 修改 `config.json` 的 vault 路径，服务重启后指向新 vault 正常工作
- [ ] 修改 `config.json` 的端口，服务重启后新端口生效
- [ ] `config.json` 不存在时，启动给出明确错误提示

---

## Phase 3 — 打包分发

**预计时间**：1 小时  
**交付标准**：新用户下载后，运行 `./install.sh`，5 分钟内浏览器能访问

### 步骤 11：install.sh 一键安装

交互流程：
```
1. 检查 Python 版本（< 3.8 报错退出）
2. 检查 pip 可用性
3. pip install -r requirements.txt
4. 询问：Vault 目录在哪里？（提示默认值）
5. 询问：端口号（默认 8765）
6. 询问：登录账号（默认 admin）
7. 询问：登录密码
8. 生成 config.json
9. 询问：是否安装为开机自启服务？（y/n）
   - y：sudo cp vault-web.service → 动态写入当前用户和路径 → systemctl enable
   - n：提示手动启动命令
10. 完成提示：访问地址 + manage.sh 用法
```

---

### 步骤 12：README.md

章节：
1. 系统要求（Python 3.8+，Linux/macOS）
2. 快速开始（3 行命令）
3. 配置说明（config.json 字段解释）
4. 服务管理（manage.sh 命令表）
5. 常见问题（端口占用、vault 路径错误、gunicorn 未安装）

---

### Phase 3 验收标准

- [ ] 全新环境执行 `./install.sh`，全程无需手动编辑任何文件
- [ ] 安装完成后浏览器能访问
- [ ] README 从零到跑起来不超过 5 分钟

---

## 执行顺序总结

```
准备  复制前端文件到 vault-web/
  ↓
P1.1  创建 requirements.txt
P1.2  重写 app.py（Flask）
P1.3  创建 gunicorn.conf.py
P1.4  更新 manage.sh
P1.5  验收测试
  ↓
P2.1  创建 config.json + config.example.json
P2.2  app.py 读取 config（消灭硬编码）
P2.3  新增 /api/config 端点
P2.4  index.html 登录逻辑调整
P2.5  验收测试
  ↓
P3.1  install.sh
P3.2  README.md
P3.3  整体验收测试
```

---

## 风险与注意事项

| 风险 | 概率 | 应对 |
|------|------|------|
| gunicorn 与 threading.Lock 缓存冲突 | 低（sync worker 单线程） | 使用 `worker_class = "sync"` 规避 |
| Flask 静态文件路由与 vault 文件路由冲突 | 低 | 明确路由优先级，vault 文件走独立路由 |
| index.html 登录逻辑改动引入 bug | 中 | Phase 2 最后改，改动量极小 |
| 新用户环境没有 gunicorn | 低 | install.sh 自动安装，README 有说明 |

---

*计划版本：v1.0 · 2026-05-09 · 待执行*
