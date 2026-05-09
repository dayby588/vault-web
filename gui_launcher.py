#!/usr/bin/env python3
"""
知识进化系统 — 桌面启动器
版本: v1.0
品牌: 知识进化系统 | 公众号：林途Link

打包说明（Windows）：
1. 确保系统已安装 Python 3.8+ 并在 PATH 中
2. 创建虚拟环境 venv：python -m venv venv
3. 激活 venv：venv\Scripts\activate
4. 安装依赖：pip install customtkinter pyinstaller flask gunicorn
5. 执行打包：pyinstaller vault-web.spec --noconfirm
6. 输出在 dist\林途知识进化系统\ 目录
7. 把整个输出目录分享出去，双击 "林途知识进化系统.exe" 即可
"""

import sys
import os
import json
import threading
import subprocess
import webbrowser
import time
from pathlib import Path
from datetime import datetime

# PyInstaller 打包后路径兼容
if getattr(sys, 'frozen', False):
    _MEIPASS = Path(sys._MEIPASS)
    APP_DIR = _MEIPASS.parent   # exe 同级的 vault-web 目录
else:
    APP_DIR = Path(__file__).parent

VAULT_WEB_DIR = APP_DIR
CONFIG_FILE = APP_DIR / "config.json"

try:
    import customtkinter as ctk
except ImportError:
    print("缺少 customtkinter，请运行: pip install customtkinter")
    sys.exit(1)

# ── 常量 ──
APP_NAME = "知识进化系统"
BRAND_SUB = "公众号：林途Link"
VERSION = "v1.0"
LICENSE_KEY = "lintu"
SERVICE_NAME = "vault-web"

# ── 外观配置 ──
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

ACCENT = "#00b4d8"
SUCCESS = "#2ecc71"
WARNING = "#f39c12"
DANGER = "#e74c3c"
BG_MAIN = "#0b0e14"
BG_CARD = "#151a23"
BG_ENTRY = "#1e2430"
TEXT_MAIN = "#e0e6ed"
TEXT_SUB = "#8892a4"
BORDER = "#2a3444"


# ═══════════════════════════════════════════
# License Window
# ═══════════════════════════════════════════

