#!/bin/bash

# Create Application Load Balancer for backend
REGION="ap-southeast-1"
CLUSTER_NAME="words-wall-cluster"
SERVICE_NAME="words-wall-backend-service"

echo "⚖️ Creating Application Load Balancer for backend..."

# Get VPC and subnet information
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --region $REGION \
  --query 'Vpcs[0].VpcId' \
  --output text)

PUBLIC_SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" \
  --region $REGION \
  --query 'Subnets[*].SubnetId' \
  --output text)

echo "📍 Using VPC: $VPC_ID"
echo "📍 Using Public Subnets: $PUBLIC_SUBNET_IDS"

# Create security group for ALB
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name words-wall-alb-sg \
  --description "Security group for Words Wall Application Load Balancer" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=words-wall-alb-sg" \
    --region $REGION \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "🛡️ ALB Security Group: $ALB_SG_ID"

# Allow HTTP and HTTPS traffic to ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "HTTP rule may already exist"

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "HTTPS rule may already exist"

# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name words-wall-alb \
  --subnets $PUBLIC_SUBNET_IDS \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "⚖️ ALB Created: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "🌐 ALB DNS: $ALB_DNS"

# Create target group
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name words-wall-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-interval-seconds 30 \
  --health-check-path /health \
  --health-check-protocol HTTP \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "🎯 Target Group Created: $TARGET_GROUP_ARN"

# Create ALB listener
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region $REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "👂 Listener Created: $LISTENER_ARN"

# Update ECS security group to allow traffic from ALB
ECS_SG_ID=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups[0]' \
  --output text)

echo "🛡️ ECS Security Group: $ECS_SG_ID"

# Allow ALB to reach ECS on port 3001
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3001 \
  --source-group $ALB_SG_ID \
  --region $REGION 2>/dev/null || echo "ALB to ECS rule may already exist"

echo ""
echo "✅ Application Load Balancer setup complete!"
echo ""
echo "📋 ALB Details:"
echo "  ALB ARN: $ALB_ARN"
echo "  ALB DNS: $ALB_DNS"
echo "  Target Group ARN: $TARGET_GROUP_ARN"
echo "  ALB Security Group: $ALB_SG_ID"
echo ""
echo "🔗 Backend API URL: http://$ALB_DNS"
echo ""
echo "🚀 Next Steps:"
echo "1. Update ECS service to use target group"
echo "2. Remove public IP from ECS tasks"
echo "3. Update frontend to use ALB endpoint"
echo "4. Test the integration"
echo ""
echo "💾 Save these values:"
echo "  ALB_DNS=\"$ALB_DNS\""
echo "  TARGET_GROUP_ARN=\"$TARGET_GROUP_ARN\""