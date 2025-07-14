#!/bin/bash

# Diagnose ECS deployment issues for Words Wall
REGION="ap-southeast-1"
CLUSTER_NAME="words-wall-cluster"
SERVICE_NAME="words-wall-backend-service"

echo "🔍 Diagnosing ECS deployment issues..."

# Check cluster status
echo "📦 Checking ECS cluster status..."
aws ecs describe-clusters \
  --clusters $CLUSTER_NAME \
  --region $REGION \
  --query 'clusters[0].{Status:status,RunningTasks:runningTasksCount,PendingTasks:pendingTasksCount,ActiveServices:activeServicesCount}'

# Check service status
echo ""
echo "🚀 Checking ECS service status..."
SERVICE_INFO=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].{Status:status,DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount,TaskDefinition:taskDefinition}')

echo $SERVICE_INFO | jq .

# Get service events (last 10)
echo ""
echo "📋 Recent service events:"
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].events[:10].{Time:createdAt,Message:message}' \
  --output table

# List tasks
echo ""
echo "📝 Checking tasks..."
TASK_ARNS=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $REGION \
  --query 'taskArns' \
  --output text)

if [ -n "$TASK_ARNS" ] && [ "$TASK_ARNS" != "None" ]; then
  echo "📊 Task details:"
  aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARNS \
    --region $REGION \
    --query 'tasks[*].{TaskArn:taskArn,LastStatus:lastStatus,DesiredStatus:desiredStatus,HealthStatus:healthStatus,StoppedReason:stoppedReason}' \
    --output table

  # Get container details
  echo ""
  echo "🐳 Container status:"
  aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARNS \
    --region $REGION \
    --query 'tasks[*].containers[*].{Name:name,Status:lastStatus,Reason:reason,ExitCode:exitCode}' \
    --output table

  # Get the first task ARN for log checking
  FIRST_TASK=$(echo $TASK_ARNS | cut -d' ' -f1)
  TASK_ID=$(basename $FIRST_TASK)
  
  echo ""
  echo "📊 CloudWatch logs for task: $TASK_ID"
  echo "Log group: /ecs/words-wall-backend"
  echo "Log stream: ecs/words-wall-backend/$TASK_ID"
  
  # Try to get recent logs
  aws logs get-log-events \
    --log-group-name /ecs/words-wall-backend \
    --log-stream-name ecs/words-wall-backend/$TASK_ID \
    --region $REGION \
    --query 'events[-20:].{Time:timestamp,Message:message}' \
    --output table 2>/dev/null || echo "❌ No logs found or log stream doesn't exist yet"

else
  echo "❌ No tasks found for this service"
fi

# Check task definition
echo ""
echo "📋 Checking task definition..."
TASK_DEF=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].taskDefinition' \
  --output text)

if [ "$TASK_DEF" != "None" ]; then
  echo "Task definition: $TASK_DEF"
  aws ecs describe-task-definition \
    --task-definition $TASK_DEF \
    --region $REGION \
    --query 'taskDefinition.{Family:family,Revision:revision,Status:status,CPU:cpu,Memory:memory}' \
    --output table
else
  echo "❌ No task definition found"
fi

echo ""
echo "🔧 Common troubleshooting steps:"
echo "1. Check if ECR image exists and is accessible"
echo "2. Verify ECS Task Execution Role has proper permissions"
echo "3. Check if Secrets Manager secrets exist and are accessible"
echo "4. Verify security group allows outbound internet access"
echo "5. Check CloudWatch logs for application errors"