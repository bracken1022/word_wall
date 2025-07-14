# Words Wall Deployment Guide

This guide explains how to deploy the Words Wall application using our two-tier deployment approach:

1. **Pulumi (Infrastructure)**: Manages AWS resources like VPC, Security Groups, Load Balancers, RDS, S3, CloudFront, etc.
2. **Task Definitions (Backend)**: Manages ECS service deployments and application updates

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        PULUMI MANAGED                       │
├─────────────────────────────────────────────────────────────┤
│ • VPC & Networking          • Security Groups              │
│ • Application Load Balancer • RDS Database                 │
│ • S3 Bucket (Frontend)      • CloudFront Distribution      │
│ • ECS Cluster & IAM Roles   • Secrets Manager              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   TASK DEFINITION MANAGED                   │
├─────────────────────────────────────────────────────────────┤
│ • ECS Service Deployments   • Docker Image Updates         │
│ • Application Configuration • Rollbacks                     │
│ • Health Checks            • Scaling                       │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools
```bash
# AWS CLI
aws --version  # Should be v2.x

# Pulumi CLI
pulumi version  # Should be v3.x+

# Docker
docker --version

# Node.js & npm
node --version  # Should be v18+
npm --version

# jq (for JSON processing)
jq --version
```

### AWS Configuration
```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity
```

## Project Structure

```
infrastructure/
├── index.ts                          # Main Pulumi program
├── infrastructure/                   # Modular infrastructure components
│   ├── vpc.ts                       # VPC and networking
│   ├── security-groups.ts           # Security group definitions
│   ├── load-balancer.ts             # ALB and target groups
│   ├── s3-frontend.ts               # S3 bucket for frontend
│   ├── cloudfront.ts                # CloudFront distribution
│   ├── ecs-cluster.ts               # ECS cluster and IAM roles
│   ├── rds.ts                       # RDS database
│   └── secrets.ts                   # Secrets Manager
├── task-definitions/                # ECS task definitions
│   └── backend-task-definition.json # Backend container definition
├── deployment/                      # Deployment scripts
│   ├── deploy-infrastructure.sh     # Deploy/preview infrastructure
│   ├── deploy-backend.sh            # Deploy backend services
│   └── deploy-frontend.sh           # Deploy frontend to S3/CloudFront
└── package.json                     # npm scripts for deployment
```

## Deployment Process

### 1. Initial Setup

```bash
cd infrastructure/

# Install dependencies
npm install

# Initialize Pulumi stack
npm run stack:init production

# Set AWS region
pulumi config set aws:region ap-southeast-1
pulumi config set environment production
```

### 2. Deploy Infrastructure (First Time)

```bash
# Preview infrastructure changes
npm run infra:preview

# Deploy infrastructure
npm run infra:deploy
```

This will create:
- VPC and networking resources
- Security groups for ALB, ECS, and RDS
- Application Load Balancer with target groups
- S3 bucket for frontend hosting
- CloudFront distribution
- ECS cluster with IAM roles
- RDS PostgreSQL database
- Secrets Manager for JWT and database credentials

### 3. Deploy Backend

```bash
# Build Docker image and deploy
npm run backend:build-deploy

# Or deploy existing image
npm run backend:deploy --image-tag v1.2.3
```

This will:
- Build Docker image with Ollama + Qwen integration
- Push to ECR
- Update ECS task definition
- Deploy new ECS service version
- Wait for deployment completion

### 4. Deploy Frontend

```bash
# Deploy frontend to S3 and CloudFront
npm run frontend:deploy
```

This will:
- Build Next.js frontend with correct API endpoint
- Upload static files to S3
- Invalidate CloudFront cache

### 5. Full Deployment (All Components)

```bash
# Deploy everything in correct order
npm run deploy:all
```

## Day-to-Day Operations

### Backend Updates

For application code changes, you typically only need to update the backend:

```bash
# Quick backend deployment
npm run backend:build-deploy

# Monitor deployment
npm run logs
npm run status
```

### Infrastructure Changes

For infrastructure changes (security groups, database settings, etc.):

```bash
# Preview changes
npm run infra:preview

# Apply changes
npm run infra:deploy
```

### Frontend Updates

For frontend changes:

```bash
npm run frontend:deploy
```

## Environment Management

### Configuration

