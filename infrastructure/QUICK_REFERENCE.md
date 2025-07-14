# Words Wall Quick Reference

## 🚀 Quick Deployment Commands

```bash
# Full deployment (infrastructure + backend + frontend)
npm run deploy:all

# Infrastructure only (security groups, load balancers, etc.)
npm run infra:deploy

# Backend only (application updates)
npm run backend:build-deploy

# Frontend only (static website updates)
npm run frontend:deploy
```

## 📋 Monitoring Commands

```bash
# View real-time logs
npm run logs

# Check deployment status
npm run status

# Check service health
aws ecs describe-services --cluster words-wall-production-cluster --services words-wall-backend-service
```

## 🔧 Infrastructure vs Backend Deployment

### Use Pulumi (Infrastructure) when changing:
- ✅ Security Groups
- ✅ Load Balancer settings
- ✅ RDS configuration
- ✅ S3 bucket policies
- ✅ CloudFront distribution
- ✅ IAM roles and policies
- ✅ Secrets Manager

### Use Task Definition (Backend) when changing:
- ✅ Application code
- ✅ Docker image
- ✅ Environment variables
- ✅ Container CPU/memory
- ✅ Health check settings
- ✅ Application scaling

## 📁 Key File Locations

```
infrastructure/
├── index.ts                           # Main Pulumi entry point
├── infrastructure/                    # Modular infrastructure
├── task-definitions/                  # ECS task definitions
├── deployment/                        # Deployment scripts
│   ├── deploy-infrastructure.sh       # Pulumi deployments
│   ├── deploy-backend.sh             # ECS service deployments
│   └── deploy-frontend.sh            # S3/CloudFront deployments
└── DEPLOYMENT_GUIDE.md               # Full documentation
```

## 🔑 Important ARNs & Names

Update these in `task-definitions/backend-task-definition.json`:

```json
{
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/words-wall-production-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/words-wall-production-ecs-task-role",
  "secrets": [
    {
      "name": "JWT_SECRET",
      "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:words-wall-production-jwt-secret"
    },
    {
      "name": "DATABASE_URL", 
      "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:words-wall-production-database-url"
    }
  ]
}
```

## 🚨 Emergency Procedures

### Rollback Backend
```bash
# Deploy previous image version
npm run backend:deploy -- --image-tag previous-version

# Or revert to previous task definition
aws ecs update-service \
  --cluster words-wall-production-cluster \
  --service words-wall-backend-service \
  --task-definition words-wall-backend-task:previous-revision
```

### Check Failed Deployment
```bash
# View recent logs
npm run logs

# Check service events
aws ecs describe-services --cluster words-wall-production-cluster --services words-wall-backend-service --query 'services[0].events'

# List failed tasks
aws ecs list-tasks --cluster words-wall-production-cluster --service-name words-wall-backend-service --desired-status STOPPED
```

### Debug Infrastructure Issues
```bash
# Preview what Pulumi wants to change
npm run infra:preview

# Check Pulumi stack status
pulumi stack

# Refresh Pulumi state
pulumi refresh
```

## 💡 Common Workflows

### 1. Application Code Update
```bash
cd infrastructure/
npm run backend:build-deploy
npm run logs  # Monitor deployment
```

### 2. Add New Environment Variable
1. Update `task-definitions/backend-task-definition.json`
2. Run `npm run backend:deploy`

### 3. Change Security Group Rules
1. Update `infrastructure/security-groups.ts`
2. Run `npm run infra:preview` to review changes
3. Run `npm run infra:deploy`

### 4. Database Schema Changes
1. Run database migrations from ECS task or locally
2. No infrastructure changes needed

### 5. Frontend Updates
```bash
cd infrastructure/
npm run frontend:deploy
```

## 📊 Resource Naming Convention

All resources follow this pattern:
- **Pulumi Resources**: `words-wall-production-{resource-type}`
- **ECS Resources**: `words-wall-production-cluster`, `words-wall-backend-service`
- **S3 Buckets**: `words-wall-production-frontend-{timestamp}`
- **Secrets**: `words-wall-production-{secret-name}`

## 🔍 Troubleshooting Quick Checks

1. **ECS Task Won't Start**
   ```bash
   npm run logs
   aws ecs describe-tasks --cluster words-wall-production-cluster --tasks TASK_ID
   ```

2. **Health Check Failing**
   ```bash
   curl http://ALB_DNS_NAME/health
   aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN
   ```

3. **Database Connection Issues**
   ```bash
   # Check RDS status
   aws rds describe-db-instances --db-instance-identifier words-wall-production-db
   
   # Check security group rules
   aws ec2 describe-security-groups --group-ids sg-xxx
   ```

4. **Secrets Not Loading**
   ```bash
   # Check secret exists
   aws secretsmanager describe-secret --secret-id words-wall-production-jwt-secret
   
   # Check ECS execution role permissions
   aws iam get-role-policy --role-name words-wall-production-ecs-execution-role --policy-name ecs-execution-secrets-policy
   ```