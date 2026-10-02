param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [switch]$CrearOrdenPrueba
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [ValidateSet("GET","POST","PATCH")]
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Method = $Method
    Uri = "$BaseUrl$Path"
    Headers = $Headers
    ContentType = "application/json"
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 10)
  }

  Invoke-RestMethod @params
}

Write-Host "`n=== Naturals & Spine - Smoke Test ===" -ForegroundColor Cyan

Write-Host "`n[1] Login ADMIN..." -ForegroundColor Yellow
$admin = Invoke-Api POST "/auth/login" @{
  correo_electronico = "admin@naturalsspine.com"
  password = "Password123!"
}
$adminToken = $admin.access_token
Write-Host "OK - rol: $($admin.rol)" -ForegroundColor Green

$adminHeaders = @{ Authorization = "Bearer $adminToken" }

Write-Host "`n[2] GET /clientes/estadisticas..." -ForegroundColor Yellow
$stats = Invoke-Api GET "/clientes/estadisticas" -Headers $adminHeaders
Write-Host "OK - documentos: $($stats.totalDocumentos), pendientes: $($stats.clientesPendientesCount)" -ForegroundColor Green

Write-Host "`n[3] GET /clientes/pendientes..." -ForegroundColor Yellow
$pendientes = Invoke-Api GET "/clientes/pendientes" -Headers $adminHeaders
Write-Host "OK - solicitudes pendientes: $($pendientes.Count)" -ForegroundColor Green

Write-Host "`n[4] GET /ordenes como ADMIN..." -ForegroundColor Yellow
$ordenesAdmin = Invoke-Api GET "/ordenes" -Headers $adminHeaders
Write-Host "OK - órdenes visibles para ADMIN: $($ordenesAdmin.Count)" -ForegroundColor Green

Write-Host "`n[5] Login CLIENTE..." -ForegroundColor Yellow
$cliente = Invoke-Api POST "/auth/login" @{
  correo_electronico = "contacto@hospitalangeles.com"
  password = "Password123!"
}
$clienteToken = $cliente.access_token
Write-Host "OK - rol: $($cliente.rol)" -ForegroundColor Green

$clienteHeaders = @{ Authorization = "Bearer $clienteToken" }

Write-Host "`n[6] GET /ordenes como CLIENTE..." -ForegroundColor Yellow
$ordenesCliente = Invoke-Api GET "/ordenes" -Headers $clienteHeaders
Write-Host "OK - órdenes visibles para CLIENTE: $($ordenesCliente.Count)" -ForegroundColor Green

if ($CrearOrdenPrueba) {
  Write-Host "`n[7] POST /ordenes - creando orden de prueba..." -ForegroundColor Yellow

  $nuevaOrden = Invoke-Api POST "/ordenes" @{
    tipo_orden = "RENTA"
    descripcion_equipo = "PRUEBA TT - Sistema de instrumentación para columna - eliminar después"
  } -Headers $clienteHeaders

  Write-Host "OK - orden creada: $($nuevaOrden.id)" -ForegroundColor Green
  Write-Host "Estado inicial: $($nuevaOrden.estado)" -ForegroundColor Green
} else {
  Write-Host "`n[7] POST /ordenes omitido. Usa -CrearOrdenPrueba para generar una orden de prueba." -ForegroundColor DarkYellow
}

Write-Host "`n=== Smoke test terminado ===" -ForegroundColor Cyan
