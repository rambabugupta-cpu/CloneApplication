#!/bin/bash

# Configuration
INSTANCE_NAME="tally-to-cash-db"
PROJECT_ID="your-project-id"  # Replace with your actual project ID
REGION="us-central1"         # Choose your preferred region
DATABASE_NAME="tallyToCash"
DB_PASSWORD="$(openssl rand -base64 32)"  # Generate secure password

echo "Creating Cloud SQL instance: $INSTANCE_NAME"

# Create Cloud SQL PostgreSQL instance
gcloud sql instances create $INSTANCE_NAME \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-size=10GB \
    --storage-type=SSD \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=04 \
    --authorized-networks=0.0.0.0/0 \
    --assign-ip

echo "Setting database password..."

# Set postgres user password
gcloud sql users set-password postgres \
    --instance=$INSTANCE_NAME \
    --password="$DB_PASSWORD"

echo "Creating database: $DATABASE_NAME"

# Create the database
gcloud sql databases create $DATABASE_NAME \
    --instance=$INSTANCE_NAME

echo "Getting connection details..."

# Get the public IP
PUBLIC_IP=$(gcloud sql instances describe $INSTANCE_NAME --format="value(ipAddresses[0].ipAddress)")

echo "========================================="
echo "Cloud SQL Instance Created Successfully!"
echo "========================================="
echo "Instance Name: $INSTANCE_NAME"
echo "Public IP: $PUBLIC_IP"
echo "Database: $DATABASE_NAME"
echo "Username: postgres"
echo "Password: $DB_PASSWORD"
echo ""
echo "Connection String:"
echo "postgresql://postgres:$DB_PASSWORD@$PUBLIC_IP:5432/$DATABASE_NAME?sslmode=require"
echo "========================================="

# Save connection info to file
cat > cloudsql-connection.txt << EOF
Instance Name: $INSTANCE_NAME
Public IP: $PUBLIC_IP
Database: $DATABASE_NAME
Username: postgres
Password: $DB_PASSWORD
Connection String: postgresql://postgres:$DB_PASSWORD@$PUBLIC_IP:5432/$DATABASE_NAME?sslmode=require
EOF

echo "Connection details saved to: cloudsql-connection.txt"
