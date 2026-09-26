# 泰山识图 Ts-vision

[![license: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![version](https://img.shields.io/badge/version-1.0.2-green.svg)](https://github.com/iguanren/Ts-vision/releases)
[![DSH ≥ 0.1.7](https://img.shields.io/badge/DSH-≥0.1.7-orange.svg)](https://github.com/deepseek-ai/deepseek-harness)

<img src="https://community.codewave.163.com:443/upload/app/afaec238-82f5-4996-8fdd-0aae42f393de/DeepSeek_Harness_3K6U0FCguL_afaec238-82f5-4996-8fdd-0aae42f393de_efp9FOZ2_20260926181741629.png">

让 DSH（DeepSeek Harness）的纯文本模型也能看图：**智谱GLM免费视觉模型识图 + 当前模型推理**。

- 中文名:**泰山识图** （英文名：**Ts-vision**）
- 发行方式：**仅 GitHub 分发**(`https://github.com/iguanren/Ts-vision`)
- 适配 DSH Windows 桌面客户端**V0.1.7-rc.2**重启后永久生效

## ✨ 功能

- **免费识图**：`glm-4.6v-flash` + `glm-4.1v-thinking-flash` 完全免费,中文识别质量好,失败自动降级
- **原生面板**：DSH桌面端侧边「插件」面板 → `ts-vision` → 泰山识图配置表单(与官方插件卡片同机制)
- **一键启停**：bundle 卡片顶部「启用 ts-vision」开关(宿主统一管理)
- **API Key 直配**：卡片里粘贴智谱 Key 即保存,不回显明文、重启不丢
- **模型勾选 + 拖拽调序**：可用视觉模型列表勾选框控制启停,⠿ 拖动手柄调整调用顺序
- **凭据感知**：没配 Key 的模型默认关闭,配了才启用
- **自动补写 provider**：zhipu-glm 声明缺失时自动写入 profile 补丁(重启 DSH 后生效,无需手工配置模型)
- **注入防护**：视觉模型返回内容带围栏声明,防图片内指令注入
- **诊断工具**：`ts_vision_diag` 输出凭据/路由/包装全量状态,排障一键查

## 📦 安装(从 GitHub,桌面客户端)

1. 克隆或下载本仓库:

   ```powershell
   git clone https://github.com/iguanren/Ts-vision
   cd Ts-vision
   ```

2. 在仓库根目录运行一键安装脚本(PowerShell):

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File install-desktop.ps1
   ```

   脚本做三件事:复制插件到 `~/.dsh/profiles/desktop/node_modules/ts-vision`、更新 profile 的 `package.json`(dependencies + `dsh.profile.bundles`)、在 `cordis.patch.yml` 追加 `ts-vision` 条目(已存在则跳过)。重复运行即升级。

3. 重启 DSH 客户端生效。

> 手动安装见下文;不需要 dsh CLI,不写 npm。

### 手动安装(等效步骤)

1. 把 `lib/`、`locale/`、`package.json`、`cordis.patch.yml` 复制到 `C:\Users\<你>\.dsh\profiles\desktop\node_modules\ts-vision\`
2. 在 `C:\Users\<你>\.dsh\profiles\desktop\package.json` 中:
   - `dependencies` 增加 `"ts-vision": "file:C:\\<你克隆的仓库路径>"`
   - `dsh.profile.bundles` 数组中增加 `"ts-vision"`
3. 在 `C:\Users\<你>\.dsh\profiles\desktop\cordis.patch.yml` 追加:

   ```yaml
   - id: ts-vision
     disabled: false
   ```

4. 重启 DSH 客户端。

## 🔑 配置 API Key

打开「插件」面板 → `ts-vision`,在「智谱 API KEY」行粘贴 Key 点「保存」,立即生效,无需重启。

- 申请 Key：https://open.bigmodel.cn 注册登录并申请(免费档即可用 GLM 视觉模型)
- 或手动写入 `~/.dsh/.credentials.yaml` 的 `refs` 下 `ZHIPU_GLM_API_KEY`
- Key 只存于凭据文件,不进日志、面板永不回显

**首次安装提示**：若 zhipu-glm 提供方尚未注册,插件已自动把声明写入 profile 补丁,粘贴 Key 保存后**重启一次 DSH 客户端**,GLM 模型即出现在「可用视觉模型」列表。

## 🛠 使用

1. 发送带图片的消息,插件自动注入识图指令(纯文本模型也会收到「请调用识图工具」的提示)
2. 模型调用 `ts_vision_describe_image` 工具(参数 `image_ref` 传图片附件 ID)拿到图片描述,再基于描述回答你
3. 也可直接让模型「描述这张图」

模型管理:「插件」面板 → `ts-vision`:

- **启用 / 停用**：bundle 卡片顶部开关(整个插件的总闸)
- **可用视觉模型**：勾选框控制单个模型启停,⠿ 拖动调整调用顺序(前一个失败自动尝试下一个)
- **重新扫描**：改了模型配置或换了 Key 后点一下刷新列表

## ⚙️ 默认推荐模型(免费)

| 模型 | 上下文 | 最大输出 |
|---|---|---|
| glm-4.6v-flash | 128K | 32K |
| glm-4.1v-thinking-flash | 64K | 16K |

## 🔧 常见问题

- **插件页里没有泰山识图表单**：重启 DSH 客户端;确认 DSH 版本 ≥ 0.1.7(桌面客户端);仍无则让模型调 `ts_vision_diag`,或 F12 打开开发者工具在 Console 执行 `JSON.stringify({applied: window.__TSVISION_APPLIED__, slot: window.__TSVISION_SLOT__, err: window.__TSVISION_REG_ERROR__})` 查看卡片是否注册进「插件」页插槽
- **填了 Key 没模型**：表单点「重新扫描」;若 zhipu-glm 提供方尚未注册,重启一次 DSH
- **识图失败**：让模型调用 `ts_vision_diag` 输出全量状态,或看 DSH 终端 `[泰山识图]` 日志

## 🧹 卸载

在「插件」面板 → `ts-vision` 点「卸载」,或手动删除:

- `~/.dsh/profiles/desktop/node_modules/ts-vision`
- `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 与 `dsh.profile.bundles` 中的 `ts-vision`
- `~/.dsh/profiles/desktop/cordis.patch.yml` 的 `- id: ts-vision` 条目(及插件自动补写的 zhipu-glm 声明块,如不再需要)

凭据 `ZHIPU_GLM_API_KEY` 若不再需要,可从 `~/.dsh/.credentials.yaml` 手动删除。

## 📌 与旧版 taishan-vision 的差异

| 项 | taishan-vision v5.x | ts-vision v1.0 |
|---|---|---|
| npm 包名 / 插件 id | taishan-vision | ts-vision |
| 工具名 | taishan_describe_image / taishan_diag | ts_vision_describe_image / ts_vision_diag |
| HTTP 端点 | /api/taishan/* | /api/ts-vision/* |
| settings 命名空间 | taishan-vision | 不再注册(0.1.7 已移除该 API,卡片走 `plugins.bundle.config` 插槽) |
| 发行渠道 | GitHub + 本地 | 仅 GitHub(`iguanren/Ts-vision`) |
| 凭据变量 | ZHIPU_GLM_API_KEY | ZHIPU_GLM_API_KEY(不变,旧 Key 继续可用) |
| llm 包装键 | __taishan_* | __tsvision_*(避免幽灵闭包冲突) |

---

MIT License
