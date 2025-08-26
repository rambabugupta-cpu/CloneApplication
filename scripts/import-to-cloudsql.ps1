# Import data to Cloud SQL
param(
    [Parameter(Mandatory=$true)]
    [string]$CloudSqlConnectionString,
    
    [string]$BackupFile = "tally-to-cash-backup.sql"
)

Write-Host "Importing data to Cloud SQL..." -ForegroundColor Green

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
    exit 1
}

try {
    # Parse connection string to get individual components
    $uri = [System.Uri]$CloudSqlConnectionString
    $dbHost = $uri.Host
    $port = $uri.Port
    $database = $uri.LocalPath.TrimStart('/')
    $userInfo = $uri.UserInfo.Split(':')
    $username = $userInfo[0]
    $password = $userInfo[1]

    # Set environment variable for password
    $env:PGPASSWORD = $password

    Write-Host "Connecting to: $dbHost" -ForegroundColor Yellow
    Write-Host "Database: $database" -ForegroundColor Yellow

    # Import data using psql
    psql -h $dbHost -p $port -U $username -d $database -f $BackupFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Data imported successfully to Cloud SQL!" -ForegroundColor Green
    } else {
        Write-Error "Failed to import data to Cloud SQL"
        exit 1
    }
} catch {
    Write-Error "Import failed: $_"
    exit 1
} finally {
    # Clear password from environment
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}
