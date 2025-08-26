# Quick Cloud SQL Setup Commands
# Run these commands one by one in your PowerShell terminal

# 1. Add gcloud to PATH (run this first)
$env:PATH += ";C:\Users\ramba\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"

# 2. Create Cloud SQL instance (this takes 3-5 minutes)
gcloud sql instances create tally-to-cash-db `
  --database-version=POSTGRES_15 `
  --tier=db-f1-micro `
  --region=us-central1 `
  --storage-size=10GB `
  --storage-type=SSD `
  --storage-auto-increase `
  --backup-start-time=03:00 `
  --authorized-networks=0.0.0.0/0 `
  --assign-ip

# 3. Generate a secure password
$Password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object {[char]$_})
Write-Host "Generated Password: $Password"

# 4. Set postgres user password
gcloud sql users set-password postgres --instance=tally-to-cash-db --password="$Password"

# 5. Create the database
gcloud sql databases create tallyToCash --instance=tally-to-cash-db

# 6. Get the public IP
$PublicIP = gcloud sql instances describe tally-to-cash-db --format="value(ipAddresses[0].ipAddress)"

# 7. Display connection string
$ConnectionString = "postgresql://postgres:$Password@$PublicIP:5432/tallyToCash?sslmode=require"
Write-Host "Connection String: $ConnectionString"

# 8. Save to file
@"
Instance Name: tally-to-cash-db
Public IP: $PublicIP
Database: tallyToCash
Username: postgres
Password: $Password
Connection String: $ConnectionString
"@ | Out-File -FilePath "cloudsql-connection.txt"

Write-Host "Connection details saved to: cloudsql-connection.txt"
