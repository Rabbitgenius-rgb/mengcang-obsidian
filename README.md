# 梦藏：独立桌面源码试点

本分支把当前独立 Electron 桌面端、共享渲染器和对应测试纳入版本控制，并建立可复现的构建与回归入口。桌面源码版本由根 `package.json` 提供。

根目录原有 `main.js`、`manifest.json`、`versions.json`、`styles.css` 和 `assets/` 是历史 Obsidian 插件发布文件，本次保持原提交内容；它们不表示当前桌面软件的版本或发布状态。未把旧插件的书籍策展页面、图像资源和专项功能测试纳入本次桌面试点。

## 范围

- Electron 主进程及本机资料接口：`desktop/`。
- 共享的资料格式与写入校验：`src/desktop-connector/`。
- 桌面渲染器与浏览器演示：`prototypes/desktop-workbench/`。目录名保留为历史路径，桌面构建使用其中的真实源码。
- 桌面及共享协议测试：`tests/`；渲染器与 Sites 适配测试：`prototypes/desktop-workbench/tests/`。
- 构建脚本：`scripts/`；自动检查：`.github/workflows/desktop-ci.yml`。

没有纳入个人资料库、备份、缓存、日志、录音、真实 AI 密钥、已安装应用、预览参考板或大转录模型。测试资料为合成夹具。原生 OCR 测试使用仓库内可复现生成的文字图。

## 从干净检出验证

当前原生组件面向 **macOS Apple Silicon（arm64）**，需要 Xcode Command Line Tools/macOS SDK、Swift 和 Node.js 24。原生回归还要求系统实际提供中文及英文句向量模型。`macos-15` 和 `macos-26` runner 的中文能力均不可用，测试正确失败，相关断言保留。

试点 CI 使用 `macos-26` arm64 镜像。构建后通过 Apple 公开的 `NLTagger.requestAssets` 请求可选中文语言资源，再在新进程中验证真实的中英文句向量并记录模型版本、维度。该准备步骤可能从 Apple 下载系统模型，仅在 CI 或开发者明确执行时运行，应用不会自动调用它。Tagger 下载成功不等于句向量可用；真实向量检查及原完整回归必须同时通过，模型缺失仍然失败。该选择不构成最低系统版本或所有 macOS 环境兼容性承诺，具体能力以运行时检测为准。这里只构建资源并测试，不安装或启动应用。

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm ci --ignore-scripts --no-audit --no-fund --prefix prototypes/desktop-workbench
npm run check
npm run desktop:build
swift scripts/prepare-native-language-assets.swift
node scripts/check-native-capabilities.mjs
npm run test:desktop
```

`desktop:build` 生成附件校验模块、完整渲染器/Sites 产物和原生 helper，组装 `desktop/build/app/` 后验证输出依赖、入口资源及许可证。`test:desktop` 执行仓库中全部根测试和工作台测试，没有按失败结果跳过测试。需要先构建，因为 Sites 和原生能力测试使用真实构建输出。

`npm test` 是同一回归入口。`npm run build` 是桌面构建别名。单独运行 `test:root` 或工作台测试仅验证相应部分。历史本机工作区还有未导入的旧插件测试；本流程不声称覆盖这些功能。

## 资料与 AI

未配置资料库时，不应猜测或读取开发者电脑上的目录；本机工作区仍可使用。资料库路径需明确配置，现有资料保持只读，写入只在用户提交相应操作后进行。开发调试时可在生成的 `desktop/build/app/candidate-config.json` 中明确设置 `vaultPath` 为合成测试资料目录的绝对路径；不配置时使用空本地工作区。该文件不入 Git，每次重新构建会清除；不要把真实目录写入源码。

AI 默认关闭，实际生成或转录须逐次确认；自动测试使用模拟服务或合成资料，不执行真实收费请求。密钥只由应用本机加密设置管理，不写入源码、日志或备份。

## 构建证据的边界

CI 检查当前源码的资源构建与回归。它不替代原生 UI、真实文件保存及重启读回检查，也不证明完整安装包或正式发布已验收。涉及这些行为的改动需使用隔离资料库补充对应验证。

`desktop:package` 仍需要另外准备经核对的 Whisper/FFmpeg 运行时和模型；这些大文件不随 Git 分发。本次 CI 不打包、签名、安装或分发应用。工作台的 Sites 适配仅供构建和测试，不会自动发布网站。

## PR 流程

从明确任务和验收条件开始，在独立分支修改，先运行相关检查，再提交 Draft PR。独立审查需核对具体 diff、调用方、失败路径及测试判别力；修复后按当前提交重新验证。检查通过只表示相应证据成立，正式审批、合并与发布分别处理。工作流已配置不等于主分支已经强制执行合并规则。
