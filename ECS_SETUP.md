# 🚀 AWS ECS Deployment Setup

This guide will help you set up AWS ECS deployment for the Words Wall backend.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker Desktop installed

## Step 1: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository --repository-name words-wall-backend --region us-east-1

# Get the repository URI (save this for later)
aws ecr describe-repositories --repository-names words-wall-backend --region us-east-1
```

## Step 2: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name words-wall-cluster --region us-east-1
```

## Step 3: Create IAM Roles

### ECS Task Execution Role
```bash
# Create trust policy file
cat > ecs-task-execution-trust-policy.json << 'EOF'
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

# Create the role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-trust-policy.json

# Attach the managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### ECS Task Role (optional, for additional permissions)
```bash
# Create task role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file://ecs-task-execution-trust-policy.json
```

## Step 4: Create CloudWatch Log Group

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/words-wall-backend --region us-east-1
```

## Step 5: Update Task Definition

1. Open `ecs-task-definition.json`
2. Replace the following placeholders:
   - `YOUR_ACCOUNT_ID`: Your AWS account ID
   - `YOUR_REGION`: Your AWS region (e.g., `us-east-1`)

## Step 6: Register Task Definition

```bash
# Register the task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region us-east-1
```

## Step 7: Create ECS Service

```bash
# Create VPC and security group first (if not exists)
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)

# Get subnet IDs
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text)

# Create security group
aws ec2 create-security-group \
  --group-name words-wall-sg \
  --description "Security group for Words Wall backend" \
  --vpc-id $VPC_ID

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=words-wall-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Allow inbound traffic on port 3001
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0

# Create ECS service
aws ecs create-service \
  --cluster words-wall-cluster \
  --service-name words-wall-backend-service \
  --task-definition words-wall-backend:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region us-east-1
```

## Step 8: Set Up GitHub Secrets

In your GitHub repository settings, add these secrets:

### Required Secrets:
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `AWS_REGION`: Your AWS region (e.g., `us-east-1`)

### Optional Secrets (if different from defaults):
- `ECS_CLUSTER_NAME`: `words-wall-cluster`
- `ECS_SERVICE_NAME`: `words-wall-backend-service`

## Step 9: Test Deployment

1. Push changes to main branch
2. GitHub Actions will automatically:
   - Build the Docker image
   - Push to ECR
   - Update ECS service
   - Wait for deployment to complete

## Monitoring

### Check ECS Service Status
```bash
aws ecs describe-services \
  --cluster words-wall-cluster \
  --services words-wall-backend-service \
  --region us-east-1
```

### View CloudWatch Logs
```bash
aws logs get-log-events \
  --log-group-name /ecs/words-wall-backend \
  --log-stream-name ecs/words-wall-backend/TASK_ID \
  --region us-east-1
```

## Troubleshooting

### Common Issues:

1. **Task fails to start**: Check CloudWatch logs for errors
2. **Security group issues**: Ensure port 3001 is open
3. **IAM permissions**: Verify ECS task execution role has proper permissions
4. **ECR authentication**: Ensure GitHub Actions can access ECR

### Useful Commands:

```bash
# List running tasks
aws ecs list-tasks --cluster words-wall-cluster --region us-east-1

# Describe task details
aws ecs describe-tasks --cluster words-wall-cluster --tasks TASK_ARN --region us-east-1

# Force new deployment
aws ecs update-service \
  --cluster words-wall-cluster \
  --service words-wall-backend-service \
  --force-new-deployment \
  --region us-east-1
```

## Cost Optimization

- Use spot instances for development
- Set up auto-scaling based on CPU/memory usage
- Monitor CloudWatch metrics for optimization opportunities

## Security Best Practices

- Use least privilege IAM roles
- Enable VPC Flow Logs
- Use AWS Secrets Manager for sensitive data
- Enable ECS Exec for secure container access