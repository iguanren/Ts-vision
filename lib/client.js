/**
 * Ts-vision 泰山识图 · 静态 Client 半区(浏览器,桌面客户端版)
 * ============================================================
 * 标准 dsh 客户端模块格式:window.__ModuleLoader__.load({ id, factory })。
 * factory 内 require('react') 等,exports.apply/inject 提供插件主体。
 * 通过 package.json 的 dsh.client 声明 + exports["./client"] 被发现,
 * 由 dsh-client-modules 扫描加载 —— 重启后 UI 永久存在。
 *
 * 依据旧版 taishan-vision 的 lib/client.js 重写:
 *  - 客户端模块 id / settings 命名空间 / 卡片 key 全部改为 "ts-vision"
 *  - 数据通道改走 Host 的 /api/ts-vision/* 端点(面板操作:state/update/
 *    rescan/credential,写操作为 POST)
 *  - 去掉「检查更新」按钮(本地发行,无 GitHub Release),卡片状态行改为
 *    启用/停用徽标
 *
 * DSH 0.1.6-alpha.2+ / 0.1.7 适配(与 modsearch 5.10.4 同机制):
 *  - 插件配置卡片从「设置 → 插件 → 插件配置」搬到「插件」面板各 bundle
 *    的详情页,客户端在 plugins.bundle.config 插槽按 npm 包名 key 注册
 *    (key="ts-vision"),页面传 view: "page"(表单直接展开)/ "summary"
 *    (一行摘要);
 *  - 同时保留 settings.plugin.item 注册,一份客户端服务旧版宿主
 *    (无该槽时 inject 挂起,闭包永不执行)。
 *
 * v1.0.2(2026-09):配置页排版对齐官方 modsearch 卡片 —— 去掉「启用/停用」
 * 按钮(启停交还宿主 bundle 卡片开关统一管理)与版本信息行;字段改为
 * 官方 fieldRow 平铺布局(label 行在上、控制行在下、行间 1px 分隔线,
 * 直接画在宿主 detailSection 里,不再套折叠卡外壳);输入框优先用宿主
 * 自带的 @deepseek-ai/dsh-client-ui-primitives Input 控件(旧宿主无此
 * 包时回退原生 input);模型勾选 + ⠿ 拖拽调序保留。
 */
