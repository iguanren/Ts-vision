# 娉板北璇嗗浘 Ts-vision 路 DSH 妗岄潰瀹㈡埛绔畨瑁呰剼鏈?# ============================================================
# 浠?GitHub 浠撳簱 https://github.com/iguanren/Ts-vision 鍏嬮殕/涓嬭浇鍚?
# 鍦ㄦ湰浠撳簱鐩綍鍐呰繍琛?鑴氭湰鑷姩瀹氫綅鎵€鍦ㄧ洰褰?:
#   powershell -NoProfile -ExecutionPolicy Bypass -File install-desktop.ps1
#
# 浣滅敤(鍏ㄧ▼涓嶅啓 npm,涓嶄緷璧?dsh CLI):
#   1. 鎶婃彃浠舵枃浠跺鍒跺埌 ~/.dsh/profiles/desktop/node_modules/ts-vision
#   2. 鏇存柊 desktop profile 鐨?package.json(dependencies + dsh.profile.bundles)
#   3. 鍦?desktop/cordis.patch.yml 杩藉姞 ts-vision 鏉＄洰(宸插瓨鍦ㄥ垯璺宠繃)
#   4. 鎻愮ず:zhipu-glm provider 澹版槑鐢辨彃浠跺惎鍔ㄦ椂鑷姩琛ュ啓,鏃犻渶鎵嬪伐閰嶇疆
#
# 閲嶅杩愯鍗冲崌绾?鐩爣鐩綍鍏堟竻绌哄啀澶嶅埗,profile 鏉＄洰骞傜瓑杩藉姞銆?$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Profile = "desktop"
$Plugin = "ts-vision"
$DshBase = Join-Path $env:USERPROFILE ".dsh"
$ProfileDir = Join-Path $DshBase "profiles\$Profile"
$NodeModulesDir = Join-Path $ProfileDir "node_modules"
$PluginTarget = Join-Path $NodeModulesDir $Plugin

# 鍙畨瑁呰繍琛屾椂蹇呴渶鏂囦欢(涓嶅惈鑴氭湰/鏂囨。/鏋勫缓娈嬬暀)
$Files = @("lib", "locale", "package.json", "cordis.patch.yml")

Write-Host "== 娉板北璇嗗浘 Ts-vision 瀹夎鑴氭湰 =="
if (-not (Test-Path $ProfileDir)) {
    throw "鎵句笉鍒?DSH profile 鐩綍: $ProfileDir (璇峰厛鍚姩涓€娆?DSH 瀹㈡埛绔?"
}
foreach ($f in $Files) {
    if (-not (Test-Path (Join-Path $RepoRoot $f))) {
        throw "浠撳簱缂哄皯 $f ,璇风‘璁ゅ湪 Ts-vision 浠撳簱鏍圭洰褰曡繍琛屾湰鑴氭湰: $RepoRoot"
    }
}
New-Item -ItemType Directory -Force -Path $NodeModulesDir | Out-Null

# 1. 澶嶅埗鎻掍欢(鍏堟竻绌?閬垮厤鏃ф枃浠舵畫鐣?
if (Test-Path $PluginTarget) { Remove-Item -Recurse -Force $PluginTarget }
foreach ($f in $Files) {
    Copy-Item -Recurse -Force -Path (Join-Path $RepoRoot $f) -Destination (Join-Path $PluginTarget $f)
}
Write-Host "[1/3] 宸插鍒舵彃浠跺埌 $PluginTarget"

# 2. 鏇存柊 package.json(dependencies + dsh.profile.bundles)
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

# 鎵嬪伐鎷?JSON,淇濇寔涓?DSH 鐢熸垚鐨勬牸寮忎竴鑷?2 绌烘牸缂╄繘)
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
Write-Host "[2/3] 宸叉洿鏂?$PkgPath"

# 3. cordis.patch.yml 杩藉姞鏉＄洰
$PatchPath = Join-Path $ProfileDir "cordis.patch.yml"
if (Test-Path $PatchPath) {
    $yml = Get-Content $PatchPath -Raw
    $entry = "- id: ts-vision`n  disabled: false`n"
    if ($yml -notmatch "id:\s*ts-vision") {
        Add-Content -Path $PatchPath -Value $entry -Encoding UTF8
        Write-Host "[3/3] 宸插湪 $PatchPath 杩藉姞 ts-vision 鏉＄洰"
    } else {
        Write-Host "[3/3] $PatchPath 宸叉湁 ts-vision 鏉＄洰,璺宠繃"
    }
} else {
    Set-Content -Path $PatchPath -Value "- id: ts-vision`n  disabled: false`n" -Encoding UTF8
    Write-Host "[3/3] 鍒涘缓 $PatchPath 骞跺啓鍏?ts-vision 鏉＄洰"
}

Write-Host ""
Write-Host "瀹屾垚!閲嶅惎 DSH 瀹㈡埛绔悗:"
Write-Host "  1. 鎵撳紑宸︿晶銆屾彃浠躲€嶉潰鏉?鈫?ts-vision,绮樿创鏅鸿氨 API Key 淇濆瓨"
Write-Host "     (Key 浠?https://open.bigmodel.cn 娉ㄥ唽鐢宠,鍏嶈垂)"
Write-Host "  2. 鑻?zhipu-glm 鎻愪緵鏂瑰皻鏈敞鍐?鎻掍欢宸茶嚜鍔ㄥ啓鍏ュ０鏄?閲嶅惎涓€娆?DSH 瀹㈡埛绔悗"
Write-Host "     GLM 妯″瀷鍑虹幇鍦ㄣ€屽彲鐢ㄨ瑙夋ā鍨嬨€嶅垪琛?鍗冲彲涓婁紶鍥剧墖璇嗗浘銆?

