#!/bin/bash

# Quick redeploy with main AWS credentials
set -e

echo "🚀 Quick deploying Ollama backend..."

ECR_REPO_URI="216673926326.dkr.ecr.ap-southeast-1.amazonaws.com/words-wall-backend"
IMAGE_TAG="ubuntu-$(date +%Y%m%d-%H%M%S)"

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 216673926326.dkr.ecr.ap-southeast-1.amazonaws.com

echo "🏷️ Tagging and pushing image..."
docker tag words-wall-backend:latest $ECR_REPO_URI:$IMAGE_TAG
docker push $ECR_REPO_URI:$IMAGE_TAG

echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster words-wall-cluster \
  --service words-wall-backend-service \
  --force-new-deployment

echo "✅ Deployment initiated!"