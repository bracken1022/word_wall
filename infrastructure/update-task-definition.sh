#!/bin/bash

# Update ECS task definition to use new Ollama image
# Run this with your main AWS credentials (not pulumi-deployment user)

set -e

echo "🔄 Updating ECS task definition to use Ollama image..."

# Configuration
ECR_REPO_URI="216673926326.dkr.ecr.ap-southeast-1.amazonaws.com/words-wall-backend"
NEW_IMAGE_TAG="ubuntu-20250713-232952"  # The image we built with Ollama
FULL_IMAGE_URI="$ECR_REPO_URI:$NEW_IMAGE_TAG"

echo "📋 Configuration:"
echo "  New Image: $FULL_IMAGE_URI"
echo "  Memory: 4096 MB (increased for Ollama + Qwen model)"
echo "  CPU: 2048 (increased for AI processing)"
echo ""

# Get current task definition
echo "📥 Getting current task definition..."
CURRENT_TASK_DEF=$(aws ecs describe-task-definition --task-definition words-wall-backend-task --query 'taskDefinition')

# Create new task definition with updated image and resources
echo "📝 Creating new task definition..."

cat > ollama-task-definition.json << EOF
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
      "image": "$FULL_IMAGE_URI",
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

# Update ECS service to use new task definition
echo "🔄 Updating ECS service to use new task definition..."
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
echo "📋 View logs for Ollama startup:"
echo "aws logs tail /ecs/words-wall-backend --follow"
echo ""
echo "🎯 Look for these Ollama startup messages:"
echo "  🚀 Starting Words Wall Backend with Ollama..."
echo "  📡 Starting Ollama server..."
echo "  ✅ Ollama is ready!"
echo "  📥 Pulling Qwen3:1.7b model..."
echo "  🎯 Model ready. Starting NestJS application..."
echo ""
echo "⚠️  Note: First startup will take 3-5 minutes to download Qwen model (~1GB)"

# Cleanup
rm -f ollama-task-definition.json

echo ""
echo "🧪 After deployment completes, test with:"
echo "curl -X POST http://words-wall-alb-1491781885.ap-southeast-1.elb.amazonaws.com/stickers \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -d '{\"word\": \"amazing\", \"labelId\": 1, \"useAI\": true}'"