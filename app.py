#!/usr/bin/env python3
"""
Obsidian Vault Web API Server
版本：v3.0-Flask
基于 v2.21-stable 业务逻辑，框架迁移至 Flask + Gunicorn
"""

import shutil
import json
import re
import os
import socket
import mimetypes
import time
import logging
import threading
import sys
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request, abort

app = Flask(__name__, static_folder=None)

# ── 启动时从 config.json 读取配置 ──
BASE_DIR = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "config.json"

if not CONFIG_FILE.exists():
    print("❌ 未找到 config.json，请复制 config.example.json 并填写配置")
    sys.exit(1)

_config = json.loads(CONFIG_FILE.read_text())
VAULT = Path(_config["vault"])
PORT = _config.get("port", 8765)
USERNAME = _config["username"]
PASSWORD = _config["password"]
ENCODING = "utf-8"
REQUEST_TIMEOUT = 30
SCAN_TTL = 10.0

if not VAULT.exists():
    print(f"❌ vault 目录不存在: {VAULT}")
    sys.exit(1)

# ── 日志配置 ──
_log_file = BASE_DIR / "vault-web.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.FileHandler(_log_file, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ── scan_vault 缓存（TTL = SCAN_TTL 秒）──
_scan_lock = threading.Lock()
_scan_cache: list = None
_scan_cache_time: float = 0.0

# ── build_graph 缓存（按文件 mtime 失效）──
_graph_lock = threading.Lock()
_graph_cache: dict = None
_graph_mtime: float = 0.0

# ═══════════════════════════════════════════
# 业务逻辑（直接从 v2.21-stable 移植）
# ═══════════════════════════════════════════

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.168.1.1", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def _do_scan_vault():
    results = []
    skip = {".obsidian", ".trash", ".stfolder", ".stversions",
            ".claude", ".claudian", "node_modules", ".git"}
    for item in sorted(VAULT.rglob("*.md"), key=lambda x: x.name.lower()):
        if any(s in item.parts for s in skip):
            continue
        if any(p.startswith("_") for p in item.parts if p not in (item.name,)):
            continue
        if not item.name or item.name == ".md":
            continue
        rel = item.relative_to(VAULT)
        size = item.stat().st_size
        results.append({"path": str(rel), "name": item.name, "size": size})
    return results


def scan_vault():
    global _scan_cache, _scan_cache_time
    with _scan_lock:
        now = time.monotonic()
        if _scan_cache is not None and now - _scan_cache_time < SCAN_TTL:
            return _scan_cache
        _scan_cache = _do_scan_vault()
        _scan_cache_time = now
        return _scan_cache


def _vault_max_mtime() -> float:
    try:
        return max(
            (VAULT / item["path"]).stat().st_mtime
            for item in _do_scan_vault()
        )
    except ValueError:
        return 0.0


def build_tree(path=""):
    target = VAULT / path if path else VAULT
    items = []
    try:
        for entry in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            name = entry.name
            if name.startswith(".") or name.startswith("_"):
                continue
            rel = entry.relative_to(VAULT)
            if entry.is_dir():
                items.append({"name": name, "path": str(rel), "is_dir": True, "size": 0})
            elif entry.suffix == ".md":
                items.append({"name": name, "path": str(rel), "is_dir": False,
                               "size": entry.stat().st_size})
    except PermissionError:
        pass
    return {"ok": True, "items": items}


def search_notes(query):
    results = []
    if not query:
        return {"ok": True, "results": results}
    q = query.lower()
    for item in scan_vault():
        try:
            content = (VAULT / item["path"]).read_text(encoding=ENCODING)
            lines = content.split("\n")
            for i, line in enumerate(lines, 1):
                if q in line.lower():
                    snippet = line.strip()
                    if len(snippet) > 120:
                        snippet = snippet[:120] + "..."
                    results.append({
                        "path": item["path"],
                        "name": item["name"],
                        "line": i,
                        "snippet": snippet
                    })
                    break
        except Exception:
            continue
    return {"ok": True, "results": results[:20]}


def read_note(path):
    try:
        file_path = VAULT / path
        resolved = file_path.resolve().relative_to(VAULT)
        content = file_path.read_text(encoding=ENCODING)
        return {"ok": True, "content": content, "path": str(resolved)}
    except FileNotFoundError:
        return {"ok": False, "error": "文件不存在"}, 404
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


def write_note(path, content):
    try:
        file_path = VAULT / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding=ENCODING)
        global _scan_cache_time
        _scan_cache_time = 0.0
        return {"ok": True, "path": path}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


