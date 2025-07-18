#!/bin/bash

# Add Secrets Manager permissions to existing ecsTaskExecutionRole
REGION="ap-southeast-1"
ACCOUNT_ID="216673926326"
ROLE_NAME="ecsTaskExecutionRole"

echo "🔐 Adding Secrets Manager and ECR permissions to $ROLE_NAME..."

# Create the policy document
cat > secrets-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": [
                "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:DATABASE_URL*",
                "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:JWT_SECRET*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Add the inline policy to the role
aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name WordsWallSecretsManagerAccess \
  --policy-document file://secrets-policy.json \
  --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Secrets Manager and ECR permissions added successfully!"
    echo ""
    echo "📋 Policy added to role: $ROLE_NAME"
    echo "🔑 Secrets access: arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:DATABASE_URL* and JWT_SECRET*"
    echo "🐳 ECR access: Full read access to pull Docker images"
    echo ""
    echo "⏳ Wait a few minutes for IAM propagation, then restart your ECS service:"
    echo "   aws ecs update-service --cluster words-wall-cluster --service words-wall-backend-service --force-new-deployment --region $REGION"
else
    echo "❌ Failed to add permissions. Check if role exists and you have permissions."
fi

# Clean up
rm -f secrets-policy.json