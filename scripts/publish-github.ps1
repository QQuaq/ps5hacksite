param(
  [string]$Name = "ps5hacksite"
)

$ErrorActionPreference = "Stop"
$gh = "$env:ProgramFiles\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { throw "GitHub CLI yok. winget install GitHub.cli" }

& $gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Once giris: gh auth login -h github.com -p https -w"
  exit 1
}

npm run pages | Out-Null
git add -A
$dirty = git status --porcelain
if ($dirty) {
  git -c user.name="Alpayxxd" -c user.email="Alpayxxd@users.noreply.github.com" commit -m "Pages: docs yenile"
}

$remote = ''
try { $remote = git remote get-url origin 2>$null } catch { $remote = '' }
if (-not $remote) {
  & $gh repo create $Name --public --source=. --remote=origin --push
} else {
  git push -u origin main
}

$user = (& $gh api user --jq .login)
$repo = $Name
& $gh api "repos/$user/$repo/pages" -X POST -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/docs" 2>$null

Write-Host ""
Write-Host "Site (birkaç dakika): https://$user.github.io/$repo/"
Write-Host "Panel: https://$user.github.io/$repo/panel.html"
Write-Host "DNS icin yine start.bat (github.io DNS yapamaz)."