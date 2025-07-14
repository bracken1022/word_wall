#!/bin/bash

# Deploy frontend to S3 + CloudFront using Pulumi outputs
set -e

echo "🚀 Deploying frontend to AWS S3 + CloudFront..."

# Get Pulumi outputs
BUCKET_NAME=$(pulumi stack output frontendBucketName)
DISTRIBUTION_ID=$(pulumi stack output cloudfrontDistributionId)
ALB_DNS=$(pulumi stack output albDnsName)

echo "📋 Using infrastructure:"
echo "  S3 Bucket: $BUCKET_NAME"
echo "  CloudFront: $DISTRIBUTION_ID"
echo "  ALB DNS: $ALB_DNS"

# Build frontend with ALB URL (HTTP to avoid CORS/mixed content for now)
echo "🏗️ Building frontend..."
cd ../frontend
NEXT_PUBLIC_API_BASE_URL=http://$ALB_DNS yarn build

# Upload to S3
echo "📤 Uploading to S3..."
aws s3 sync out/ s3://$BUCKET_NAME --delete

# Set correct content types
echo "🔧 Setting content types..."
aws s3 cp s3://$BUCKET_NAME s3://$BUCKET_NAME --recursive \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.html" \
  --content-type "text/html"

aws s3 cp s3://$BUCKET_NAME s3://$BUCKET_NAME --recursive \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.css" \
  --content-type "text/css"

aws s3 cp s3://$BUCKET_NAME s3://$BUCKET_NAME --recursive \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.js" \
  --content-type "application/javascript"

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Frontend deployment complete!"
echo ""
echo "🌐 URLs:"
echo "  S3 Website: http://$BUCKET_NAME.s3-website-ap-southeast-1.amazonaws.com"
echo "  CloudFront: https://$(pulumi stack output cloudfrontUrl | sed 's/https:\/\///')"
echo "  Backend API: http://$ALB_DNS"