#!/bin/bash

# Simple ECS task definition update without reading current definition
# Run this with the pulumi-deployment user

set -e

echo "🔄 Creating new ECS task definition with Ollama image..."

# Configuration
ECR_REPO_URI="216673926326.dkr.ecr.ap-southeast-1.amazonaws.com/words-wall-backend"
NEW_IMAGE_TAG="ubuntu-20250713-232952"
FULL_IMAGE_URI="$ECR_REPO_URI:$NEW_IMAGE_TAG"

echo "📋 Configuration:"
echo "  New Image: $FULL_IMAGE_URI"
echo "  Memory: 4096 MB (for Ollama + Qwen)"
echo "  CPU: 2048 (for AI processing)"
echo ""

# Create new task definition directly
echo "📝 Creating task definition..."

cat > ollama-task-definition.json << 'EOF'
{
  "family": "words-wall-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::216673926326:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::216673926326:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "words-wall-backend",
      "image": "216673926326.dkr.ecr.ap-southeast-1.amazonaws.com/words-wall-backend:ubuntu-20250713-232952",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/words-wall-backend",
          "awslogs-region": "ap-southeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3001"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:216673926326:secret:JWT_SECRET"
        },
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:216673926326:secret:DATABASE_URL"
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3001/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 120
      }
    }
  ]
}
EOF

# Register new task definition
echo "📋 Registering new task definition..."
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://ollama-task-definition.json --query 'taskDefinition.taskDefinitionArn' --output text)

echo "✅ New task definition registered: $NEW_TASK_DEF_ARN"

# Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster words-wall-cluster \
  --service words-wall-backend-service \
  --task-definition "$NEW_TASK_DEF_ARN" \
  --force-new-deployment

echo "✅ ECS service update initiated!"
echo ""
echo "🎯 Monitor logs for Ollama startup:"
echo "aws logs tail /ecs/words-wall-backend --follow"
echo ""
echo "⏳ First startup will take 5-10 minutes to download Qwen model"

# Cleanup
rm -f ollama-task-definition.json