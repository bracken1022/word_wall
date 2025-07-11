# 🔐 GitHub Secrets Configuration

This document outlines the required GitHub Secrets for AWS ECS deployment.

## Required Secrets

### AWS Credentials
- **`AWS_ACCESS_KEY_ID`**: Your AWS access key ID
- **`AWS_SECRET_ACCESS_KEY`**: Your AWS secret access key  
- **`AWS_REGION`**: Your AWS region (e.g., `us-east-1`)

## How to Add Secrets

1. **Go to your GitHub repository**
2. **Settings** → **Secrets and variables** → **Actions**
3. **Click "New repository secret"**
4. **Add each secret with the exact name and value**

## AWS IAM Setup

### 1. Create IAM User

```bash
# Create user for GitHub Actions
aws iam create-user --user-name github-actions-words-wall
```

### 2. Create Access Keys

```bash
# Create access key for the user
aws iam create-access-key --user-name github-actions-words-wall
```

### 3. Attach Required Policies

```bash
# Attach ECR permissions
aws iam attach-user-policy \
  --user-name github-actions-words-wall \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# Attach ECS permissions
aws iam attach-user-policy \
  --user-name github-actions-words-wall \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
```

### 4. Custom Policy for Additional Permissions

Create a custom policy for IAM PassRole:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": [
                "arn:aws:iam::*:role/ecsTaskExecutionRole",
                "arn:aws:iam::*:role/ecsTaskRole"
            ]
        }
    ]
}
```

```bash
# Create custom policy
cat > github-actions-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": [
                "arn:aws:iam::*:role/ecsTaskExecutionRole",
                "arn:aws:iam::*:role/ecsTaskRole"
            ]
        }
    ]
}
EOF

# Create and attach policy
aws iam create-policy \
  --policy-name GitHubActionsECSPolicy \
  --policy-document file://github-actions-policy.json

aws iam attach-user-policy \
  --user-name github-actions-words-wall \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/GitHubActionsECSPolicy
```

## Security Best Practices

### 1. Rotate Access Keys Regularly
```bash
# Create new access key
aws iam create-access-key --user-name github-actions-words-wall

# Update GitHub secrets with new keys

# Delete old access key
aws iam delete-access-key --user-name github-actions-words-wall --access-key-id OLD_KEY_ID
```

### 2. Use Least Privilege Principle
Only grant the minimum permissions needed:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:PutImage"
            ],
            "Resource": "arn:aws:ecr:*:*:repository/words-wall-backend"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecs:UpdateService",
                "ecs:DescribeServices",
                "ecs:DescribeTaskDefinition",
                "ecs:RegisterTaskDefinition"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": [
                "arn:aws:iam::*:role/ecsTaskExecutionRole",
                "arn:aws:iam::*:role/ecsTaskRole"
            ]
        }
    ]
}
```

### 3. Monitor Access
- Enable CloudTrail for API call logging
- Set up CloudWatch alarms for unusual activity
- Review IAM access patterns regularly

## Environment-Specific Secrets

### Development/Staging (Optional)
- `AWS_ACCESS_KEY_ID_DEV`
- `AWS_SECRET_ACCESS_KEY_DEV`
- `AWS_REGION_DEV`

### Production (Required)
- `AWS_ACCESS_KEY_ID` (production credentials)
- `AWS_SECRET_ACCESS_KEY` (production credentials)
- `AWS_REGION` (production region)

## Verification

After setting up secrets, verify they work:

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test ECR access
aws ecr describe-repositories --repository-names words-wall-backend

# Test ECS access
aws ecs describe-clusters --clusters words-wall-cluster
```

## Troubleshooting

### Common Issues:

1. **Invalid credentials**: Double-check secret values
2. **Permission denied**: Review IAM policies
3. **Region mismatch**: Ensure consistent region usage
4. **ECR authentication**: Verify ECR permissions

### Debug Commands:

```bash
# Check IAM user permissions
aws iam get-user --user-name github-actions-words-wall
aws iam list-attached-user-policies --user-name github-actions-words-wall

# Test ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
```