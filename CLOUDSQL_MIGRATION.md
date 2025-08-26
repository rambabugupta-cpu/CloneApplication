# GCP Cloud SQL Migration Guide

## Prerequisites
1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Install PostgreSQL client tools (psql, pg_dump)
3. Have a GCP project with billing enabled

## Step 1: Setup Google Cloud CLI
```powershell
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable sqladmin.googleapis.com
gcloud services enable compute.googleapis.com
```

## Step 2: Create Cloud SQL Instance
```powershell
# Run the PowerShell script
.\scripts\create-cloudsql.ps1 -ProjectId "your-project-id"
```

## Step 3: Export Local Data
```powershell
# Export your local database
.\scripts\export-local-data.ps1
```

## Step 4: Update Environment Configuration
1. Copy the connection string from `cloudsql-connection.txt`
2. Update your `.env` file:
   ```
   DATABASE_URL=postgresql://postgres:PASSWORD@PUBLIC_IP:5432/tallyToCash?sslmode=require
   ```

## Step 5: Test Connection and Run Migrations
```powershell
# Test the connection
npm run db:push

# If successful, import your data
.\scripts\import-to-cloudsql.ps1 -CloudSqlConnectionString "YOUR_CONNECTION_STRING"
```

## Step 6: Verify Migration
```powershell
# Start your application
npm run dev

# Check that data is accessible
```

## Security Considerations

### 1. Restrict Network Access
After testing, restrict access to specific IPs:
```bash
gcloud sql instances patch tally-to-cash-db \
  --authorized-networks="YOUR_IP_ADDRESS/32"
```

### 2. Use Private IP (Recommended for Production)
```bash
# Create instance with private IP
gcloud sql instances create tally-to-cash-db-private \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --network=default \
  --no-assign-ip
```

### 3. Use Cloud SQL Proxy (Most Secure)
```bash
# Download Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64

# Run proxy
./cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:5432

# Connect via localhost
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/tallyToCash?sslmode=require
```

## Monitoring and Maintenance

### Enable Query Insights
```bash
gcloud sql instances patch tally-to-cash-db \
  --database-flags=shared_preload_libraries=pg_stat_statements
```

### Setup Alerts
- Monitor CPU usage
- Monitor memory usage
- Monitor connection count
- Monitor storage usage

## Cost Optimization
- Use `db-f1-micro` for development (free tier eligible)
- Enable storage auto-increase
- Schedule automatic backups during low-usage hours
- Consider regional persistent disks for better performance

## Backup Strategy
- Automatic backups: Enabled daily at 3 AM
- Point-in-time recovery: Available
- Manual backups before major deployments

## Troubleshooting

### Connection Issues
1. Check authorized networks
2. Verify SSL mode (require vs disable)
3. Check firewall rules
4. Verify instance is running

### Performance Issues
1. Monitor query performance
2. Check connection pooling
3. Analyze slow queries
4. Consider read replicas for high read workloads

## Next Steps
1. Setup Cloud SQL Proxy for secure connections
2. Configure connection pooling (PgBouncer)
3. Setup monitoring and alerting
4. Plan for high availability (regional persistent disks)
5. Consider read replicas for scaling
