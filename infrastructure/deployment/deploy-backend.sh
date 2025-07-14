#!/bin/bash

# Deploy backend using task definition updates
# This script is separate from Pulumi and focuses only on backend deployments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_DEF_DIR="$SCRIPT_DIR/../task-definitions"
PROJECT_ROOT="$SCRIPT_DIR/../../.."

# Default values
IMAGE_TAG="latest"
CLUSTER_NAME="words-wall-production-cluster"
SERVICE_NAME="words-wall-backend-service"
TASK_FAMILY="words-wall-backend-task"
ECR_REPO="216673926326.dkr.ecr.ap-southeast-1.amazonaws.com/words-wall-backend"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        --service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --build)
            BUILD_IMAGE=true
            shift
            ;;
        --push)
            PUSH_IMAGE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --image-tag TAG    Docker image tag (default: latest)"
            echo "  --cluster NAME     ECS cluster name"
            echo "  --service NAME     ECS service name"
            echo "  --build           Build Docker image before deployment"
            echo "  --push            Push Docker image to ECR"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

echo "🚀 Deploying Words Wall Backend"
echo "================================"
echo "Image Tag: $IMAGE_TAG"
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo ""

# Function to build Docker image
build_image() {
    echo "🔨 Building Docker image..."
    cd "$PROJECT_ROOT/backend"
    
    # Build with correct architecture for AWS Fargate
    docker build --platform linux/amd64 -t "$ECR_REPO:$IMAGE_TAG" .
    echo "✅ Docker image built successfully"
}

# Function to push image to ECR
push_image() {
    echo "📤 Pushing image to ECR..."
    
    # Login to ECR
    aws ecr get-login-password --region ap-southeast-1 | \
        docker login --username AWS --password-stdin 216673926326.dkr.ecr.ap-southeast-1.amazonaws.com
    
    # Push image
    docker push "$ECR_REPO:$IMAGE_TAG"
    echo "✅ Image pushed successfully"
}

# Function to update task definition
update_task_definition() {
    echo "📋 Updating ECS task definition..."
    
    # Read base task definition
    TASK_DEF_FILE="$TASK_DEF_DIR/backend-task-definition.json"
    
    if [[ ! -f "$TASK_DEF_FILE" ]]; then
        echo "❌ Task definition file not found: $TASK_DEF_FILE"
        exit 1
    fi
    
    # Update image in task definition
    TEMP_TASK_DEF=$(mktemp)
    jq --arg image "$ECR_REPO:$IMAGE_TAG" \
       '.containerDefinitions[0].image = $image' \
       "$TASK_DEF_FILE" > "$TEMP_TASK_DEF"
    
    # Register new task definition
    NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
        --cli-input-json file://"$TEMP_TASK_DEF" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    echo "✅ New task definition registered: $NEW_TASK_DEF_ARN"
    
    # Cleanup
    rm -f "$TEMP_TASK_DEF"
    
    echo "$NEW_TASK_DEF_ARN"
}

# Function to update ECS service
update_service() {
    local task_def_arn="$1"
    
    echo "🔄 Updating ECS service..."
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --task-definition "$task_def_arn" \
        --force-new-deployment \
        --output table
        
    echo "✅ ECS service update initiated"
}

# Function to wait for deployment
wait_for_deployment() {
    echo "⏳ Waiting for deployment to complete..."
    
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME"
        
    echo "✅ Deployment completed successfully!"
}

# Function to show logs
show_logs() {
    echo "📋 Recent logs:"
    aws logs tail /ecs/words-wall-backend --since 5m | tail -20
}

# Main deployment process
main() {
    # Build image if requested
    if [[ "$BUILD_IMAGE" == "true" ]]; then
        build_image
    fi
    
    # Push image if requested
    if [[ "$PUSH_IMAGE" == "true" ]]; then
        push_image
    fi
    
    # Update task definition
    TASK_DEF_ARN=$(update_task_definition)
    
    # Update service
    update_service "$TASK_DEF_ARN"
    
    # Wait for deployment
    wait_for_deployment
    
    # Show recent logs
    show_logs
    
    echo ""
    echo "🎉 Backend deployment completed!"
    echo "Monitor logs: aws logs tail /ecs/words-wall-backend --follow"
    echo "Check service: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME"
}

# Check dependencies
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

# Run main deployment
main