param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$ServiceRoleKey,

  [Parameter(Mandatory = $true)]
  [string]$SendgridApiKey,

  [Parameter(Mandatory = $true)]
  [string]$SendgridFromEmail,

  [string]$SendgridFromName = "Rodicon",
  [int]$TaskEmailMaxJobs = 25
)

$ErrorActionPreference = 'Stop'

Write-Host "1) Verificando Supabase CLI..." -ForegroundColor Cyan
$npxCmd = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npxCmd) {
  throw "No se encontró npx. Instala Node.js LTS para continuar."
}

npx supabase --version | Out-Null

Write-Host "2) Vinculando proyecto..." -ForegroundColor Cyan
npx supabase link --project-ref $ProjectRef

Write-Host "3) Cargando secrets..." -ForegroundColor Cyan
npx supabase secrets set `
  SUPABASE_URL="$SupabaseUrl" `
  SUPABASE_SERVICE_ROLE_KEY="$ServiceRoleKey" `
  SENDGRID_API_KEY="$SendgridApiKey" `
  SENDGRID_FROM_EMAIL="$SendgridFromEmail" `
  SENDGRID_FROM_NAME="$SendgridFromName" `
  TASK_EMAIL_MAX_JOBS="$TaskEmailMaxJobs"

Write-Host "4) Desplegando function task-email-dispatch..." -ForegroundColor Cyan
npx supabase functions deploy task-email-dispatch

Write-Host "✅ Listo. Secrets cargados y function desplegada." -ForegroundColor Green
Write-Host "Siguiente paso: programar cron cada 5 min (Dashboard o SQL)." -ForegroundColor Yellow