class LicenseWindow(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(f"{APP_NAME} — {VERSION}")
        self.geometry("480x380")
        self.resizable(False, False)
        self.center_window()
        self._key_valid = False

        # 背景
        self.configure(fg_color=BG_MAIN)

        # Logo 区
        logo_frame = ctk.CTkFrame(self, fg_color="transparent")
        logo_frame.pack(fill="x", pady=(40, 10))

        icon_label = ctk.CTkLabel(
            logo_frame, text="🧠", font=ctk.CTkFont(size=56),
            text_color=ACCENT
        )
        icon_label.pack()

        title_label = ctk.CTkLabel(
            logo_frame, text=APP_NAME,
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=TEXT_MAIN
        )
        title_label.pack(pady=(8, 4))

        brand_label = ctk.CTkLabel(
            logo_frame, text=BRAND_SUB,
            font=ctk.CTkFont(size=13),
            text_color=ACCENT
        )
        brand_label.pack()

        version_label = ctk.CTkLabel(
            logo_frame, text=f"启动器 {VERSION}",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SUB
        )
        version_label.pack(pady=(2, 0))

        # 分隔线
        sep = ctk.CTkFrame(self, height=1, fg_color=BORDER)
        sep.pack(fill="x", padx=40, pady=(10, 30))

        # 密令输入区
        input_frame = ctk.CTkFrame(self, fg_color="transparent")
        input_frame.pack(fill="x", padx=60, pady=10)

        input_label = ctk.CTkLabel(
            input_frame, text="请输入访问密令",
            font=ctk.CTkFont(size=13),
            text_color=TEXT_SUB
        )
        input_label.pack(pady=(0, 10))

        self.key_entry = ctk.CTkEntry(
            input_frame, placeholder_text="输入密令，回车确认",
            font=ctk.CTkFont(size=15),
            justify="center",
            fg_color=BG_ENTRY,
            border_color=BORDER,
            text_color=TEXT_MAIN,
            corner_radius=8
        )
        self.key_entry.pack(fill="x", ipady=10)
        self.key_entry.bind("<Return>", self._check_key)

        self.feedback_label = ctk.CTkLabel(
            input_frame, text="",
            font=ctk.CTkFont(size=12),
            text_color=DANGER
        )
        self.feedback_label.pack(pady=(8, 0))

        btn = ctk.CTkButton(
            input_frame, text="进入系统 →",
            command=self._check_key,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color=ACCENT, hover_color="#0096c7",
            text_color="white", corner_radius=8,
            height=40
        )
        btn.pack(fill="x", pady=(10, 0))

        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self._after_id = None

    def center_window(self):
        self.update_idletasks()
        w, h = self.winfo_width(), self.winfo_height()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.geometry(f"{w}x{h}+{x}+{y}")

    def _check_key(self, event=None):
        key = self.key_entry.get().strip()
        if not key:
            self.feedback_label.configure(text="请输入密令", text_color=DANGER)
            return
        if key == LICENSE_KEY:
            self.feedback_label.configure(text="✅ 密令正确，正在进入...", text_color=SUCCESS)
            self._key_valid = True
            self._after_id = self.after(800, self._open_main)
        else:
            self.feedback_label.configure(text="❌ 密令错误，请重试", text_color=DANGER)
            self.key_entry.delete(0, "end")

    def _open_main(self):
        self.destroy()
        app = MainApp()
        app.mainloop()

    def _on_close(self):
        if self._after_id:
            self.after_cancel(self._after_id)
        self.destroy()
        sys.exit(0)


# ═══════════════════════════════════════════
# Main Application
# ═══════════════════════════════════════════

class MainApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(f"{APP_NAME} — 控制台")
        self.geometry("900x640")
        self.resizable(True, True)
        self._process = None
        self._monitor_running = False

        self.configure(fg_color=BG_MAIN)

        # 顶部 Banner
        self._build_header()

        # 主体：左侧控制 + 右侧配置/日志
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        body.grid_columnconfigure(0, weight=1, minsize=340)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        left = ctk.CTkFrame(body, fg_color=BG_CARD, corner_radius=12)
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        right = ctk.CTkFrame(body, fg_color=BG_CARD, corner_radius=12)
        right.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        self._build_control_panel(left)
        self._build_config_panel(right)
        self._build_log_panel(right)

        # 底部状态栏
        self._build_footer()

        # 启动时检测服务状态
        self.after(300, self._check_service_status)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── Header ──
    def _build_header(self):
        header = ctk.CTkFrame(self, height=72, fg_color=BG_CARD, corner_radius=0)
        header.pack(fill="x", padx=0, pady=0)
        header.pack_propagate(False)

        left_box = ctk.CTkFrame(header, fg_color="transparent")
        left_box.pack(side="left", padx=20, pady=0)
        left_box.grid_rowconfigure(0, weight=1)

        logo = ctk.CTkLabel(
            left_box, text="🧠",
            font=ctk.CTkFont(size=32),
            text_color=ACCENT
        )
        logo.grid(row=0, column=0, rowspan=2, padx=(0, 12), pady=8)

        title = ctk.CTkLabel(
            left_box, text=APP_NAME,
            font=ctk.CTkFont(size=17, weight="bold"),
            text_color=TEXT_MAIN, anchor="w"
        )
        title.grid(row=0, column=1, sticky="w", pady=(14, 0))

        sub = ctk.CTkLabel(
            left_box, text=BRAND_SUB,
            font=ctk.CTkFont(size=11),
            text_color=ACCENT, anchor="w"
        )
        sub.grid(row=1, column=1, sticky="w", pady=(0, 8))

        right_box = ctk.CTkFrame(header, fg_color="transparent")
        right_box.pack(side="right", padx=20, pady=0)
        right_box.grid_rowconfigure(0, weight=1)

        self.status_indicator = ctk.CTkLabel(
            right_box, text="◉ 检测中",
            font=ctk.CTkFont(size=13),
            text_color=TEXT_SUB
        )
        self.status_indicator.grid(row=0, column=0, sticky="e", pady=12)

        sep = ctk.CTkFrame(self, height=1, fg_color=BORDER)
        sep.pack(fill="x")

    # ── 控制面板 ──
    def _build_control_panel(self, parent):
        title = ctk.CTkLabel(
            parent, text="服务控制",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=TEXT_MAIN
        )
        title.pack(anchor="w", padx=20, pady=(20, 4))

        desc = ctk.CTkLabel(
            parent, text="管理 Vault Web 服务运行状态",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SUB
        )
        desc.pack(anchor="w", padx=20, pady=(0, 16))

        btn_frame = ctk.CTkFrame(parent, fg_color="transparent")
        btn_frame.pack(fill="x", padx=20, pady=4)

        self.btn_start = ctk.CTkButton(
            btn_frame, text="▶ 启动服务",
            command=self._do_start,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=SUCCESS, hover_color="#27ae60",
            text_color="white", corner_radius=8,
            height=40
        )
        self.btn_start.pack(fill="x", pady=4)

        self.btn_stop = ctk.CTkButton(
            btn_frame, text="■ 停止服务",
            command=self._do_stop,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=DANGER, hover_color="#c0392b",
            text_color="white", corner_radius=8,
            height=40,
            state="disabled"
        )
        self.btn_stop.pack(fill="x", pady=4)

        restart_frame = ctk.CTkFrame(parent, fg_color="transparent")
        restart_frame.pack(fill="x", padx=20, pady=4)
        self.btn_restart = ctk.CTkButton(
            restart_frame, text="↻ 重启服务",
            command=self._do_restart,
            font=ctk.CTkFont(size=13),
            fg_color=BG_ENTRY, hover_color=BORDER,
            text_color=TEXT_MAIN, corner_radius=8,
            height=36,
            state="disabled"
        )
        self.btn_restart.pack(fill="x")

        # 分隔
        sep = ctk.CTkFrame(parent, height=1, fg_color=BORDER)
        sep.pack(fill="x", padx=16, pady=14)

        # 访问地址
        addr_label = ctk.CTkLabel(
            parent, text="访问地址",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=TEXT_MAIN
        )
        addr_label.pack(anchor="w", padx=20, pady=(0, 8))

        try:
            cfg = json.loads(CONFIG_FILE.read_text())
            port = cfg.get("port", 8765)
        except Exception:
            port = 8765

        self.local_url = ctk.CTkLabel(
            parent, text=f"http://localhost:{port}",
            font=ctk.CTkFont(size=13, family="Consolas"),
            text_color=ACCENT, cursor="hand2"
        )
        self.local_url.pack(anchor="w", padx=20)
        self.local_url.bind("<Button-1>", lambda e: webbrowser.open(f"http://localhost:{port}"))

        self.lan_url = ctk.CTkLabel(
            parent, text="获取局域网地址中...",
            font=ctk.CTkFont(size=12, family="Consolas"),
            text_color=TEXT_SUB
        )
        self.lan_url.pack(anchor="w", padx=20, pady=(4, 0))
        self._fetch_lan_ip(port)

        open_btn = ctk.CTkButton(
            parent, text="🌐 打开浏览器",
            command=lambda: webbrowser.open(f"http://localhost:{port}"),
            font=ctk.CTkFont(size=13),
            fg_color=ACCENT, hover_color="#0096c7",
            text_color="white", corner_radius=8,
            height=36
        )
        open_btn.pack(fill="x", padx=20, pady=(10, 0))

        # 图谱链接
        graph_btn = ctk.CTkButton(
            parent, text="🕸️ 知识图谱",
            command=lambda: webbrowser.open(f"http://localhost:{port}/graph.html"),
            font=ctk.CTkFont(size=13),
            fg_color=BG_ENTRY, hover_color=BORDER,
            text_color=TEXT_MAIN, corner_radius=8,
            height=36
        )
        graph_btn.pack(fill="x", padx=20, pady=(6, 20))

    # ── 配置面板 ──
    def _build_config_panel(self, parent):
        title = ctk.CTkLabel(
            parent, text="配置管理",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=TEXT_MAIN
        )
        title.pack(anchor="w", padx=20, pady=(20, 4))

        desc = ctk.CTkLabel(
            parent, text="修改后自动保存，重启服务生效",
            font=ctk.CTkFont(size=11),
            text_color=TEXT_SUB
        )
        desc.pack(anchor="w", padx=20, pady=(0, 14))

        fields = [
            ("vault", "Vault 路径", True),
            ("port", "端口", False),
            ("host", "监听地址", False),
            ("username", "账号", False),
            ("password", "密码", False),
        ]

        self.config_entries = {}
        cfg = self._load_config()

        for key, label, is_path in fields:
            row = ctk.CTkFrame(parent, fg_color="transparent")
            row.pack(fill="x", padx=20, pady=3)

            lbl = ctk.CTkLabel(
                row, text=label, width=80, anchor="w",
                font=ctk.CTkFont(size=12),
                text_color=TEXT_SUB
            )
            lbl.pack(side="left", padx=(0, 8))

            entry = ctk.CTkEntry(
                row,
                placeholder_text=f"输入 {label}",
                font=ctk.CTkFont(size=12),
                fg_color=BG_ENTRY,
                border_color=BORDER,
                text_color=TEXT_MAIN,
                corner_radius=6
            )
            entry.insert(0, str(cfg.get(key, "")))
            entry.pack(side="left", fill="x", expand=True)
            entry.bind("<FocusOut>", lambda e, k=key, ent=entry: self._save_config_on_change(k, ent))
            self.config_entries[key] = entry

        # 保存按钮
        save_btn = ctk.CTkButton(
            parent, text="💾 保存配置",
            command=self._save_all_config,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT, hover_color="#0096c7",
            text_color="white", corner_radius=8,
            height=38
        )
        save_btn.pack(fill="x", padx=20, pady=(10, 4))

        note = ctk.CTkLabel(
            parent, text="提示：修改配置后需重启服务生效",
            font=ctk.CTkFont(size=10),
            text_color=TEXT_SUB
        )
        note.pack(pady=(0, 10))

        # 分隔
        sep = ctk.CTkFrame(parent, height=1, fg_color=BORDER)
        sep.pack(fill="x", padx=16, pady=10)

        # 启动时自动运行
        row2 = ctk.CTkFrame(parent, fg_color="transparent")
        row2.pack(fill="x", padx=20, pady=2)

        auto_label = ctk.CTkLabel(
            row2, text="启动时自动运行服务",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_MAIN
        )
        auto_label.pack(side="left")

        self.auto_var = ctk.BooleanVar(value=False)
        auto_switch = ctk.CTkSwitch(
            row2, text="",
            variable=self.auto_var,
            onvalue=True, offvalue=False,
            switch_width=44, switch_height=22,
            progress_color=ACCENT,
            button_color=BORDER,
            button_hover_color="#3a4a5c"
        )
        auto_switch.pack(side="right")

    # ── 日志面板 ──
    def _build_log_panel(self, parent):
        title = ctk.CTkLabel(
            parent, text="实时日志",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color=TEXT_MAIN
        )
        title.pack(anchor="w", padx=20, pady=(14, 4))

        log_frame = ctk.CTkFrame(parent, fg_color="#0a0e13", corner_radius=8)
        log_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        self.log_text = ctk.CTkTextbox(
            log_frame, fg_color="#0a0e13",
            border_color=BORDER,
            text_color="#7ee8c7",
            font=ctk.CTkFont(size=11, family="Consolas"),
            state="disabled", wrap="none"
        )
        self.log_text.pack(fill="both", expand=True, padx=6, pady=6)

        btn_row = ctk.CTkFrame(parent, fg_color="transparent")
        btn_row.pack(fill="x", padx=20, pady=(0, 14))

        clear_btn = ctk.CTkButton(
            btn_row, text="清空日志",
            command=self._clear_log,
            font=ctk.CTkFont(size=12),
            fg_color=BG_ENTRY, hover_color=BORDER,
            text_color=TEXT_SUB, corner_radius=6,
            width=100, height=30
        )
        clear_btn.pack(side="left")

        refresh_btn = ctk.CTkButton(
            btn_row, text="刷新状态",
            command=self._check_service_status,
            font=ctk.CTkFont(size=12),
            fg_color=BG_ENTRY, hover_color=BORDER,
            text_color=TEXT_SUB, corner_radius=6,
            width=100, height=30
        )
        refresh_btn.pack(side="right")

    # ── Footer ──
    def _build_footer(self):
        footer = ctk.CTkFrame(self, height=32, fg_color=BG_CARD, corner_radius=0)
        footer.pack(fill="x", padx=0, pady=0)
        footer.pack_propagate(False)

        self.footer_label = ctk.CTkLabel(
            footer, text=f"{APP_NAME} {VERSION} — {BRAND_SUB}",
            font=ctk.CTkFont(size=10),
            text_color=TEXT_SUB
        )
        self.footer_label.pack(side="left", padx=16, pady=6)

    # ── 工具方法 ──
    def _load_config(self):
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            return {"vault": "", "port": 8765, "host": "0.0.0.0", "username": "admin", "password": ""}

    def _save_config_on_change(self, key, entry):
        try:
            cfg = self._load_config()
            val = entry.get().strip()
            if key == "port":
                val = int(val)
            cfg[key] = val
            CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
        except Exception as e:
            self._append_log(f"[配置] 保存失败: {e}")

    def _save_all_config(self):
        try:
            cfg = {}
            for key, entry in self.config_entries.items():
                val = entry.get().strip()
                if key == "port":
                    val = int(val)
                cfg[key] = val
            CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
            self._append_log("✅ 配置已保存，重启服务生效")
        except Exception as e:
            self._append_log(f"❌ 保存失败: {e}")

    def _fetch_lan_ip(self, port):
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("192.168.1.1", 80))
            ip = s.getsockname()[0]
            s.close()
            self.lan_url.configure(text=f"http://{ip}:{port}")
        except Exception:
            self.lan_url.configure(text="无法获取局域网IP")

    def _check_service_status(self):
        self._append_log("[状态检查]")
        pid_file = VAULT_WEB_DIR / "vault-web.pid"
        if pid_file.exists():
            pid = pid_file.read_text().strip()
            try:
                is_windows = sys.platform.startswith("win")
                if is_windows:
                    subprocess.run(["tasklist", "/FI", f"PID eq {pid}"],
                                 capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
                    result = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"],
                                          capture_output=True, text=True)
                    if str(pid) in result.stdout:
                        self._set_running_state(True)
                        self._append_log(f"✅ 服务运行中 (PID {pid})")
                        return
                else:
                    os.kill(int(pid), 0)
                    self._set_running_state(True)
                    self._append_log(f"✅ 服务运行中 (PID {pid})")
                    return
            except (ProcessLookupError, ValueError, Exception):
                pass
        self._set_running_state(False)
        self._append_log("🔴 服务未运行")

    def _set_running_state(self, running: bool):
        if running:
            self.status_indicator.configure(text="◉ 运行中", text_color=SUCCESS)
            self.btn_start.configure(state="disabled")
            self.btn_stop.configure(state="normal")
            self.btn_restart.configure(state="normal")
        else:
            self.status_indicator.configure(text="◯ 已停止", text_color=DANGER)
            self.btn_start.configure(state="normal")
            self.btn_stop.configure(state="disabled")
            self.btn_restart.configure(state="disabled")

    def _do_start(self):
        self._append_log("▶ 启动服务...")
        self.btn_start.configure(state="disabled", text="启动中...")
        threading.Thread(target=self._start_service, daemon=True).start()

    def _do_stop(self):
        self._append_log("■ 停止服务...")
        self.btn_stop.configure(state="disabled", text="停止中...")
        threading.Thread(target=self._stop_service, daemon=True).start()

    def _do_restart(self):
        self._append_log("↻ 重启服务...")
        self.btn_restart.configure(state="disabled", text="重启中...")
        threading.Thread(target=self._restart_service, daemon=True).start()

    def _start_service(self):
        pid_file = VAULT_WEB_DIR / "vault-web.pid"
        log_file = VAULT_WEB_DIR / "vault-web.log"
        # Windows: 用 py 直接跑 app.py；Linux: 用 gunicorn
        is_windows = sys.platform.startswith("win")
        if is_windows:
            cmd = ["py", "app.py"]
        else:
            cmd = ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
        try:
            with open(log_file, "a") as f:
                f.write(f"\n{'='*50}\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Launched by GUI\n")
            kwargs = dict(
                cmd, cwd=str(VAULT_WEB_DIR),
                stdout=open(log_file, "a"),
                stderr=subprocess.STDOUT
            )
            if is_windows:
                kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
            proc = subprocess.Popen(**kwargs)
            pid_file.write_text(str(proc.pid))
            import time; time.sleep(2)
            self._check_service_status()
            self._append_log(f"✅ 服务已启动 (PID {proc.pid})")
        except FileNotFoundError:
            self._append_log("❌ 启动命令未找到，请确保 Python 已安装")
            self._set_running_state(False)
        except Exception as e:
            self._append_log(f"❌ 启动失败: {e}")
            self._set_running_state(False)

    def _stop_service(self):
        pid_file = VAULT_WEB_DIR / "vault-web.pid"
        try:
            pid = int(pid_file.read_text().strip())
            is_windows = sys.platform.startswith("win")
            if is_windows:
                subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                              capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
            else:
                os.kill(pid, 15)
                time.sleep(1)
                try:
                    os.kill(pid, 0)
                    os.kill(pid, 9)
                except ProcessLookupError:
                    pass
            pid_file.unlink(missing_ok=True)
            self._append_log("🛑 服务已停止")
        except Exception as e:
            self._append_log(f"停止: {e}")
        finally:
            self._set_running_state(False)

    def _restart_service(self):
        self._stop_service()
        time.sleep(1.5)
        self._start_service()

    def _append_log(self, msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        self.log_text.configure(state="normal")
        self.log_text.insert("end", line + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _clear_log(self):
        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", "end")
        self.log_text.configure(state="disabled")

    def _on_close(self):
        self.destroy()
        sys.exit(0)


# ═══════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════

if __name__ == "__main__":
    app = LicenseWindow()
    app.mainloop()
