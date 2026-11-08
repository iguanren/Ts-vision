# 泰山识图 Ts-vision

[![license: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![DSH ≥ 0.1.7](https://img.shields.io/badge/DSH-≥0.1.7-orange.svg)](https://github.com/deepseek-ai/deepseek-harness)

让 DSH（DeepSeek Harness）的纯文本模型也能看图：**智谱 GLM 免费视觉模型识图 + 当前模型推理**。

- 适配 DSH Windows 桌面客户端 **V0.1.7-rc.2**，重启后永久生效
- 仅 GitHub 分发：`https://github.com/iguanren/Ts-vision`

## 功能

- **免费识图**：`glm-4.6v-flash` / `glm-4.1v-thinking-flash`，失败自动降级到下一个模型
- **原生面板**：左侧「插件」→ `ts-vision`，勾选模型、⠿ 拖动调序、一键重新扫描
- **填 Key 即用**：保存 Key 时自动补写 `zhipu-glm` 提供方声明，不用手改配置、不用重启
- **配置持久化**：勾选、顺序、超时/温度自动存盘，重启不丢
- **官方写入口**：provider 声明经宿主 `settings` 服务原子写入，插件不手写 YAML
- **注入防护**：视觉返回内容带围栏声明，防图片内指令注入
- **诊断工具**：`ts_vision_diag` 一次输出凭据/路由/包装全量状态

## 安装

```powershell
git clone https://github.com/iguanren/Ts-vision
cd Ts-vision
powershell -NoProfile -ExecutionPolicy Bypass -File install-desktop.ps1
```

脚本会把插件复制到 `~/.dsh/profiles/desktop/node_modules/ts-vision`，更新 profile 的 `package.json`，并在 `cordis.patch.yml` 追加 `ts-vision` 条目（已存在则跳过）。重复运行即升级。然后重启 DSH 客户端。

<details>
<summary>手动安装（等效步骤）</summary>

1. 把 `lib/`、`locale/`、`package.json`、`cordis.patch.yml`、`icon.svg` 复制到 `~/.dsh/profiles/desktop/node_modules/ts-vision/`
2. profile 的 `package.json`：`dependencies` 增加 `"ts-vision": "file:<仓库路径>"`，`dsh.profile.bundles` 增加 `"ts-vision"`
3. profile 的 `cordis.patch.yml` 追加：

   ```yaml
   - id: ts-vision
     disabled: false
   ```

4. 重启 DSH 客户端。

</details>

## 配置

**一步搞定**：「插件」→ `ts-vision` → 粘贴智谱 API Key → 保存。

保存时插件会通过宿主的 `settings` 服务（与「设置 → 模型」页面同一个原子写入口）自动补写 `zhipu-glm` 提供方声明，宿主热注册后立即生效——**不用手写 YAML，也不用重启**。Key 免费申请：https://open.bigmodel.cn

> 若当前宿主没有 `settings` 服务，面板会提示手动添加：接口 `openai-completions`、基址 `https://open.bigmodel.cn/api/paas/v4`、凭据变量 `ZHIPU_GLM_API_KEY`，模型 `glm-4.6v-flash` / `glm-4.1v-thinking-flash` 勾上图像输入，保存后点「重新扫描」。

## 使用

发送带图片的消息即可。插件会提示模型调用 `ts_vision_describe_image`（参数 `image_ref` 传附件 ID）拿到描述，再由当前模型基于描述回答。

| 模型 | 上下文 | 最大输出 |
|---|---|---|
| glm-4.6v-flash | 128K | 32K |
| glm-4.1v-thinking-flash | 64K | 16K |

## 常见问题

- **插件页没有泰山识图表单**：重启客户端；确认 DSH ≥ 0.1.7。仍无则让模型调 `ts_vision_diag`
- **填了 Key 没模型**：看终端 `[泰山识图]` 里有没有 `provider-ensure` 警告；若有，说明宿主未开放 `settings` 服务，按上文括注手动添加提供方，再点「重新扫描」
- **识图失败**：调 `ts_vision_diag` 看全量状态，或看终端 `[泰山识图]` 日志

## 卸载

删除 `~/.dsh/profiles/desktop/node_modules/ts-vision`，并从 profile 的 `package.json`（`dependencies`、`dsh.profile.bundles`）和 `cordis.patch.yml` 中移除 `ts-vision`。不再需要的 `ZHIPU_GLM_API_KEY` 可从 `~/.dsh/.credentials.yaml` 删除。

---

MIT License
