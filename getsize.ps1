Add-Type -AssemblyName System.Drawing
$img1 = [System.Drawing.Image]::FromFile("$PSScriptRoot\Enemy_Animations_Set\enemies-skeleton1_take_damage.png")
Write-Host "take_damage: $($img1.Width)x$($img1.Height)"
$img1.Dispose()
$img2 = [System.Drawing.Image]::FromFile("$PSScriptRoot\Enemy_Animations_Set\enemies-skeleton2_death.png")
Write-Host "death: $($img2.Width)x$($img2.Height)"
$img2.Dispose()
