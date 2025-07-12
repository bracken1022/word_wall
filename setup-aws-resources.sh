#!/bin/bash

# Setup AWS resources for Words Wall deployment
REGION="ap-southeast-1"
CLUSTER_NAME="words-wall-cluster"
SERVICE_NAME="words-wall-backend-service"
LOG_GROUP="/ecs/words-wall-backend"

echo "🚀 Setting up AWS resources for Words Wall..."

# Create ECS cluster
echo "📦 Creating ECS cluster..."
aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  --region $REGION

# Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group \
  --log-group-name $LOG_GROUP \
  --region $REGION || echo "Log group may already exist"

# Get default VPC and subnets
echo "🌐 Getting VPC information..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --region $REGION \
  --query 'Vpcs[0].VpcId' \
  --output text)

SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region $REGION \
  --query 'Subnets[*].SubnetId' \
  --output text | tr '\t' ',')

echo "📍 Using VPC: $VPC_ID"
echo "📍 Using Subnets: $SUBNET_IDS"

# Create security group for ECS tasks
echo "🛡️ Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name words-wall-ecs-sg \
  --description "Security group for Words Wall ECS tasks" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=words-wall-ecs-sg" \
    --region $REGION \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "🛡️ Security Group ID: $SG_ID"

# Allow inbound HTTP traffic
echo "🔓 Configuring security group rules..."
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "Rule may already exist"

# Allow HTTPS traffic
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "Rule may already exist"

echo ""
echo "✅ AWS Resources Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  ECS Cluster: $CLUSTER_NAME"
echo "  Log Group: $LOG_GROUP"
echo "  VPC: $VPC_ID"
echo "  Subnets: $SUBNET_IDS"
echo "  Security Group: $SG_ID"
echo ""
echo "🔧 Next Steps:"
echo "1. Register your task definition"
echo "2. Create ECS service"
echo "3. Deploy your application"
echo ""
echo "📝 Save these values for your deployment configuration!"