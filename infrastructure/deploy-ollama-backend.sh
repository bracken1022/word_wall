#!/bin/bash

# Deploy backend with Ollama integration
# Run this with your main AWS credentials

set -e

echo "🚀 Deploying backend with Ollama + Qwen integration..."

# Get ECR repository URI
ECR_REPO_URI="216673926326.dkr.ecr.ap-southeast-1.amazonaws.com/words-wall-backend"
IMAGE_TAG="ollama-$(date +%Y%m%d-%H%M%S)"

echo "📋 Configuration:"
echo "  ECR Repository: $ECR_REPO_URI"
echo "  Image Tag: $IMAGE_TAG"
echo ""

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 216673926326.dkr.ecr.ap-southeast-1.amazonaws.com

# Tag and push image
echo "🏷️ Tagging image..."
docker tag words-wall-backend:latest $ECR_REPO_URI:$IMAGE_TAG
docker tag words-wall-backend:latest $ECR_REPO_URI:latest

echo "📤 Pushing to ECR..."
docker push $ECR_REPO_URI:$IMAGE_TAG
docker push $ECR_REPO_URI:latest

# Update ECS task definition
echo "📝 Creating new task definition with Ollama..."

# Get current task definition
CURRENT_TASK_DEF=$(aws ecs describe-task-definition --task-definition words-wall-backend-task --query 'taskDefinition')

# Create new task definition JSON with updated image
cat > new-task-definition.json << EOF
{
  "family": "words-wall-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "3072",
  "executionRoleArn": "arn:aws:iam::216673926326:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::216673926326:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "words-wall-backend",
      "image": "$ECR_REPO_URI:$IMAGE_TAG",
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
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register new task definition
echo "📋 Registering new task definition..."
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://new-task-definition.json --query 'taskDefinition.taskDefinitionArn' --output text)

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
echo "🔍 Monitor the deployment:"
echo "aws ecs describe-services --cluster words-wall-cluster --services words-wall-backend-service --query 'services[0].deployments'"
echo ""
echo "📋 View logs:"
echo "aws logs tail /ecs/words-wall-backend --follow"
echo ""
echo "🎯 Look for these Qwen-related log messages:"
echo "  📡 Starting Ollama server..."
echo "  📥 Pulling Qwen3:1.7b model..."
echo "  🤖 Using Qwen3:1.7b model for local generation"
echo "  === RAW QWEN RESPONSE ==="

# Cleanup
rm -f new-task-definition.json