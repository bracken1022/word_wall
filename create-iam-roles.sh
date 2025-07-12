#!/bin/bash

# Create IAM roles for ECS tasks
REGION="ap-southeast-1"
ACCOUNT_ID="216673926326"

echo "🔐 Creating IAM roles for ECS tasks..."

# Create trust policy for ECS tasks
cat > ecs-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

echo "📝 Creating ECS Task Execution Role..."

# Create ECS Task Execution Role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-trust-policy.json \
  --region $REGION || echo "Role may already exist"

# Attach managed policy for ECS Task Execution
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region $REGION

# Create custom policy for Secrets Manager access
cat > secrets-manager-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": [
                "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:words-wall/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters"
            ],
            "Resource": [
                "arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/words-wall/*"
            ]
        }
    ]
}
EOF

# Create the custom policy
aws iam create-policy \
  --policy-name WordsWallSecretsPolicy \
  --policy-document file://secrets-manager-policy.json \
  --region $REGION || echo "Policy may already exist"

# Attach custom policy to execution role
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/WordsWallSecretsPolicy \
  --region $REGION

echo "📝 Creating ECS Task Role..."

# Create ECS Task Role (for application permissions)
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file://ecs-trust-policy.json \
  --region $REGION || echo "Role may already exist"

# Create task role policy (minimal permissions for the application)
cat > task-role-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/ecs/words-wall-backend:*"
            ]
        }
    ]
}
EOF

# Create the task role policy
aws iam create-policy \
  --policy-name WordsWallTaskRolePolicy \
  --policy-document file://task-role-policy.json \
  --region $REGION || echo "Policy may already exist"

# Attach policy to task role
aws iam attach-role-policy \
  --role-name ecsTaskRole \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/WordsWallTaskRolePolicy \
  --region $REGION

# Clean up temporary files
rm -f ecs-trust-policy.json secrets-manager-policy.json task-role-policy.json

echo ""
echo "✅ IAM roles created successfully!"
echo ""
echo "📋 Created roles:"
echo "  ecsTaskExecutionRole - For ECS to pull images and get secrets"
echo "  ecsTaskRole - For application runtime permissions"
echo ""
echo "🔗 Role ARNs:"
echo "  Task Execution: arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole"
echo "  Task Role: arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskRole"
echo ""
echo "⏳ Wait a few minutes for IAM propagation, then retry deployment"