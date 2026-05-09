// globals.js — 全局共享状态（必须在所有模块之前加载）
// 任何模块想要访问这些变量，必须先加载本文件

let editor = null;        // CodeMirror 实例
let currentFile = null;   // 当前打开的文件路径
let isDirty = false;       // 是否有未保存改动
let currentView = 'split'; // 当前视图: edit | preview | split | vertical
let selectedFolder = '';  // 新建笔记时默认目录
let currentTreePath = ''; // 文件树当前展开的目录路径
let autoSaveEnabled = false; // 自动保存开关
let autoSaveDelay = 3;      // 自动保存延迟（秒）
let autoSaveTimer = null;
let ctxTargetPath = '';
let ctxTargetIsDir = false;
let syncScroll = false;
let _scrollLock = false;
let searchScope = 'all'; // 'all' | 'dir'
let searchTimer = null;
