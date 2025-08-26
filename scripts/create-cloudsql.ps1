# PowerShell script to create GCP Cloud SQL instance
param(
    [string]$ProjectId = "accountancy-469917",
    [string]$InstanceName = "tally-to-cash-db",
    [string]$Region = "us-central1",
    [string]$DatabaseName = "tallyToCash"
)

# Add gcloud to PATH
$env:PATH += ";C:\Users\ramba\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"

# Generate secure password
$Password = [System.Web.Security.Membership]::GeneratePassword(16, 4)

Write-Host "Creating Cloud SQL instance: $InstanceName" -ForegroundColor Green

try {
    # Create Cloud SQL PostgreSQL instance
    gcloud sql instances create $InstanceName `
        --database-version=POSTGRES_15 `
        --tier=db-f1-micro `
        --region=$Region `
        --storage-size=10GB `
        --storage-type=SSD `
        --storage-auto-increase `
        --backup-start-time=03:00 `
        --maintenance-window-day=SUN `
        --maintenance-window-hour=04 `
        --authorized-networks=0.0.0.0/0 `
        --assign-ip

    Write-Host "Setting database password..." -ForegroundColor Yellow

    # Set postgres user password
    gcloud sql users set-password postgres `
        --instance=$InstanceName `
        --password="$Password"

    Write-Host "Creating database: $DatabaseName" -ForegroundColor Yellow

    # Create the database
    gcloud sql databases create $DatabaseName `
        --instance=$InstanceName

    Write-Host "Getting connection details..." -ForegroundColor Yellow

    # Get the public IP
    $PublicIP = gcloud sql instances describe $InstanceName --format="value(ipAddresses[0].ipAddress)"

    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Cloud SQL Instance Created Successfully!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Instance Name: $InstanceName"
    Write-Host "Public IP: $PublicIP"
    Write-Host "Database: $DatabaseName"
    Write-Host "Username: postgres"
    Write-Host "Password: $Password"
    Write-Host ""
    Write-Host "Connection String:"
    Write-Host "postgresql://postgres:$Password@$PublicIP:5432/$DatabaseName?sslmode=require" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Green

    # Save connection info to file
    $ConnectionInfo = @"
Instance Name: $InstanceName
Public IP: $PublicIP
Database: $DatabaseName
Username: postgres
Password: $Password
Connection String: postgresql://postgres:$Password@$PublicIP:5432/$DatabaseName?sslmode=require
"@

    $ConnectionInfo | Out-File -FilePath "cloudsql-connection.txt" -Encoding UTF8
    Write-Host "Connection details saved to: cloudsql-connection.txt" -ForegroundColor Green

} catch {
    Write-Error "Failed to create Cloud SQL instance: $_"
    exit 1
}
