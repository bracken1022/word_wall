#!/bin/bash

# View ECS logs to see Qwen responses
# Run this with your main AWS credentials

set -e

echo "📋 Getting ECS task information..."

# Get the running task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster words-wall-cluster \
  --service-name words-wall-backend-service \
  --query 'taskArns[0]' \
  --output text)

echo "🔍 Current task: $TASK_ARN"

# Get task ID from ARN
TASK_ID=${TASK_ARN##*/}
echo "📝 Task ID: $TASK_ID"

# View logs
echo ""
echo "🔎 Viewing recent logs (look for Qwen responses)..."
echo "=============================================="

aws logs tail /ecs/words-wall-backend --follow --since 10m

echo ""
echo "💡 To see specific Qwen responses, look for:"
echo "   === RAW QWEN RESPONSE ==="
echo "   🤖 Using Qwen3:1.7b model"
echo "   ✅ Qwen local generation successful"