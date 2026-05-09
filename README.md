# Vault Web — Obsidian 知识库网页编辑器

基于 Flask + Gunicorn 的 Obsidian 知识库网页编辑器，支持多用户开箱即用。

---

## 系统要求

- Python 3.8+
- Linux / macOS
- 一个 Obsidian  vault 目录

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置（复制示例配置文件）
cp config.example.json config.json
# 编辑 config.json，填写 vault 路径和密码

# 3. 启动
./manage.sh start

# 4. 访问
open http://localhost:8765
```

---

## 配置说明（config.json）

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `vault` | Obsidian vault 根目录路径 | 必填 |
| `port` | 服务端口 | 8765 |
| `host` | 监听地址 | 0.0.0.0 |
| `username` | 登录账号 | admin |
| `password` | 登录密码 | 必填 |

---

## 服务管理

```bash
./manage.sh start     # 启动服务
./manage.sh stop      # 停止服务
./manage.sh restart   # 重启服务
./manage.sh status    # 查看状态
./manage.sh log       # 实时日志
./manage.sh install   # 安装为 systemd 开机自启服务
./manage.sh uninstall # 卸载 systemd 服务
```

---

## 一键安装（全新环境）

```bash
chmod +x install.sh
./install.sh
```

install.sh 会自动：
1. 检查 Python 版本
2. 安装 Python 依赖
3. 询问配置参数（vault 路径、端口、账号密码）
4. 生成 config.json
5. 询问是否安装为开机自启服务

---

## 常见问题

**端口已被占用**

```bash
# 查谁在用 8765 端口
fuser 8765/tcp
# 改 config.json 里的 port 字段，然后重启
./manage.sh restart
```

**vault 路径错误**

确认 config.json 里的 `vault` 字段指向正确的 Obsidian vault 目录，且当前用户有读权限。

**gunicorn 未安装**

```bash
pip install gunicorn
```

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/config` | 返回用户名 |
| GET | `/api/tree?path=` | 目录树 |
| GET | `/api/files` | 所有笔记文件 |
| GET | `/api/search?q=` | 全文搜索 |
| GET | `/api/read?path=` | 读取笔记 |
| GET | `/api/graph` | 知识图谱 |
| POST | `/api/write` | 保存笔记 |
| POST | `/api/create` | 新建笔记 |
| POST | `/api/delete` | 删除文件/目录 |
| POST | `/api/rename` | 重命名 |
| POST | `/api/mkdir` | 新建文件夹 |

---

## 开发

```bash
# 开发模式（Flask debug）
python3 app.py

# 生产模式（Gunicorn）
gunicorn -c gunicorn.conf.py app:app
```
