# Export local PostgreSQL data
param(
    [string]$LocalHost = "localhost",
    [string]$LocalPort = "5432",
    [string]$LocalUser = "postgres",
    [string]$LocalDatabase = "tallyToCash",
    [string]$BackupFile = "tally-to-cash-backup.sql"
)

Write-Host "Exporting data from local PostgreSQL database..." -ForegroundColor Green

# Set PGPASSWORD environment variable (you'll be prompted for password)
$env:PGPASSWORD = Read-Host "Enter your local PostgreSQL password" -AsSecureString | ConvertFrom-SecureString

try {
    # Export data using pg_dump
    pg_dump -h $LocalHost -p $LocalPort -U $LocalUser -d $LocalDatabase -f $BackupFile --verbose

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Data exported successfully to: $BackupFile" -ForegroundColor Green
        Write-Host "File size: $((Get-Item $BackupFile).Length / 1MB) MB" -ForegroundColor Yellow
    } else {
        Write-Error "Failed to export data from local database"
        exit 1
    }
} catch {
    Write-Error "Export failed: $_"
    exit 1
} finally {
    # Clear password from environment
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}
