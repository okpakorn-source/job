# Read all sections as UTF-8
$enc = [System.Text.Encoding]::UTF8

$all  = [System.IO.File]::ReadAllLines('app.js', $enc)
$mid  = [System.IO.File]::ReadAllLines('fix_mid.js', $enc)

# top = lines 1-66 (0-indexed: 0-65)
$top = $all[0..65]

# bot = lines 115+ (0-indexed: 114+) — renderAdminLogin onward
$bot = $all[114..($all.Length - 1)]

$result = $top + $mid + $bot
[System.IO.File]::WriteAllLines('app.js', $result, $enc)
Write-Host "Done. Total lines: $($result.Count)"