window.__ModuleLoader__.load({
	id: "ts-vision",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let React = require("react");

		// 官方排版:优先用宿主自带的 ui.Input(与内置配置页同款控件);
		// 旧宿主没有该包时回退到原生 input(下方 Input 变量统一取用)。
		let uiPrimitives = null;
		try { uiPrimitives = require("@deepseek-ai/dsh-client-ui-primitives"); } catch (e) { /* 旧宿主无此包 */ }
		const Input = (uiPrimitives && uiPrimitives.Input) || "input";

		//#region css
		// ── 「插件配置」卡片壳(与 DSH 内置 PluginCard 同风格:16px 圆角 / hover / 展开切换) ──
		const css = [
			".tsv-pcard{border:.5px solid var(--dsw-alias-border-l4,#E5E7EB);background:var(--dsw-alias-bg-layer-3,#FFFFFF);border-radius:16px;list-style:none;transition:border-color .16s,background .16s;margin:0}",
			".tsv-pcard:hover{border-color:var(--dsw-alias-label-dimmed,var(--dsw-alias-border-l4,#E5E7EB))}",
			".tsv-pcard-open{background:var(--dsw-alias-bg-layer-2,#FFFFFF);border-color:var(--dsw-alias-label-dimmed,var(--dsw-alias-border-l4,#E5E7EB))}",
			".tsv-pcard-header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:flex-start;gap:12px;padding:14px 16px;display:flex}",
			".tsv-pcard-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#2563EB);outline-offset:-2px}",
			".tsv-pcard-head{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}",
			".tsv-pcard-name{color:var(--dsw-alias-label-primary,#1F2329);font-size:15px;font-weight:600;line-height:1.4;margin-top:2px}",
			// 折叠头第二行:描述 + 状态徽标,同行基线对齐
			".tsv-pcard-subrow{display:flex;align-items:center;gap:10px;min-width:0;flex-wrap:wrap;margin-top:0}",
			".tsv-pcard-desc{color:var(--dsw-alias-label-tertiary,#9CA3AF);font-size:13px;line-height:1.5;flex:1 1 auto;min-width:0}",
			".tsv-pcard-status{display:inline-flex;align-items:center;gap:8px;flex:none;margin-left:0}",
			".tsv-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;line-height:1;border-radius:999px;padding:4px 10px;white-space:nowrap}",
			".tsv-badge-ok{color:var(--dsw-alias-state-success-primary,#16A34A);background:var(--dsw-alias-state-success-tertiary,#E8F7EE)}",
			".tsv-badge-off{color:var(--dsw-alias-label-tertiary,#9CA3AF);background:var(--dsw-alias-interactive-bg-hover,#F2F4F7)}",
			".tsv-pcard-chevron{color:var(--dsw-alias-label-tertiary,#9CA3AF);flex:none;transition:transform .16s;margin-top:4px}",
			".tsv-pcard-chevron-open{transform:rotate(180deg)}",
			// 展开体:折叠/展开平滑动画(max-height + opacity 过渡),折叠时隐藏边框
			".tsv-pcard-body{border-top:.5px solid transparent;max-height:0;overflow:hidden;opacity:0;transition:max-height .22s ease,opacity .18s ease,border-color .18s ease;box-sizing:border-box}",
			".tsv-pcard-open .tsv-pcard-body{border-top:.5px solid var(--dsw-alias-border-l2,#EEF0F3);margin:0 16px;max-height:520px;opacity:1;padding:0 0 8px;overflow-y:auto}",
			// ── 输入框(API Key 等;与内置 SecretField 同款描边) ──
			".tsv-input{border:.5px solid var(--dsw-alias-border-l4,#E5E7EB);background:var(--dsw-alias-bg-layer-3,#FFFFFF);height:34px;font:inherit;color:var(--dsw-alias-label-primary,#1F2329);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5;width:100%;max-width:280px;font-family:'SF Mono','JetBrains Mono',Consolas,'Courier New',monospace}",
			".tsv-input:focus-visible{border-color:var(--dsw-alias-brand-primary,#2563EB);outline:none}",
			".tsv-input:disabled{color:var(--dsw-alias-label-tertiary,#9CA3AF);cursor:default}",
			// 模型行(勾选框 + 名称 + provider + Key 状态 + 拖拽点)
			".tsv-model{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;font-size:13px;transition:background .15s ease,opacity .2s ease;cursor:default}",
			".tsv-model:hover{background:var(--dsw-alias-interactive-bg-hover,#F2F4F7)}",
			".tsv-model.tsv-dragging{opacity:.5;background:var(--dsw-alias-interactive-bg-hover,#F2F4F7);cursor:grabbing}",
			".tsv-model.tsv-drag-over{border-left:2px solid var(--dsw-alias-state-business-primary,#2563EB)}",
			".tsv-check{width:16px;height:16px;flex:0 0 auto;cursor:pointer;accent-color:var(--dsw-alias-state-business-primary,#2563EB)}",
			".tsv-model-name{font-family:'SF Mono','JetBrains Mono',Consolas,'Courier New',monospace;font-size:12px;color:var(--dsw-alias-label-primary,#1F2329);flex:0 0 auto}",
			".tsv-model-prov{font-size:11px;color:var(--dsw-alias-label-tertiary,#9CA3AF);flex:0 0 auto}",
			".tsv-model-key{font-size:12px;color:var(--dsw-alias-state-success-primary,#16A34A);flex:0 0 auto;margin-left:auto}",
			".tsv-model-key-missing{color:var(--dsw-alias-state-error-primary,#DC2626)}",
			".tsv-drag-handle{color:var(--dsw-alias-label-tertiary,#9CA3AF);font-size:14px;cursor:grab;user-select:none;flex:0 0 auto;line-height:1}",
			".tsv-drag-handle:active{cursor:grabbing}",
			".tsv-model-list{display:flex;flex-direction:column;gap:2px}",
			// 按钮(普通按钮 hover 浅灰填充,主按钮 hover 变品牌蓝,与 DSW 官方按钮一致)
			".tsv-btn{appearance:none;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#EEF0F3);border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5;background:0 0;color:var(--dsw-alias-label-secondary,#6B7280);transition:color .15s ease,border-color .15s ease,background .15s ease}",
			".tsv-btn:not(.tsv-btn-primary):not(:disabled):hover{color:var(--dsw-alias-label-primary,#1F2329);border-color:var(--dsw-alias-label-dimmed,var(--dsw-alias-border-l4,#E5E7EB));background:var(--dsw-alias-interactive-bg-hover,#F2F4F7)}",
			".tsv-btn-primary{background:var(--dsw-alias-label-primary,#1F2329);border-color:var(--dsw-alias-label-primary,#1F2329);color:var(--dsw-alias-bg-layer-3,#FFFFFF);transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}",
			".tsv-btn-primary:not(:disabled):hover{background:var(--dsw-alias-state-business-primary,#2563EB);border-color:var(--dsw-alias-state-business-primary,#2563EB)}",
			".tsv-btn:disabled{opacity:.4;cursor:not-allowed}",
			".tsv-btn:disabled:hover{background:0 0}",
			".tsv-btn-sm{height:24px;padding:0 10px;font-size:11.5px;border-radius:6px}",
			// 空态
			".tsv-empty{padding:14px 0;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary,#9CA3AF)}",
			// ── 官方排版字段布局(对齐 modsearch fieldRow:label 行在上,控制行在下,行间 1px 分隔线) ──
			".tsv-fld{display:flex;flex-direction:column;gap:6px;padding:12px 0;border-top:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,0.35))}",
			".tsv-fld-label{font-size:13px;color:var(--dsw-alias-label-secondary,inherit);display:flex;align-items:center;gap:8px;flex-wrap:wrap;row-gap:4px}",
			".tsv-fld-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,rgba(127,127,127,0.8));line-height:1.5;margin:0}",
			".tsv-fld-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;row-gap:6px}",
			// 行内三段(标签 → 输入框 → 按钮组)统一走容器 gap:8px;
			// 标签盒子不再预留固定 min-width,按文字自然宽度,
			// 避免标签右缘到输入框的视觉间距被盒子空白拉开
			".tsv-fld-inline-label{font-size:13px;color:var(--dsw-alias-label-secondary,inherit);flex:0 0 auto;white-space:nowrap}"
		].join("\n");
		// CSS 注入:设置页打开前将样式表插入页面(与 dsh-usage-stats 同机制)
		const cssTagId = "ts-vision/TsVision.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + cssTagId + "\"]") === null) {
			const tag = document.createElement("style");
			tag.setAttribute("data-plugin-css", cssTagId);
			tag.textContent = css;
			document.head.append(tag);
		}
		//#endregion

		//#region helpers
		/** 静态 Client 数据通道:同源 fetch 调用 Host 的 /api/ts-vision/* 端点 */
		async function call(method, args) {
			// state 为 GET,其余(update/rescan/credential)为 POST,
			// 统一拼到 /api/ts-vision/<name>
			const path = "/api/ts-vision/" + method;
			let response;
			if (method === "update" || method === "rescan" || method === "credential") {
				response = await fetch(path, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(args || {}),
				});
			} else {
				response = await fetch(path, { headers: { accept: "application/json" } });
			}
			const payload = await response.json();
			// HTTP 端点统一返回 { ok, state } / { ok, ... };解包为组件期望的结构
			if (payload && typeof payload === "object" && payload.ok === true) {
				if ("state" in payload) return payload.state;
				return payload;
			}
			throw new Error((payload && payload.error) || ("HTTP " + response.status));
		}
		function routeKey(provider, model) {
			return String(provider) + "|" + String(model);
		}
		//#endregion

		//#region panel
		// ── 摘要文案(与宿主 bundle 标题下方的一行副标题一致) ──
		const SUMMARY_TEXT = "Ts-vision:GLM 免费视觉识别 + 当前模型推理";

		/**
		 * Panel: 泰山识图配置卡片,按 props.view 渲染三种形态:
		 *  - view === "page":    DSH 0.1.6-alpha.2+ 插件页(Plugins → ts-vision):
		 *                        与官方 modsearch 卡片同构 —— h4 section 标题 +
		 *                        字段直接平铺在宿主 detailSection 里(无卡片外壳),
		 *                        无启用/停用按钮(启停由宿主 bundle 卡片开关统一
		 *                        管理),保留模型勾选 + 拖拽排序
		 *  - view === "summary": 一行纯字符串摘要(宿主直接画在 bundle 标题下)
		 *  - 无 view:            旧版 Settings → 插件 → 插件配置 的可折叠卡片
		 * 排障走 ts_vision_diag 工具。
		 */
		function Panel(props) {
			// view 形态:page = 插件页详情(表单展开);summary = 一行摘要(不拉数据)。
			// 所有 hooks 无条件执行(React 规则),分支只在渲染阶段。
			const view = props && props.view;
			const [state, setState] = React.useState(null);
			const [phase, setPhase] = React.useState("idle");
			const [error, setError] = React.useState(null);
			const [open, setOpen] = React.useState(false);
			const [keyValue, setKeyValue] = React.useState("");
			const [keyToast, setKeyToast] = React.useState(null);
			const keyToastTimer = React.useRef(null);
			const [scanning, setScanning] = React.useState(false);

			// 整体替换:面板数据端点返回完整 state,直接整包覆盖
			const onState = React.useCallback((res) => { setState(res); }, []);
			const scan = (state && state.scan) || {};
			const config = (state && state.config) || {};
			const cred = (state && state.credential) || {};
			const providerState = (state && state.providerState) || {};
			const routesEnabled = config.routesEnabled || {};
			const routeOrder = config.routeOrder || [];

			// 首次需要数据才拉取(旧版折叠卡片展开时,或插件页 view === "page"
			// 直接展开时);summary 形态为纯静态文案,零请求。
			const load = React.useCallback(() => {
				setPhase("loading");
				setError(null);
				call("state", {})
					.then((res) => {
						if (res && res.error) throw new Error(res.error);
						setState(res);
						setPhase("ready");
					})
					.catch((e) => { setError(String(e && e.message ? e.message : e)); setPhase("error"); });
			}, []);
			React.useEffect(() => {
				if ((view === "page" || open) && phase === "idle") load();
			}, [view, open, phase, load]);

			// ── 操作(启停已交还宿主:bundle 卡片顶部的「启用 ts-vision」
			//    开关即总闸,配置页不再重复,与官方插件卡片行为一致) ──
			const rescan = () => {
				setScanning(true);
				call("rescan", {})
					.then((res) => { if (res && res.version) onState(res); })
					.catch(() => {})
					.finally(() => setScanning(false));
			};
			const keyShowToast = (kind, text) => {
				setKeyToast({ kind, text });
				if (keyToastTimer.current) clearTimeout(keyToastTimer.current);
				keyToastTimer.current = setTimeout(() => setKeyToast(null), kind === "ok" ? 2500 : 4000);
			};
			const saveKey = () => {
				const v = (keyValue || "").trim();
				if (!v) { keyShowToast("err", "请输入 API Key"); return; }
				call("credential", { value: v })
					.then((res) => {
						if (res && res.error) { keyShowToast("err", res.error); return; }
						setKeyValue("");
						if (res && res.version) onState(res);
						keyShowToast("ok", "API Key 已保存,立即生效");
					})
					.catch((e) => keyShowToast("err", String(e && e.message ? e.message : e)));
			};
			const clearKey = () => {
				call("credential", { clear: true })
					.then((res) => {
						if (res && res.error) { keyShowToast("err", res.error); return; }
						setKeyValue("");
						if (res && res.version) onState(res);
						keyShowToast("ok", "API Key 已清除");
					})
					.catch((e) => keyShowToast("err", String(e && e.message ? e.message : e)));
			};

			// ── 模型列表(勾选 = 生效) ──
			const vision = scan.visionModels || [];
			const keyOf = (v) => routeKey(v.provider, v.id);
			const byKey = new Map(vision.map((v) => [keyOf(v), v]));
			const ordered = [];
			for (const key of routeOrder) {
				if (byKey.has(key)) { ordered.push(byKey.get(key)); byKey.delete(key); }
			}
			for (const v of byKey.values()) ordered.push(v);
			const list = ordered;
			const [dragKey, setDragKey] = React.useState(null);
			const [overKey, setOverKey] = React.useState(null);
			const [localList, setLocalList] = React.useState(null);
			const overKeyRef = React.useRef(null);
			const rowRefs = React.useRef({});
			const prevTops = React.useRef({});
			const shown = localList || list;
			React.useEffect(() => {
				setLocalList(null); setDragKey(null); setOverKey(null); overKeyRef.current = null;
				prevTops.current = {};
			}, [state]);
			React.useEffect(() => {
				const tops = {};
				for (const key of Object.keys(rowRefs.current)) {
					const el = rowRefs.current[key];
					if (el) tops[key] = el.offsetTop;
				}
				for (const key of Object.keys(tops)) {
					const prev = prevTops.current[key];
					if (prev === undefined || prev === tops[key]) continue;
					const el = rowRefs.current[key];
					const dy = prev - tops[key];
					el.style.transition = "none";
					el.style.transform = "translateY(" + dy + "px)";
					void el.offsetHeight;
					el.style.transition = "transform .22s ease";
					el.style.transform = "translateY(0)";
				}
				prevTops.current = tops;
			}, [shown]);
			const commitOrder = (orderedList) => {
				call("update", { patch: { routeOrder: orderedList.map(keyOf) } })
					.then((res) => { if (res && res.version) onState(res); setLocalList(null); })
					.catch(() => setLocalList(null));
			};
			const onDragStart = (e, key) => {
				setDragKey(key);
				e.dataTransfer.effectAllowed = "move";
				try { e.dataTransfer.setData("text/plain", key); } catch (_) {}
			};
			const onDragOver = (e, key) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				if (!dragKey || dragKey === key || overKeyRef.current === key) return;
				overKeyRef.current = key;
				setOverKey(key);
				const from = shown.findIndex((r) => keyOf(r) === dragKey);
				const to = shown.findIndex((r) => keyOf(r) === key);
				if (from < 0 || to < 0) return;
				const next = shown.slice();
				const [moved] = next.splice(from, 1);
				next.splice(to, 0, moved);
				setLocalList(next);
			};
			const onDrop = (e) => { e.preventDefault(); overKeyRef.current = null; setOverKey(null); };
			const onDragEnd = () => {
				overKeyRef.current = null;
				setDragKey(null);
				setOverKey(null);
				if (localList && localList !== list) commitOrder(localList);
				else setLocalList(null);
			};
			const toggleModel = (v) => {
				const key = keyOf(v);
				const patch = {};
				patch[key] = !(routesEnabled[key] !== false);
				call("update", { patch: { routesEnabled: patch } })
					.then((res) => { if (res && res.version) onState(res); })
					.catch(() => {});
			};
			const modelRows = shown.map((v) => {
				const key = keyOf(v);
				const on = routesEnabled[key] !== false;
				const mCred = v.credential || {};
				return React.createElement("div", {
					key,
					className: "tsv-model" +
						(dragKey === key ? " tsv-dragging" : "") +
						(overKey === key && dragKey !== key ? " tsv-drag-over" : ""),
					ref: (el) => { if (el) rowRefs.current[key] = el; },
					onDragOver: (e) => onDragOver(e, key),
					onDrop,
				},
					React.createElement("input", {
						type: "checkbox",
						className: "tsv-check",
						checked: on,
						onChange: () => toggleModel(v),
						title: "勾选后该模型生效;失败时自动尝试下一个",
						"aria-label": (on ? "停用 " : "启用 ") + v.provider + "/" + v.id,
					}),
					React.createElement("span", { className: "tsv-model-name" }, v.id),
					React.createElement("span", { className: "tsv-model-prov" }, v.provider),
					mCred.configured
						? React.createElement("span", { className: "tsv-model-key" }, "Key 已配置")
						: React.createElement("span", { className: "tsv-model-key tsv-model-key-missing" }, "Key 未配置"),
					// 拖拽点(Key 状态后面,⠿ 六个点)
					React.createElement("span", {
						className: "tsv-drag-handle",
						draggable: true,
						onDragStart: (e) => onDragStart(e, key),
						onDragEnd,
						title: "拖动调整调用顺序",
					}, "⠿"),
				);
			});

			// ── 折叠头状态徽标(仅旧版卡片形态使用) ──
			const enabled = config.enabled !== false;
			const badge = phase === "ready"
				? React.createElement("span", { className: "tsv-badge " + (enabled ? "tsv-badge-ok" : "tsv-badge-off") },
						enabled ? "已启用" : "已停用")
				: null;

			// ── 插件页摘要形态(DSH 0.1.6-alpha.2+:返回纯字符串副标题,与
			//    modsearch 一致 —— 宿主直接把它画在 bundle 标题下方) ──
			if (props && props.view === "summary") {
				return SUMMARY_TEXT;
			}

			// ── 官方排版字段(对齐 modsearch fieldRow:label 行在上、控制行
			//    在下、行间 1px 分隔线;整卡无嵌套外壳,直接平铺在宿主
			//    detailSection 里) ──
			const fldLabel = (labelText, trailing) =>
				React.createElement("div", { className: "tsv-fld-label" },
					React.createElement("span", null, labelText),
					trailing,
				);
			const fld = (key, labelNode, controlNode, hintNode) =>
				React.createElement("div", { className: "tsv-fld", key },
					labelNode,
					controlNode,
					hintNode,
				);

			// ── 展开体内容 ──
			const bodyContent = () => {
				if (phase === "loading") {
					return React.createElement("div", {
						style: {
							display: "flex", alignItems: "center", gap: "8px",
							padding: "12px 0", fontSize: "13px",
							color: "var(--dsw-alias-label-tertiary, rgba(127,127,127,0.8))",
						},
					}, "加载中…");
				}
				if (phase === "error") {
					return React.createElement("div", {
						style: {
							display: "flex", alignItems: "center", gap: "8px",
							padding: "12px 0", fontSize: "13px",
							color: "var(--dsw-alias-label-tertiary, rgba(127,127,127,0.8))",
						},
					},
						React.createElement("span", { role: "status", style: { marginRight: "auto" } }, "加载失败:" + error),
						React.createElement("button", {
							type: "button", onClick: load,
							className: "tsv-btn tsv-btn-sm",
						}, "重试"),
					);
				}
				return React.createElement(React.Fragment, null,
					// 字段①:智谱 API KEY(标签与输入框/按钮同行,官方「名称 + 控件」排版)
					fld(
						"key",
						React.createElement("div", { className: "tsv-fld-row" },
							React.createElement("span", { className: "tsv-fld-inline-label" }, "智谱 API KEY"),
							React.createElement(Input, {
								className: "tsv-input",
								style: { width: "280px", flex: "0 0 auto" },
								type: "password",
								value: keyValue,
								autoComplete: "off", spellCheck: false,
								placeholder: cred.configured ? "已配置(粘贴新 Key 可覆盖)" : "粘贴 API Key",
								onChange: (e) => setKeyValue(e.target.value),
								onKeyDown: (e) => { if (e.key === "Enter") saveKey(); },
							}),
							React.createElement("button", { className: "tsv-btn tsv-btn-sm tsv-btn-primary", onClick: saveKey, disabled: (keyValue || "").trim() === "" }, "保存"),
							React.createElement("button", { className: "tsv-btn tsv-btn-sm", onClick: clearKey, disabled: !cred.configured }, "清除"),
							keyToast && React.createElement("span", {
								role: "status",
								style: {
									fontSize: "12px",
									color: keyToast.kind === "ok"
										? "var(--dsw-alias-state-success-primary,#16A34A)"
										: "var(--dsw-alias-state-error-primary,#DC2626)",
								},
							}, keyToast.text),
						),
						providerState.missing && providerState.appended
							? React.createElement("p", {
								className: "tsv-fld-hint",
								style: {
									margin: "0",
									fontSize: "12px",
									color: "var(--dsw-alias-label-tertiary, rgba(127,127,127,0.8))",
									lineHeight: "1.5",
								},
							},
								"已保存。zhipu-glm 提供方声明已自动写入 profile 补丁:重启 DSH 客户端后 GLM 模型出现在下方列表,无需再次配置")
							: React.createElement("p", { className: "tsv-fld-hint" },
								"打开 https://open.bigmodel.cn 注册登录并申请 API KEY,填入上方保存即可,立即生效,无需重启"),
					),
					// 字段②:可用视觉模型(label 行右侧带「重新扫描」,列表保留勾选 + 拖拽排序)
					fld(
						"models",
						fldLabel(
							"可用视觉模型(勾选生效,拖动 ⠿ 调整调用顺序)",
							React.createElement("button", {
								type: "button",
								className: "tsv-btn tsv-btn-sm",
								style: { marginLeft: "auto" },
								onClick: rescan, title: "立即重新扫描模型列表",
								disabled: scanning,
							}, scanning ? "扫描中…" : "重新扫描"),
						),
						vision.length === 0
							? React.createElement("div", { className: "tsv-empty" }, "未扫描到支持识图功能的模型")
							: React.createElement("div", { className: "tsv-model-list" }, modelRows),
						null,
					),
				);
			};

			// ── 插件页形态(DSH 0.1.6-alpha.2+:Plugins → ts-vision 详情页) ──
			// 宿主 detailSection 已画好包名(本地化为「泰山识图」),字段直接
			// 平铺在其下,不再重复 section 小标题(与 modsearch 的区别:它的
			// 宿主标题是英文 npm 包名,需要小标题说明;本包宿主标题即中文)。
			if (props && props.view === "page") {
				return bodyContent();
			}

			// ── 旧版形态:Settings → 插件 → 插件配置 的可折叠卡片 ──
			return React.createElement("li", { className: "tsv-pcard" + (open ? " tsv-pcard-open" : "") },
				React.createElement("button", {
					type: "button",
					className: "tsv-pcard-header",
					"aria-expanded": open,
					"aria-label": (open ? "收起 " : "展开 ") + "泰山识图",
					onClick: () => setOpen(!open),
				},
					React.createElement("span", { className: "tsv-pcard-head" },
						React.createElement("span", { className: "tsv-pcard-name" }, "泰山识图"),
						// 副行:描述文字 + 状态徽标,同行基线对齐
						React.createElement("span", { className: "tsv-pcard-subrow" },
							React.createElement("span", { className: "tsv-pcard-desc" },
								SUMMARY_TEXT),
							React.createElement("span", { className: "tsv-pcard-status" }, badge),
						),
					),
					React.createElement("svg", {
						className: "tsv-pcard-chevron" + (open ? " tsv-pcard-chevron-open" : ""),
						width: 14, height: 14, viewBox: "0 0 14 14",
						"aria-hidden": "true",
					},
						React.createElement("path", {
							d: "M3.5 5.25l3.5 3.5 3.5-3.5",
							fill: "none", stroke: "currentColor",
							strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
						}),
					),
				),
				// 展开体常驻渲染,折叠/展开走 CSS max-height+opacity 平滑动画
				React.createElement("div", { className: "tsv-pcard-body" },
					bodyContent(),
				),
			);
		}
		//#endregion

		//#region plugin body
		// 顶层 inject 声明为空,全部依赖走 scoped
		// ctx.inject(在 apply 内按需包裹)。这样宿主端没有的服务不会
		// 导致 DSH 启动失败("Failed to load plugins")。
		const inject = [];

		/**
		 * Client plugin body: 把泰山识图面板注册到 DSH 客户端的配置表面。
		 *
		 * 插槽分发(与 modsearch 5.10.4+ 相同机制):
		 *  - DSH 0.1.6-alpha.2+ / 0.1.7+: 卡片在「插件」面板各 bundle
		 *    自己的详情页,走 plugins.bundle.config 插槽,按 npm 包名
		 *    ("ts-vision")分发;页面传 view: "page"(表单直接展开)或
		 *    view: "summary"(一行摘要)。
		 *  - 旧版(< 0.1.6-alpha.2,无插件面板的宿主):「设置 → 插件 →
		 *    插件配置」页按 settings.plugin.item 插槽分发卡片(无此槽的
		 *    宿主上 inject 挂起,闭包永不执行,不会报错;宿主端已不再注册
		 *    settings 命名空间,仅保留客户端注册以兼容仍走该页的旧宿主)。
		 *  同一份 Panel 组件按 props.view 渲染对应形态,一份客户端服务
		 *  新旧两代宿主。
		 *
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			const registerBoth = (slots) => {
				// 1) 插件页 surface(DSH 0.1.6-alpha.2+):按 npm 包名 key 分发
				try {
					slots.inject("plugins.bundle.config", function* () {
						yield slots.register({
							name: "plugins.bundle.config",
							key: "ts-vision",
						}, Panel);
					});
				} catch (e) {
					if (typeof window !== "undefined") window.__TSVISION_REG_ERROR__ = String(e && e.stack ? e.stack : e);
				}
				// 2) 旧版「插件配置」页 surface(无此槽的宿主上 inject 挂起,
				//    闭包永不执行,不会报错)
				try {
					slots.inject("settings.plugin.item", function* () {
						yield slots.register({
							name: "settings.plugin.item",
							id: "ts-vision",
							key: "ts-vision",
						}, Panel);
					});
				} catch (e) {
					if (typeof window !== "undefined") window.__TSVISION_REG_ERROR__ = String(e && e.stack ? e.stack : e);
				}
			};
			if (typeof ctx.inject === "function") {
				// scoped ctx.inject(['slots']),闭包在服务真正
				// 可用时执行;里面用生成器 function* + yield 做注册。
				ctx.inject(["slots"], (scope) => {
					registerBoth(scope.slots);
				});
			} else if (ctx.slots) {
				// 兜底:ctx.inject 不可用时退回顶层直用
				registerBoth(ctx.slots);
			}
			// 诊断:读回插件页槽的账本,确认卡片条目真的进账本了。
			// 浏览器 Console 执行
			// JSON.stringify({slot: window.__TSVISION_SLOT__, err: window.__TSVISION_REG_ERROR__})
			const readLedger = () => {
				let ok = false;
				try {
					const entries = ctx.slots.entries("plugins.bundle.config") || [];
					ok = entries.some((en) => en.options && en.options.key === "ts-vision");
				} catch (_) { /* 宿主未实现 entries() 时保持默认值 */ }
				window.__TSVISION_SLOT__ = { "plugins.bundle.config": ok };
			};
			readLedger();
			setTimeout(readLedger, 3000); // 3 秒后再读一次稳定状态
			if (typeof window !== "undefined") window.__TSVISION_APPLIED__ = true;
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		exports.Panel = Panel;
		return module.exports;
	}
});
