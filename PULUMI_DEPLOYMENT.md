# 🚀 Pulumi Infrastructure Deployment Guide

Complete Infrastructure as Code setup for Words Wall using Pulumi.

## Why Pulumi?

✅ **Version Control**: Infrastructure changes tracked in git  
✅ **Reproducible**: Same infrastructure across environments  
✅ **Safer**: Preview changes before applying  
✅ **Declarative**: Define desired state, Pulumi handles the rest  
✅ **Cost Effective**: Easily tear down and recreate resources  

## Prerequisites

### 1. Install Pulumi

```bash
# macOS
brew install pulumi

# Windows
choco install pulumi

# Linux
curl -fsSL https://get.pulumi.com | sh
```

### 2. Install Dependencies

```bash
cd infrastructure
npm install
```

### 3. Configure AWS Credentials

Ensure AWS credentials are configured:
```bash
aws configure
# OR set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

## Deployment Steps

### Step 1: Initialize Pulumi Stack

```bash
cd infrastructure

# Login to Pulumi (creates free account)
pulumi login

# Initialize production stack
pulumi stack init production

# Set AWS region
pulumi config set aws:region ap-southeast-1
```

### Step 2: Preview Infrastructure

```bash
# See what will be created
pulumi preview
```

**Expected resources:**
- 1 S3 Bucket (frontend hosting)
- 1 CloudFront Distribution (CDN)
- 1 Application Load Balancer
- 1 Target Group (for ECS)
- 3 Security Groups (ALB, ECS, RDS)
- Various policies and configurations

### Step 3: Deploy Infrastructure

```bash
# Deploy all resources
pulumi up

# Confirm with 'yes' when prompted
```

⏱️ **Deployment time**: ~5-10 minutes

### Step 4: Get Infrastructure Details

```bash
# Get all outputs
pulumi stack output

# Get specific values
BUCKET_NAME=$(pulumi stack output frontendBucketName)
ALB_DNS=$(pulumi stack output albDnsName)
CLOUDFRONT_URL=$(pulumi stack output cloudfrontUrl)

echo "S3 Bucket: $BUCKET_NAME"
echo "ALB DNS: $ALB_DNS"
echo "CloudFront: $CLOUDFRONT_URL"
```

## Integration with Existing Services

### Step 5: Update ECS Service

1. **ECS Console** → **Clusters** → **words-wall-cluster**
2. **Services** → **words-wall-backend-service** → **Update service**
3. **Load balancing**:
   - ✅ **Application Load Balancer**
   - **Load balancer**: `words-wall-alb`
   - **Container**: `words-wall-backend:3001`
   - **Target group**: `words-wall-backend-tg`
4. **Network configuration**:
   - **Subnets**: Keep current (or select private if available)
   - **Security groups**: Replace with Pulumi output `ecsSecurityGroupId`
   - **Public IP**: **DISABLED**
5. **Update service**

### Step 6: Update GitHub Secrets

```bash
# Run helper script
./scripts/setup-github-secrets.sh
```

**Add these secrets in GitHub** (Settings → Secrets and variables → Actions):

```
S3_BUCKET_NAME=words-wall-frontend-xxxxx
CLOUDFRONT_DISTRIBUTION_ID=EXXXXXXXXXXXXX
NEXT_PUBLIC_API_BASE_URL=http://words-wall-alb-xxxxx.ap-southeast-1.elb.amazonaws.com
```

### Step 7: Deploy Frontend

```bash
# Automated deployment script
./scripts/deploy-frontend.sh
```

**Or manual:**

```bash
cd ../frontend
NEXT_PUBLIC_API_BASE_URL=http://$(cd ../infrastructure && pulumi stack output albDnsName) yarn build
aws s3 sync out/ s3://$(cd ../infrastructure && pulumi stack output frontendBucketName) --delete
aws cloudfront create-invalidation --distribution-id $(cd ../infrastructure && pulumi stack output cloudfrontDistributionId) --paths "/*"
```

## Verification & Testing

### Step 8: Test the Deployment

```bash
# Test backend via ALB
ALB_DNS=$(pulumi stack output albDnsName)
curl http://$ALB_DNS/health

# Test frontend
CLOUDFRONT_URL=$(pulumi stack output cloudfrontUrl)
echo "Frontend: $CLOUDFRONT_URL"
```

### Step 9: Verify Architecture

```bash
# Check that backend is private (should fail)
curl http://54.251.8.169:3001/health  # Old public IP

# Check that backend works via ALB (should succeed)
curl http://$(pulumi stack output albDnsName)/health
```

## Final Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │  Application     │    │   Private ECS   │
│   Global CDN    │────│  Load Balancer   │────│   No Public IP  │
│ ✅ HTTPS Ready   │    │ ✅ Health Checks │    │ ✅ Secure       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Benefits Achieved

✅ **Frontend**: Global CDN delivery, HTTPS ready  
✅ **Backend**: Private and secure, load balanced  
✅ **Infrastructure**: Version controlled, reproducible  
✅ **Deployment**: Automated via GitHub Actions  
✅ **Monitoring**: ALB health checks, CloudWatch logs  
✅ **Scalability**: Auto-scaling target groups  

## Management Commands

### Daily Operations

```bash
# Check infrastructure status
pulumi stack

# View resource details
pulumi stack output --json

# Refresh state from AWS
pulumi refresh
```

### Updates

```bash
# Preview changes
pulumi preview

# Apply changes
pulumi up

# Rollback (if needed)
pulumi stack export > backup.json
# ... make changes ...
pulumi stack import < backup.json
```

### Cleanup

```bash
# Destroy all infrastructure
pulumi destroy

# Remove stack
pulumi stack rm production
```

## Cost Breakdown

| Service | Monthly Cost |
|---------|-------------|
| S3 Bucket | $1-3 |
| CloudFront | $1-5 |
| Application Load Balancer | $20-25 |
| Target Group | Free |
| Security Groups | Free |
| **Total** | **~$22-33/month** |

## Troubleshooting

### Common Issues

1. **AWS Permissions**: Ensure your AWS user has necessary permissions
2. **Stack Conflicts**: Use unique stack names
3. **Region Issues**: Verify AWS region configuration
4. **VPC Issues**: Ensure default VPC exists

### Debug Commands

```bash
# Detailed logs
pulumi logs --follow

# Resource details
pulumi stack --show-urns

# Export current state
pulumi stack export
```

## Advanced Configuration

### Custom Domain (Optional)

```bash
# Set custom domain
pulumi config set words-wall:domain yourdomain.com

# Update and redeploy
pulumi up
```

### Environment-Specific Stacks

```bash
# Create staging environment
pulumi stack init staging
pulumi config set words-wall:environment staging
pulumi up

# Switch between environments
pulumi stack select production
pulumi stack select staging
```

## Security Best Practices

✅ **Private ECS**: No public IP, only accessible via ALB  
✅ **Security Groups**: Minimal required access  
✅ **HTTPS**: CloudFront enforces HTTPS  
✅ **IAM**: Least privilege access patterns  
✅ **Secrets**: Managed via AWS Secrets Manager  

## Next Steps

1. **Set up custom domain** with Route 53 + ACM certificates
2. **Enable WAF** for additional security
3. **Add monitoring** with CloudWatch alarms
4. **Implement backup** strategies for RDS
5. **Set up staging** environment

🎉 **Your infrastructure is now production-ready with full automation!**