# 🌐 Frontend Deployment Guide - S3 + CloudFront

Complete guide to deploy your frontend to AWS S3 with CloudFront CDN and make the backend private.

## Phase 1: Deploy Frontend to S3 + CloudFront

### Step 1: Run the S3 Setup Script

```bash
# This creates S3 bucket and CloudFront distribution
./create-s3-frontend.sh
```

**Save the output values:**
- S3 Bucket Name: `words-wall-frontend-XXXXXXXX`
- CloudFront Domain: `dxxxxxxxxxx.cloudfront.net`
- CloudFront Distribution ID: `EXXXXXXXXXX`

### Step 2: Add GitHub Secrets

In GitHub repository settings → Secrets and variables → Actions:

```
S3_BUCKET_NAME=words-wall-frontend-XXXXXXXX
CLOUDFRONT_DISTRIBUTION_ID=EXXXXXXXXXX
NEXT_PUBLIC_API_BASE_URL=http://54.251.8.169:3001  # (will update later)
```

### Step 3: Test Frontend Build

```bash
cd frontend
yarn install
yarn build
```

### Step 4: Manual First Deployment

```bash
# Upload to S3
aws s3 sync frontend/out/ s3://YOUR_BUCKET_NAME --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**Your frontend is now live at**: `https://dxxxxxxxxxx.cloudfront.net`

## Phase 2: Create Private Backend with ALB

### Step 5: Run ALB Setup Script

```bash
# This creates Application Load Balancer
./create-alb-backend.sh
```

**Save the output values:**
- ALB DNS: `words-wall-alb-XXXXXXXX.ap-southeast-1.elb.amazonaws.com`
- Target Group ARN: `arn:aws:elasticloadbalancing:...`

### Step 6: Update ECS Service

1. **ECS Console** → **Clusters** → **words-wall-cluster**
2. **Services** → **words-wall-backend-service** → **Update service**
3. **Load balancing** → **Application Load Balancer**:
   - **Load balancer name**: `words-wall-alb`
   - **Container to load balance**: `words-wall-backend:3001`
   - **Target group**: Select existing → `words-wall-backend-tg`
4. **Network configuration**:
   - **Subnets**: Select private subnets
   - **Security groups**: Keep existing
   - **Public IP**: DISABLED
5. **Update service**

### Step 7: Update Frontend API Configuration

Update GitHub Secret:
```
NEXT_PUBLIC_API_BASE_URL=http://words-wall-alb-XXXXXXXX.ap-southeast-1.elb.amazonaws.com
```

Update `.env.production`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://words-wall-alb-XXXXXXXX.ap-southeast-1.elb.amazonaws.com
```

### Step 8: Deploy Updated Frontend

```bash
# Push changes to trigger GitHub Actions
git add .
git commit -m "feat: update API URL to use ALB"
git push origin main
```

## Phase 3: Test & Verification

### Test Backend via ALB

```bash
# Health check
curl http://words-wall-alb-XXXXXXXX.ap-southeast-1.elb.amazonaws.com/health

# Register user
curl -X POST http://words-wall-alb-XXXXXXXX.ap-southeast-1.elb.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'
```

### Test Frontend

1. **Open**: `https://dxxxxxxxxxx.cloudfront.net`
2. **Test**: User registration, login, sticker creation
3. **Verify**: API calls go to ALB, not direct IP

## Final Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │  Application     │    │   Private ECS   │
│   (Frontend)    │────│  Load Balancer   │────│   (Backend)     │
│   Global CDN    │    │  (Public)        │    │   No Public IP  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Benefits Achieved

✅ **Frontend**: Global CDN delivery via CloudFront  
✅ **Backend**: Private and secure, only accessible via ALB  
✅ **HTTPS**: Automatic SSL for frontend  
✅ **Cost-effective**: S3 storage + CloudFront CDN  
✅ **Scalable**: Auto-scaling load balancer  
✅ **Secure**: No direct backend access from internet  

## Automated Deployment

After setup, deployments are automated:

1. **Push to main branch** → GitHub Actions deploys frontend
2. **Backend changes** → ECS service auto-deploys via existing workflow
3. **Zero downtime** → CloudFront caching + ALB health checks

## Monitoring & Troubleshooting

### CloudWatch Logs
- **ALB**: Monitor request logs and errors
- **ECS**: Application logs in `/ecs/words-wall-backend`
- **CloudFront**: Access patterns and cache performance

### Health Checks
- **ALB Health Check**: `/health` endpoint
- **CloudFront**: Origin health monitoring
- **ECS Service**: Container health status

### Common Issues

1. **CORS errors**: Update backend CORS to allow CloudFront domain
2. **504 Gateway Timeout**: Check ALB target group health
3. **Cache issues**: Invalidate CloudFront distribution
4. **API 404**: Verify ALB listener rules and target groups

## Cost Optimization

- **S3**: ~$1-3/month for static hosting
- **CloudFront**: ~$1-5/month for CDN
- **ALB**: ~$20/month for load balancer
- **ECS**: Same as current (no additional cost)

**Total additional cost**: ~$22-28/month for production-grade infrastructure