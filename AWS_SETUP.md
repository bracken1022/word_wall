# 🚀 AWS ECS Deployment Setup

This guide walks you through setting up AWS ECS deployment for the Words Wall backend using GitHub Actions.

## 📋 Prerequisites

- AWS Account with appropriate permissions
- GitHub repository with the code
- AWS CLI installed locally (for setup)

## 🛠️ AWS Infrastructure Setup

### 1. Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name words-wall-backend \
  --region us-east-1
```

### 2. Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name words-wall-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### 3. Create IAM Roles

#### ECS Task Execution Role
```bash
# Create trust policy
cat > trust-policy.json << 'EOF'
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

# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://trust-policy.json

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Attach additional policy for secrets
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess
```

#### ECS Task Role
```bash
# Create task role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file://trust-policy.json

# Create and attach custom policy for task permissions
cat > task-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name WordsWallTaskPolicy \
  --policy-document file://task-policy.json

aws iam attach-role-policy \
  --role-name ecsTaskRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/WordsWallTaskPolicy
```

### 4. Create EFS File System (for persistent data)

```bash
# Create EFS file system
aws efs create-file-system \
  --creation-token words-wall-data \
  --performance-mode generalPurpose \
  --throughput-mode provisioned \
  --provisioned-throughput-in-mibps 1 \
  --tags Key=Name,Value=words-wall-data

# Note the FileSystemId from the output (fs-xxxxxxxxx)

# Create access points
aws efs create-access-point \
  --file-system-id fs-xxxxxxxxx \
  --posix-user Uid=1001,Gid=1001 \
  --root-directory Path=/data,CreationInfo='{OwnerUid=1001,OwnerGid=1001,Permissions=755}' \
  --tags Key=Name,Value=words-wall-data-access-point

aws efs create-access-point \
  --file-system-id fs-xxxxxxxxx \
  --posix-user Uid=1001,Gid=1001 \
  --root-directory Path=/uploads,CreationInfo='{OwnerUid=1001,OwnerGid=1001,Permissions=755}' \
  --tags Key=Name,Value=words-wall-uploads-access-point
```

### 5. Create VPC and Security Groups

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=words-wall-vpc}]'

# Create subnets (use VPC ID from above)
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=words-wall-subnet-1}]'

aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxxx \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=words-wall-subnet-2}]'

# Create Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=words-wall-igw}]'

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway \
  --vpc-id vpc-xxxxxxxxx \
  --internet-gateway-id igw-xxxxxxxxx

# Create security group for ECS tasks
aws ec2 create-security-group \
  --group-name words-wall-ecs-sg \
  --description "Security group for Words Wall ECS tasks" \
  --vpc-id vpc-xxxxxxxxx

# Allow inbound traffic on port 3001
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0

# Create security group for EFS
aws ec2 create-security-group \
  --group-name words-wall-efs-sg \
  --description "Security group for Words Wall EFS" \
  --vpc-id vpc-xxxxxxxxx

# Allow NFS traffic from ECS security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-yyyyyyyyy \
  --protocol tcp \
  --port 2049 \
  --source-group sg-xxxxxxxxx
```

### 6. Create Application Load Balancer (Optional)

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name words-wall-alb \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name words-wall-targets \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxxxxxxxx \
  --target-type ip \
  --health-check-path /health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:account:loadbalancer/app/words-wall-alb/xxxxxxxxx \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:account:targetgroup/words-wall-targets/xxxxxxxxx
```

### 7. Store Secrets in AWS Parameter Store

```bash
# Store JWT secret
aws ssm put-parameter \
  --name "/words-wall/jwt-secret" \
  --value "your-super-secret-jwt-key-change-this-in-production" \
  --type "SecureString" \
  --description "JWT secret for Words Wall application"
```

### 8. Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/words-wall-backend \
  --region us-east-1
```

### 9. Update Task Definition

Update `.aws/task-definition.json` with your actual values:

```json
{
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/words-wall-backend:latest",
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/words-wall/jwt-secret"
        }
      ]
    }
  ],
  "volumes": [
    {
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxxxxxx",
        "authorizationConfig": {
          "accessPointId": "fsap-xxxxxxxxx"
        }
      }
    }
  ]
}
```

## 🔐 GitHub Secrets Setup

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```bash
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Create IAM User for GitHub Actions

```bash
# Create user
aws iam create-user --user-name github-actions-words-wall

# Create policy for GitHub Actions
cat > github-actions-policy.json << 'EOF'
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
      "Resource": "*"
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
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
        "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole"
      ]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name GitHubActionsWordsWallPolicy \
  --policy-document file://github-actions-policy.json

aws iam attach-user-policy \
  --user-name github-actions-words-wall \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/GitHubActionsWordsWallPolicy

# Create access keys
aws iam create-access-key --user-name github-actions-words-wall
```

## 🚀 Create ECS Service

```bash
# Register initial task definition
aws ecs register-task-definition \
  --cli-input-json file://.aws/task-definition.json

# Create ECS service
aws ecs create-service \
  --cluster words-wall-cluster \
  --service-name words-wall-backend-service \
  --task-definition words-wall-backend-task:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx,subnet-yyyyyyyyy],securityGroups=[sg-xxxxxxxxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:account:targetgroup/words-wall-targets/xxxxxxxxx,containerName=words-wall-backend,containerPort=3001
```

## 📊 Monitoring and Logging

### CloudWatch Dashboard (Optional)

```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "WordsWall-Backend" \
  --dashboard-body file://cloudwatch-dashboard.json
```

## 🔧 Testing the Deployment

1. **Push to main branch** to trigger the GitHub Action
2. **Monitor the deployment** in GitHub Actions tab
3. **Check ECS service** in AWS Console
4. **Test the health endpoint**: `curl http://your-alb-url/health`

## 📝 Notes

- **EFS vs EBS**: Using EFS for persistent data across container restarts
- **Security**: Secrets stored in AWS Parameter Store
- **Scaling**: Can easily scale by increasing desired count
- **Monitoring**: CloudWatch logs and metrics available
- **Cost**: Fargate pricing based on CPU/memory allocation

## 🆘 Troubleshooting

### Common Issues

1. **Task fails to start**: Check CloudWatch logs
2. **Health check failures**: Verify /health endpoint
3. **Permission issues**: Verify IAM roles and policies
4. **Network issues**: Check security groups and VPC configuration

### Useful Commands

```bash
# View ECS service status
aws ecs describe-services --cluster words-wall-cluster --services words-wall-backend-service

# View recent tasks
aws ecs list-tasks --cluster words-wall-cluster --service-name words-wall-backend-service

# View task logs
aws logs tail /ecs/words-wall-backend --follow
```