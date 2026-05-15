$enc=[System.Text.Encoding]::UTF8
$p1=[System.IO.File]::ReadAllLines('p1.js',$enc)
$p2=[System.IO.File]::ReadAllLines('p2.js',$enc)
$p3=[System.IO.File]::ReadAllLines('p3.js',$enc)
$all=$p1+$p2+$p3
[System.IO.File]::WriteAllLines('app.js',$all,$enc)
Write-Host "Done. Lines: $($all.Count)"
