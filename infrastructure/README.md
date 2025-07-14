# Words Wall Infrastructure

Infrastructure as Code for the Words Wall application using Pulumi and AWS.

## Overview

This Pulumi project creates and manages:

- **S3 Bucket**: Static website hosting for frontend
- **CloudFront Distribution**: Global CDN for frontend delivery
- **Application Load Balancer**: Load balancer for backend API
- **Security Groups**: Network security for ECS, ALB, and RDS
- **Target Groups**: Health checks and load balancing for ECS

## Prerequisites

1. **Install Pulumi**: https://www.pulumi.com/docs/get-started/install/
2. **Configure AWS credentials**: `aws configure` or environment variables
3. **Install dependencies**: `npm install`

## Quick Start

### 1. Initialize Pulumi Stack

```bash
# Initialize a new stack
pulumi stack init production

# Set AWS region
pulumi config set aws:region ap-southeast-1
```

### 2. Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy infrastructure
pulumi up
```

### 3. Get Outputs

```bash
# List all outputs
pulumi stack output

# Get specific values
pulumi stack output frontendBucketName
pulumi stack output cloudfrontUrl
pulumi stack output albDnsName
```

## Configuration

Set configuration values:

```bash
# Set environment
pulumi config set words-wall:environment production

# Set custom domain (optional)
pulumi config set words-wall:domain yourdomain.com

# Set AWS region
pulumi config set aws:region ap-southeast-1
```

## Outputs

After deployment, you'll get these important values:

- `frontendBucketName`: S3 bucket for frontend files
- `cloudfrontUrl`: CloudFront distribution URL
- `cloudfrontDistributionId`: For cache invalidation
- `albDnsName`: Application Load Balancer DNS name
- `targetGroupArn`: ECS target group ARN
- `ecsSecurityGroupId`: Security group for ECS tasks

## Integration with Existing Services

### Update ECS Service

1. Go to ECS Console → Your service → Update service
2. **Load balancing**:
   - Load balancer: Select the created ALB
   - Target group: Use the `targetGroupArn` output
3. **Network**:
   - Security groups: Use `ecsSecurityGroupId`
   - Public IP: DISABLED

### Update GitHub Secrets

Add these secrets to your GitHub repository:

```bash
S3_BUCKET_NAME=$(pulumi stack output frontendBucketName)
CLOUDFRONT_DISTRIBUTION_ID=$(pulumi stack output cloudfrontDistributionId)
NEXT_PUBLIC_API_BASE_URL=http://$(pulumi stack output albDnsName)
```

### Deploy Frontend

```bash
# Build frontend with ALB URL
cd ../frontend
NEXT_PUBLIC_API_BASE_URL=http://$(cd ../infrastructure && pulumi stack output albDnsName) yarn build

# Upload to S3
aws s3 sync out/ s3://$(cd ../infrastructure && pulumi stack output frontendBucketName) --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(cd ../infrastructure && pulumi stack output cloudfrontDistributionId) \
  --paths "/*"
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │  Application     │    │   Private ECS   │
│   (Frontend)    │────│  Load Balancer   │────│   (Backend)     │
│   Global CDN    │    │  (Public)        │    │   No Public IP  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Management Commands

```bash
# View current stack
pulumi stack

# Refresh state
pulumi refresh

# View logs
pulumi logs

# Destroy infrastructure
pulumi destroy
```

## Security Groups

- **ALB Security Group**: Allows HTTP/HTTPS from internet
- **ECS Security Group**: Allows traffic from ALB on port 3001
- **RDS Security Group**: Allows traffic from ECS on port 5432

## Cost Optimization

- CloudFront uses PriceClass_100 (North America + Europe)
- S3 bucket configured for standard storage
- ALB configured without unnecessary features

## Troubleshooting

### Common Issues

1. **Permissions**: Ensure AWS credentials have necessary permissions
2. **Region**: Verify AWS region configuration
3. **VPC**: Uses default VPC (ensure it exists)
4. **Dependencies**: Run `npm install` if packages are missing

### Debug Commands

```bash
# Check stack state
pulumi stack --show-urns

# Export stack state
pulumi stack export

# View detailed logs
pulumi logs --follow
```