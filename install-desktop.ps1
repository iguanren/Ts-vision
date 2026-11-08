# 泰山识图 Ts-vision · DSH 桌面客户端安装脚本
# ============================================================
# 从 GitHub 仓库 https://github.com/iguanren/Ts-vision 克隆/下载后,
# 在本仓库目录内运行(脚本自动定位所在目录):
#   powershell -NoProfile -ExecutionPolicy Bypass -File install-desktop.ps1
#
# 作用(全程不写 npm,不依赖 dsh CLI):
#   1. 把插件文件复制到 ~/.dsh/profiles/desktop/node_modules/ts-vision
#   2. 更新 desktop profile 的 package.json(dependencies + dsh.profile.bundles)
#   3. 在 desktop/cordis.patch.yml 追加 ts-vision 条目(已存在则跳过)
#   4. 提示:重启后在「插件」面板粘贴智谱 API Key 保存即可 —— 插件会经宿主
#      settings 服务自动补写 zhipu-glm 提供方声明,无需手改配置
#
# 重复运行即升级:目标目录先清空再复制,profile 条目幂等追加。
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Profile = "desktop"
$Plugin = "ts-vision"
$DshBase = Join-Path $env:USERPROFILE ".dsh"
$ProfileDir = Join-Path $DshBase "profiles\$Profile"
$NodeModulesDir = Join-Path $ProfileDir "node_modules"
$PluginTarget = Join-Path $NodeModulesDir $Plugin

# 只安装运行时必需文件(不含脚本/文档/构建残留)
$Files = @("lib", "locale", "package.json", "cordis.patch.yml", "icon.svg")

Write-Host "== 泰山识图 Ts-vision 安装脚本 =="
if (-not (Test-Path $ProfileDir)) {
    throw "找不到 DSH profile 目录: $ProfileDir (请先启动一次 DSH 客户端)"
}
foreach ($f in $Files) {
    if (-not (Test-Path (Join-Path $RepoRoot $f))) {
        throw "仓库缺少 $f ,请确认在 Ts-vision 仓库根目录运行本脚本: $RepoRoot"
    }
}
New-Item -ItemType Directory -Force -Path $NodeModulesDir | Out-Null

# 1. 复制插件(先清空,避免旧文件残留)
if (Test-Path $PluginTarget) { Remove-Item -Recurse -Force $PluginTarget }
foreach ($f in $Files) {
    Copy-Item -Recurse -Force -Path (Join-Path $RepoRoot $f) -Destination (Join-Path $PluginTarget $f)
}
Write-Host "[1/3] 已复制插件到 $PluginTarget"

# 2. 更新 package.json(dependencies + dsh.profile.bundles)
$PkgPath = Join-Path $ProfileDir "package.json"
$pkgText = Get-Content $PkgPath -Raw
$pkg = $pkgText | ConvertFrom-Json
$depValue = "file:" + $RepoRoot

if ($null -eq $pkg.dependencies) {
    $pkg | Add-Member -Force -NotePropertyName dependencies -NotePropertyValue (New-Object System.Management.Automation.HashtableInternal)
}
$pkg.dependencies | Add-Member -Force -NotePropertyName $Plugin -NotePropertyValue $depValue -MemberTypes NoteProperty

$bundles = @($pkg.dsh.profile.bundles)
if ($bundles -notcontains $Plugin) {
    $bundles = @($bundles + @($Plugin))
    $pkg.dsh.profile | Add-Member -Force -NotePropertyName bundles -NotePropertyValue $bundles -MemberTypes NoteProperty
}

# 手工拼 JSON,保持与 DSH 生成的格式一致(2 空格缩进)
$depsObj = [ordered]@{}
foreach ($k in $pkg.dependencies.PSObject.Properties.Name) { $depsObj[$k] = $pkg.dependencies.$k }
$json = @()
$json += "{"
$json += "  `"name`": `"" + $pkg.name + "`","
$json += "  `"private`": " + ($pkg.private -eq $true) + ","
$json += "  `"dependencies`": {"
$depNames = @($depsObj.Keys)
$depCount = $depNames.Count
for ($i = 0; $i -lt $depCount; $i++) {
    $k = $depNames[$i]
    $comma = if ($i -lt ($depCount - 1)) { "," } else { "" }
    $json += "    `"` + $k + "`": `"" + $depsObj[$k] + "`"" + $comma
}
$json += "  },"
$json += "  `"dsh`": {"
$json += "    `"profile`": {"
$json += "      `"bundles`": ["
$bundleCount = @($bundles).Count
for ($i = 0; $i -lt $bundleCount; $i++) {
    $comma = if ($i -lt ($bundleCount - 1)) { "," } else { "" }
    $json += "        `"" + $bundles[$i] + "`"" + $comma
}
$json += "      ]"
$json += "    }"
$json += "  }"
$json += "}"
($json -join "`n") | Set-Content $PkgPath -Encoding UTF8
Write-Host "[2/3] 已更新 $PkgPath"

# 3. cordis.patch.yml 追加条目
$PatchPath = Join-Path $ProfileDir "cordis.patch.yml"
if (Test-Path $PatchPath) {
    $yml = Get-Content $PatchPath -Raw
    $entry = "- id: ts-vision`n  disabled: false`n"
    if ($yml -notmatch "id:\s*ts-vision") {
        Add-Content -Path $PatchPath -Value $entry -Encoding UTF8
        Write-Host "[3/3] 已在 $PatchPath 追加 ts-vision 条目"
    } else {
        Write-Host "[3/3] $PatchPath 已有 ts-vision 条目,跳过"
    }
} else {
    Set-Content -Path $PatchPath -Value "- id: ts-vision`n  disabled: false`n" -Encoding UTF8
    Write-Host "[3/3] 创建 $PatchPath 并写入 ts-vision 条目"
}

Write-Host ""
Write-Host "完成!重启 DSH 客户端后:"
Write-Host "  1. 打开左侧「插件」面板 → ts-vision,粘贴智谱 API Key 保存"
Write-Host "     (Key 从 https://open.bigmodel.cn 注册申请,免费)"
Write-Host "  2. 保存时插件会经宿主 settings 服务自动补写 zhipu-glm 提供方声明,"
Write-Host "     宿主热注册后立即生效 —— 不用手改配置,也不用再重启"
Write-Host "  3. 面板里的勾选、顺序、超时/温度会自动存盘"
