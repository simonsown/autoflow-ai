$token = Get-Content -Raw "$PSScriptRoot\..\..\New Text Document.txt" | ForEach-Object { $_.Trim() }
$input = [Console]::In.ReadToEnd()
if ($input -match 'username=') { Write-Output "username=simonsown" }
if ($input -match 'password=') { Write-Output "password=$token" }