def create_note(name, folder):
    try:
        folder = folder.strip("/")
        file_name = name if name.endswith(".md") else name + ".md"
        file_path = (VAULT / folder / file_name) if folder else (VAULT / file_name)
        if file_path.exists():
            return {"ok": False, "error": "文件已存在"}, 400
        template = f"""---
type: personal-note
created: {os.popen('date +%Y-%m-%d').read().strip()}
tags: []
---

# {name}

"""
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(template, encoding=ENCODING)
        global _scan_cache_time
        _scan_cache_time = 0.0
        return {"ok": True, "path": str(file_path.relative_to(VAULT))}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


def rename_item(path, new_name):
    try:
        old = VAULT / path
        if not old.exists():
            return {"ok": False, "error": "文件不存在"}, 404
        new_name = Path(new_name).name
        if not new_name:
            return {"ok": False, "error": "名称不能为空"}, 400
        new = old.parent / new_name
        if new.exists():
            return {"ok": False, "error": "已存在同名文件/文件夹"}, 400
        old.rename(new)
        global _scan_cache_time
        _scan_cache_time = 0.0
        return {"ok": True, "old_path": path, "new_path": str(new.relative_to(VAULT))}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


def mkdir_item(path):
    try:
        dir_path = VAULT / path
        if dir_path.exists():
            return {"ok": False, "error": "目录已存在"}, 400
        dir_path.mkdir(parents=True, exist_ok=False)
        return {"ok": True, "path": path}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


def delete_item(path):
    try:
        target = VAULT / path
        if target.is_file():
            target.unlink()
        elif target.is_dir():
            shutil.rmtree(target)
        else:
            return {"ok": False, "error": "不存在"}, 404
        global _scan_cache_time
        _scan_cache_time = 0.0
        return {"ok": True, "path": path}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500


def _build_graph_uncached():
    path_to_node = {}
    name_to_node = {}
    nodes = []
    edges = []
    folder_colors = {
        "00-控制台":          "#e94560",
        "01-我与AI记忆":       "#f39c12",
        "02-收集箱":          "#27ae60",
        "10-自媒体与内容资产":   "#3498db",
        "20-素材库":          "#9b59b6",
        "30-学习与认知系统":    "#1abc9c",
        "40-战略与商业系统":    "#e67e22",
        "50-输出与复盘":       "#e74c3c",
        "60-Bases看板":       "#2ecc71",
        "70-AI协作":          "#00cec9",
        "80-系统维护与标准":    "#636e72",
        "90-归档":            "#b2bec3",
        "99-模板":            "#dfe6e9",
        "":                  "#7f8c8d",
    }
    default_color = "#95a5a6"

    for item in _do_scan_vault():
        node_id = item["path"]
        folder = item["path"].split("/")[0] if "/" in item["path"] else ""
        color = folder_colors.get(folder, default_color)
        name_key = item["name"][:-3] if item["name"].endswith(".md") else item["name"]
        node = {
            "id": node_id,
            "name": item["name"],
            "folder": folder,
            "path": item["path"],
            "size": item["size"],
            "inDegree": 0,
            "color": color
        }
        nodes.append(node)
        path_to_node[item["path"]] = node
        name_to_node[name_key] = node

    wiki_link = re.compile(r"\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]")
    for item in _do_scan_vault():
        try:
            content = (VAULT / item["path"]).read_text(encoding=ENCODING)
            for match in wiki_link.finditer(content):
                target = match.group(1).strip()
                if target.endswith(".md"):
                    target = target[:-3]
                target_path = target
                if target in name_to_node:
                    tn = name_to_node[target]
                    tn["inDegree"] = tn.get("inDegree", 0) + 1
                    edges.append({"source": item["path"], "target": tn["id"]})
                elif target_path in path_to_node:
                    tn = path_to_node[target_path]
                    tn["inDegree"] = tn.get("inDegree", 0) + 1
                    edges.append({"source": item["path"], "target": tn["id"]})
                elif (target_path + ".md") in path_to_node:
                    tn = path_to_node[target_path + ".md"]
                    tn["inDegree"] = tn.get("inDegree", 0) + 1
                    edges.append({"source": item["path"], "target": tn["id"]})
        except Exception:
            continue

    return {"ok": True, "nodes": nodes, "edges": edges,
            "stats": {"nodes": len(nodes), "edges": len(edges)}}


def build_graph():
    global _graph_cache, _graph_mtime
    with _graph_lock:
        current_mtime = _vault_max_mtime()
        if _graph_cache is not None and current_mtime <= _graph_mtime:
            logger.info("[graph] cache hit")
            return _graph_cache
        logger.info("[graph] rebuilding...")
        t0 = time.monotonic()
        result = _build_graph_uncached()
        elapsed = time.monotonic() - t0
        logger.info(f"[graph] done in {elapsed:.1f}s — "
                    f"{result['stats']['nodes']} nodes, {result['stats']['edges']} edges")
        _graph_cache = result
        _graph_mtime = current_mtime
        return result