Pulumi configuration is stored in `Pulumi.<stack>.yaml`:

```yaml
config:
  aws:region: ap-southeast-1
  environment: production
  words-wall-infrastructure:projectName: words-wall
```

### Secrets

Sensitive values are managed through Pulumi secrets:

```bash
# Set a secret configuration value
pulumi config set --secret dbPassword "super-secret-password"

# View configuration (secrets are encrypted)
pulumi config
```

### Multiple Environments

Create different stacks for different environments:

```bash
# Development environment
pulumi stack init development
pulumi config set environment development

# Staging environment
pulumi stack init staging
pulumi config set environment staging

# Production environment
pulumi stack init production
pulumi config set environment production
```

## Monitoring and Debugging

### View Logs

```bash
# Real-time logs
npm run logs

# Or directly with AWS CLI
aws logs tail /ecs/words-wall-backend --follow
```

### Check Service Status

```bash
# Service deployment status
npm run status

# Detailed service information
aws ecs describe-services --cluster words-wall-production-cluster --services words-wall-backend-service
```

### Debug Failed Deployments

```bash
# Check ECS service events
aws ecs describe-services --cluster words-wall-production-cluster --services words-wall-backend-service --query 'services[0].events'

# Check task definition
aws ecs describe-task-definition --task-definition words-wall-backend-task

# Check running tasks
aws ecs list-tasks --cluster words-wall-production-cluster --service-name words-wall-backend-service
```

## Rollback Procedures

### Backend Rollback

```bash
# Deploy specific image version
npm run backend:deploy -- --image-tag previous-version

# Or revert to previous task definition
aws ecs update-service \
  --cluster words-wall-production-cluster \
  --service words-wall-backend-service \
  --task-definition words-wall-backend-task:previous-revision
```

### Infrastructure Rollback

```bash
# Pulumi state-based rollback
pulumi cancel  # If deployment is in progress
pulumi refresh  # Sync with actual AWS state
pulumi up  # Re-apply previous configuration
```

## Security Considerations

### IAM Roles

- **ECS Execution Role**: Minimal permissions for ECS task execution
- **ECS Task Role**: Application-specific permissions
- Both roles follow least-privilege principle

### Security Groups

- **ALB Security Group**: Only HTTP/HTTPS from internet
- **ECS Security Group**: Only port 3001 from ALB
- **RDS Security Group**: Only port 5432 from ECS

### Secrets Management

- JWT secrets and database credentials stored in AWS Secrets Manager
- Secrets are encrypted at rest and in transit
- ECS tasks fetch secrets at runtime

## Cost Optimization

### Development Environment

```bash
# Use smaller instance sizes
pulumi config set rdsInstanceClass db.t3.micro
pulumi config set ecsTaskCpu 512
pulumi config set ecsTaskMemory 1024
```

### Production Environment

```bash
# Use appropriate instance sizes
pulumi config set rdsInstanceClass db.t3.small
pulumi config set ecsTaskCpu 2048
pulumi config set ecsTaskMemory 4096
```

## Troubleshooting

### Common Issues

1. **ECS Tasks Failing to Start**
   - Check CloudWatch logs: `npm run logs`
   - Verify security group rules
   - Check task definition CPU/memory limits

2. **Database Connection Issues**
   - Verify RDS security group allows ECS access
   - Check database credentials in Secrets Manager
   - Ensure database is in running state

3. **Load Balancer Health Check Failures**
   - Verify `/health` endpoint is responding
   - Check ECS task security group allows ALB access
   - Review target group health check settings

4. **Frontend Not Loading**
   - Check S3 bucket policy allows public read
   - Verify CloudFront distribution is deployed
   - Check CloudFront cache behavior settings

### Getting Help

1. Check AWS service health dashboards
2. Review CloudWatch logs and metrics
3. Use AWS CLI to inspect resource states
4. Check Pulumi state for configuration drift

## Best Practices

1. **Always preview before deploying**: Use `npm run infra:preview`
2. **Test in development first**: Use separate stacks
3. **Monitor deployments**: Check logs and service status
4. **Keep secrets secure**: Use Secrets Manager, never commit secrets
5. **Version your images**: Use semantic versioning for Docker images
6. **Backup regularly**: RDS automated backups are enabled
7. **Review costs**: Monitor AWS billing dashboard regularly