#!/bin/bash

# Update ECS Service to use Application Load Balancer
# Run this script with your main AWS credentials (not the pulumi-deployment user)

set -e

echo "🔄 Updating ECS service to use ALB and private networking..."

# Get Pulumi outputs
export PULUMI_CONFIG_PASSPHRASE=words-wall-local
TARGET_GROUP_ARN=$(pulumi stack output targetGroupArn)
ECS_SECURITY_GROUP=$(pulumi stack output ecsSecurityGroupId)
SUBNET1="subnet-0b34f8bc3d382ab20"
SUBNET2="subnet-0201a51c62c893769" 
SUBNET3="subnet-09004dce4a5d58831"

echo "📋 Configuration:"
echo "  Target Group: $TARGET_GROUP_ARN"
echo "  Security Group: $ECS_SECURITY_GROUP"
echo "  Subnets: $SUBNET1,$SUBNET2,$SUBNET3"

# Update the ECS service
echo "🚀 Updating ECS service..."

aws ecs update-service \
  --cluster words-wall-cluster \
  --service words-wall-backend-service \
  --task-definition words-wall-backend-task:18 \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2,$SUBNET3],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=words-wall-backend,containerPort=3001" \
  --force-new-deployment

echo "✅ ECS service update initiated!"
echo ""
echo "🔍 Monitor the deployment:"
echo "aws ecs describe-services --cluster words-wall-cluster --services words-wall-backend-service --query 'services[0].deployments'"
echo ""
echo "🌐 Test ALB after deployment completes:"
echo "curl http://$(pulumi stack output albDnsName)/health"