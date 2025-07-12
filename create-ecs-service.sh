#!/bin/bash

# Create ECS service for Words Wall backend
REGION="ap-southeast-1"
CLUSTER_NAME="words-wall-cluster"
SERVICE_NAME="words-wall-backend-service"
TASK_DEFINITION="words-wall-backend-task"

echo "🚀 Creating ECS service for Words Wall backend..."

# Get VPC and subnet information
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --region $REGION \
  --query 'Vpcs[0].VpcId' \
  --output text)

SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query 'Subnets[*].SubnetId' \
  --output text)

echo "📍 Using VPC: $VPC_ID"
echo "📍 Using Subnets: $SUBNET_IDS"

# Get or create security group
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=words-wall-ecs-sg" \
  --region $REGION \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null)

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  echo "🛡️ Creating security group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name words-wall-ecs-sg \
    --description "Security group for Words Wall ECS tasks" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --query 'GroupId' \
    --output text)
  
  # Allow HTTP traffic
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 3001 \
    --cidr 0.0.0.0/0 \
    --region $REGION
fi

echo "🛡️ Using Security Group: $SG_ID"

# Check if service already exists
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null)

if [ "$SERVICE_EXISTS" = "ACTIVE" ]; then
  echo "⚠️ Service $SERVICE_NAME already exists and is active"
  echo "Use 'aws ecs update-service' to update it or delete it first"
  exit 1
fi

# Convert subnet IDs to JSON array format
SUBNETS_JSON=$(echo $SUBNET_IDS | tr ' ' '\n' | sed 's/^/"/;s/$/"/' | paste -sd, -)

echo "🚀 Creating ECS service..."

# Create the service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition $TASK_DEFINITION \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS_JSON],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✅ Service created successfully!"
  echo ""
  echo "📋 Service Details:"
  echo "  Cluster: $CLUSTER_NAME"
  echo "  Service: $SERVICE_NAME"
  echo "  Task Definition: $TASK_DEFINITION"
  echo "  Security Group: $SG_ID"
  echo ""
  echo "⏳ Waiting for service to stabilize..."
  aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION
  
  echo "🎉 Service is now stable and running!"
else
  echo "❌ Failed to create service"
  exit 1
fi