# ═══════════════════════════════════════════
# Flask 路由
# ═══════════════════════════════════════════

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Vault-Token"
    return response


@app.route("/")
@app.route("/index.html")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/graph.html")
def graph():
    return send_from_directory(BASE_DIR, "graph.html")


@app.route("/js/<path:filename>")
def js_static(filename):
    return send_from_directory(BASE_DIR / "js", filename)


@app.route("/vendor/<path:filename>")
def vendor_static(filename):
    return send_from_directory(BASE_DIR / "vendor", filename)


@app.errorhandler(404)
def not_found(e):
    return jsonify({"ok": False, "error": "not found"}), 404


@app.errorhandler(500)
def server_error(e):
    logger.error(str(e), exc_info=True)
    return jsonify({"ok": False, "error": "server error"}), 500


# ── API 路由 ──

@app.route("/api/health")
def api_health():
    return jsonify({"ok": True, "version": "v3.0-Flask", "vault": str(VAULT)})


@app.route("/api/config")
def api_config():
    return jsonify({"username": USERNAME})


@app.route("/api/tree")
def api_tree():
    try:
        path = request.args.get("path", "")
        return jsonify(build_tree(path))
    except Exception as e:
        logger.error(f"[API] /api/tree — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/files")
def api_files():
    try:
        return jsonify({"ok": True, "files": scan_vault()})
    except Exception as e:
        logger.error(f"[API] /api/files — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/search")
def api_search():
    try:
        q = request.args.get("q", "")
        return jsonify(search_notes(q))
    except Exception as e:
        logger.error(f"[API] /api/search — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/read")
def api_read():
    try:
        path = request.args.get("path", "")
        result = read_note(path)
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        return jsonify(result)
    except Exception as e:
        logger.error(f"[API] /api/read — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/graph")
def api_graph():
    try:
        return jsonify(build_graph())
    except Exception as e:
        logger.error(f"[API] /api/graph — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/write", methods=["POST"])
def api_write():
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = write_note(data.get("path", ""), data.get("content", ""))
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        return jsonify(result)
    except Exception as e:
        logger.error(f"[API] /api/write — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/create", methods=["POST"])
def api_create():
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = create_note(data.get("name", ""), data.get("folder", ""))
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        return jsonify(result)
    except Exception as e:
        logger.error(f"[API] /api/create — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/delete", methods=["POST"])
def api_delete():
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = delete_item(data.get("path", ""))
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        return jsonify(result)
    except Exception as e:
        logger.error(f"[API] /api/delete — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/rename", methods=["POST"])
def api_rename():
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = rename_item(data.get("path", ""), data.get("new_name", ""))
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        return jsonify(result)
    except Exception as e:
        logger.error(f"[API] /api/rename — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/mkdir", methods=["POST"])
def api_mkdir():
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = mkdir_item(data.get("path", ""))
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        return jsonify(result)
    except Exception as e:
        logger.error(f"[API] /api/mkdir — {e}", exc_info=True)
        return jsonify({"ok": False, "error": str(e)}), 500


if __name__ == "__main__":
    lan_ip = get_lan_ip()
    logger.info("=" * 50)
    logger.info("🏠  Obsidian Vault Web  v3.0-Flask")
    logger.info(f"    本机:   http://localhost:{PORT}")
    logger.info(f"    局域网: http://{lan_ip}:{PORT}")
    logger.info(f"    Vault:  {VAULT}")
    logger.info(f"    日志:   {_log_file}")
    logger.info("=" * 50)
    app.run(host="0.0.0.0", port=PORT, debug=False)


# ── 日志查看页面 ──────────────────────────────────
@app.route("/logs.html")
def logs_page():
    return send_from_directory(str(BASE_DIR), "logs.html")


@app.route("/api/logs")
def api_logs():
    """返回 vault-web.log 最后 N 行"""
    try:
        if _log_file.exists():
            lines = _log_file.read_text(encoding="utf-8").splitlines()
            n = request.args.get("n", 200, type=int)
            return jsonify({"ok": True, "lines": lines[-n:], "total": len(lines)})
        return jsonify({"ok": False, "lines": [], "total": 0, "error": "日志文件不存在"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/logs/clear", methods=["POST"])
def api_logs_clear():
    """清空日志文件"""
    try:
        with open(_log_file, "w", encoding="utf-8") as f:
            f.write("")
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
