#!/bin/bash

# Test the deployed backend
REGION="ap-southeast-1"
CLUSTER_NAME="words-wall-cluster"
SERVICE_NAME="words-wall-backend-service"

echo "🔍 Finding your backend public IP..."

# Get running task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $REGION \
  --query 'taskArns[0]' \
  --output text)

if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ No running tasks found"
  exit 1
fi

echo "📋 Task ARN: $TASK_ARN"

# Get task details including network interface
NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region $REGION \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

if [ -z "$NETWORK_INTERFACE" ]; then
  echo "❌ Could not find network interface"
  exit 1
fi

echo "🌐 Network Interface: $NETWORK_INTERFACE"

# Get public IP from network interface
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region $REGION \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

if [ "$PUBLIC_IP" = "None" ] || [ -z "$PUBLIC_IP" ]; then
  echo "❌ No public IP found. Check if 'Assign Public IP' is enabled."
  exit 1
fi

echo "🎉 Found your backend!"
echo "📍 Public IP: $PUBLIC_IP"
echo "🔗 Backend URL: http://$PUBLIC_IP:3001"
echo ""

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "http://$PUBLIC_IP:3001/health" || echo "❌ Health check failed"

echo ""
echo "🧪 Test other endpoints:"
echo "curl http://$PUBLIC_IP:3001/health"
echo "curl http://$PUBLIC_IP:3001/api/stickers"
echo "curl http://$PUBLIC_IP:3001/api/words"
echo ""

# Check if service is accessible from browser
echo "🌐 Open in browser:"
echo "http://$PUBLIC_IP:3001/health"