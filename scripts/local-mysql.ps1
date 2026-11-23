param(
  [string]$MySqlBin = 'C:\wamp64\bin\mysql\mysql8.4.7\bin',
  [ValidateRange(1024, 65535)][int]$Port = 33316
)

$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$local = Join-Path $project '.local'
$data = Join-Path $local 'mysql'
$defaults = Join-Path $local 'mysql.cnf'
$envFile = Join-Path $project '.env.local'
$server = Join-Path $MySqlBin 'mysqld.exe'
$client = Join-Path $MySqlBin 'mysql.exe'
if (!(Test-Path -LiteralPath $server) -or !(Test-Path -LiteralPath $client)) {
  throw 'Pass -MySqlBin with the directory containing MySQL 8.4 executables.'
}

function New-LocalSecret {
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $bytes = [byte[]]::new(24)
    $random.GetBytes($bytes)
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
  } finally { $random.Dispose() }
}
function Read-LocalPort {
  $socket = [Net.Sockets.TcpClient]::new()
  try { $socket.Connect('127.0.0.1', $Port); return $true }
  catch { return $false }
  finally { $socket.Dispose() }
}

[IO.Directory]::CreateDirectory($local) | Out-Null
$utf8 = [Text.UTF8Encoding]::new($false)
$initialize = !(Test-Path -LiteralPath (Join-Path $data 'mysql'))
if ($initialize) {
  if ((Test-Path -LiteralPath $envFile) -or (Test-Path -LiteralPath $defaults) -or (Read-LocalPort)) {
    throw 'The local MySQL setup needs an unused port and a checkout without .env.local. Use the existing database configuration or choose a clean checkout.'
  }
  [IO.Directory]::CreateDirectory($data) | Out-Null
  if ((Get-ChildItem -LiteralPath $data -Force | Measure-Object).Count) { throw 'The MySQL data folder must be empty for initialization.' }
  & $server --no-defaults --initialize-insecure "--datadir=$data" "--log-error=$local/mysql-init.log"
  if ($LASTEXITCODE -ne 0) { throw "MySQL initialization failed. See $local\mysql-init.log." }
  $password = New-LocalSecret
  $rootPassword = New-LocalSecret
  $init = Join-Path $local 'mysql-init.sql'
  $sql = @(
    "ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword';"
    "CREATE DATABASE tuition_desk CHARACTER SET utf8mb4;"
    "CREATE USER 'tuition'@'127.0.0.1' IDENTIFIED BY '$password';"
    "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES, INDEX ON tuition_desk.* TO 'tuition'@'127.0.0.1';"
  ) -join "`n"
  [IO.File]::WriteAllText($init, $sql, $utf8)
  [IO.File]::WriteAllLines($defaults, [string[]]@('[client]', 'host=127.0.0.1', "port=$Port", 'user=tuition', "password=$password"), $utf8)
} elseif (!(Test-Path -LiteralPath $defaults) -or !(Test-Path -LiteralPath $envFile)) {
  throw 'Local MySQL configuration is incomplete. Inspect the initialization and server logs in .local.'
}

if (!(Read-LocalPort)) {
  $args = @('--no-defaults', '--bind-address=127.0.0.1', '--mysqlx=OFF', "--port=$Port", "--datadir=`"$data`"", "--log-error=`"$local/mysql-server.log`"")
  if ($initialize) { $args += "--init-file=`"$init`"" }
  $process = Start-Process -FilePath $server -ArgumentList $args -PassThru -WindowStyle Hidden
}

for ($attempt = 0; $attempt -lt 40; $attempt++) {
  if (Read-LocalPort) { break }
  if ($process -and $process.HasExited) { throw "MySQL stopped. See $local\mysql-server.log." }
  Start-Sleep -Milliseconds 250
}
$check = & $client "--defaults-file=$defaults" --connect-timeout=2 --batch --skip-column-names tuition_desk -e 'SELECT 1'
if ($LASTEXITCODE -ne 0 -or $check -ne '1') { throw "Could not connect to the local MySQL database. See $local\mysql-server.log." }

if ($initialize) {
  Remove-Item -LiteralPath $init
  [IO.File]::WriteAllLines($envFile, [string[]]@("DATABASE_URL=mysql://tuition:${password}@127.0.0.1:${Port}/tuition_desk", 'APP_ORIGIN=http://localhost:3000'), $utf8)
}
Push-Location -LiteralPath $project
try {
  npm run db:migrate
  if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
} finally { Pop-Location }
Write-Output "MySQL is ready at 127.0.0.1:$Port."
