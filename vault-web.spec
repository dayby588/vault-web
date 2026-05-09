# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['gui_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('config.example.json', '.', 'DATA'),
        ('index.html', '.', 'DATA'),
        ('graph.html', '.', 'DATA'),
        ('js', 'js', 'DATA'),
        ('vendor', 'vendor', 'DATA'),
        ('app.py', '.', 'DATA'),
        ('gunicorn.conf.py', '.', 'DATA'),
        ('requirements.txt', '.', 'DATA'),
        ('manage.sh', '.', 'DATA'),
        ('install.sh', '.', 'DATA'),
        ('vault-web.service', '.', 'DATA'),
        ('README.md', '.', 'DATA'),
    ],
    hiddenimports=[
        'customtkinter',
        'darkdetect',
        'altgraph',
        'flask',
        'gunicorn',
        'werkzeug',
        'blinker',
        'itsdangerous',
    ],
    hookspath=[],
    hooksconfig={},
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='林途知识进化系统',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='林途知识进化系统',
)
