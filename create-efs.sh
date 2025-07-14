#!/bin/bash

# Create EFS file system for Words Wall
REGION="ap-southeast-1"

echo "Creating EFS file system..."
EFS_ID=$(aws efs create-file-system \
  --region $REGION \
  --performance-mode generalPurpose \
  --throughput-mode provisioned \
  --provisioned-throughput-in-mibps 1 \
  --encrypted \
  --tags Key=Name,Value=words-wall-efs \
  --query 'FileSystemId' \
  --output text)

echo "EFS File System ID: $EFS_ID"

# Wait for file system to be available
echo "Waiting for file system to be available..."
aws efs wait file-system-available --file-system-id $EFS_ID --region $REGION

# Get default VPC
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --region $REGION \
  --query 'Vpcs[0].VpcId' \
  --output text)

echo "Using VPC: $VPC_ID"

# Get subnets
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query 'Subnets[*].SubnetId' \
  --output text)

# Create security group for EFS
SG_ID=$(aws ec2 create-security-group \
  --group-name words-wall-efs-sg \
  --description "Security group for Words Wall EFS" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text)

echo "Security Group ID: $SG_ID"

# Allow NFS traffic
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 2049 \
  --source-group $SG_ID \
  --region $REGION

# Create mount targets
for subnet in $SUBNETS; do
  echo "Creating mount target in subnet: $subnet"
  aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $subnet \
    --security-groups $SG_ID \
    --region $REGION
done

# Wait for mount targets
echo "Waiting for mount targets..."
sleep 30

# Create access points
echo "Creating database access point..."
DB_AP_ID=$(aws efs create-access-point \
  --file-system-id $EFS_ID \
  --posix-user Uid=1001,Gid=1001 \
  --root-directory Path=/database,CreationInfo='{OwnerUid=1001,OwnerGid=1001,Permissions=755}' \
  --tags Key=Name,Value=words-wall-db \
  --region $REGION \
  --query 'AccessPointId' \
  --output text)

echo "Database Access Point ID: $DB_AP_ID"

echo "Creating uploads access point..."
UPLOADS_AP_ID=$(aws efs create-access-point \
  --file-system-id $EFS_ID \
  --posix-user Uid=1001,Gid=1001 \
  --root-directory Path=/uploads,CreationInfo='{OwnerUid=1001,OwnerGid=1001,Permissions=755}' \
  --tags Key=Name,Value=words-wall-uploads \
  --region $REGION \
  --query 'AccessPointId' \
  --output text)

echo "Uploads Access Point ID: $UPLOADS_AP_ID"

echo ""
echo "=== EFS Setup Complete ==="
echo "EFS File System ID: $EFS_ID"
echo "Database Access Point ID: $DB_AP_ID"
echo "Uploads Access Point ID: $UPLOADS_AP_ID"
echo "Security Group ID: $SG_ID"
echo ""
echo "Update your task definition with these values!"