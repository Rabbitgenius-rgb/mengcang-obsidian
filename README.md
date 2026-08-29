# 梦藏

梦藏（Mengcang）是一款运行在 Obsidian 中的本地创作素材档案插件。它直接读取 Vault 中已有的 Markdown，把图案、图书、文本灵感与网页剪报整理为可浏览、可检索、可回到原始资料的私人数字藏馆。

当前版本：`0.1.14`

## 主要能力

- 梦藏总览：统一浏览四类本地素材，并按标题、标签、正文或来源搜索。
- 图案收集：使用“专题图鉴 → 二级样架 → 具体作品”的层级组织视觉资料。
- 图书书架：按阅读状态筛选书籍，通过悬浮卡查看简介、进度、笔记入口与本地 PDF。
- 文本档案：区分待整理灵感与主题目录，并支持按项目筛选完整灵感集合。
- 网页档案：保存网页预览、来源与设计观察。
- Canvas 联动：可将真实文本卡片拖入 Obsidian Canvas，并优先显示正文段落。

## 设计原则

- 本地优先：资料保留在用户自己的 Obsidian Vault 中。
- Markdown 为唯一真源：插件不建立第二套封闭数据库。
- 当前界面只读：浏览与重组不会静默修改原始笔记。
- 来源可追溯：素材卡片可以返回对应 Markdown、网页或本地文件。

## 当前状态

这是面向桌面端体验开发和验证的早期版本。快速捕捉、AI 整理、网页自动抓取、Canvas 连线同步到关系图谱等能力尚未实现。

插件当前使用以下 Vault 目录约定：

```text
01_sources/books/
01_sources/cards/images/patterns/
01_sources/cards/text/
01_sources/cards/web/
```

相关 Markdown 通过 Frontmatter 中的 `type`、`status`、`title`、`cover`、`captured_at` 等字段被识别。图书记录使用 `type: book`，其他素材使用 `type: material`。

## 手动安装

1. 在 Vault 的 `.obsidian/plugins/` 下建立 `mengcang-dashboard` 文件夹。
2. 将仓库中的 `main.js`、`manifest.json`、`styles.css` 和 `assets/` 复制到该文件夹。
3. 在 Obsidian 的“第三方插件”设置中启用“梦藏 Dashboard”。
4. 点击左侧功能区的档案图标，或在命令面板运行“打开梦藏总览”。

## 文件说明

```text
main.js       插件逻辑
styles.css    梦藏界面与交互样式
manifest.json Obsidian 插件清单
assets/       品牌标记与界面纹理
```

## 说明

仓库目前未附加开源许可证。未经明确许可，不视为授予复制、修改或再发布权利。
