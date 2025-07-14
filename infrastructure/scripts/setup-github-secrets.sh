#!/bin/bash

# Generate GitHub secrets from Pulumi outputs
set -e

echo "🔐 Generating GitHub Secrets from Pulumi outputs..."

# Get Pulumi outputs
BUCKET_NAME=$(pulumi stack output frontendBucketName)
DISTRIBUTION_ID=$(pulumi stack output cloudfrontDistributionId)
ALB_DNS=$(pulumi stack output albDnsName)

echo "📋 Add these secrets to your GitHub repository:"
echo ""
echo "Go to: GitHub Repository → Settings → Secrets and variables → Actions"
echo ""
echo "Add these repository secrets:"
echo ""
echo "S3_BUCKET_NAME=$BUCKET_NAME"
echo "CLOUDFRONT_DISTRIBUTION_ID=$DISTRIBUTION_ID"
echo "NEXT_PUBLIC_API_BASE_URL=http://$ALB_DNS"
echo ""
echo "Additional secrets you need to add manually:"
echo "AWS_ACCESS_KEY_ID=your_aws_access_key"
echo "AWS_SECRET_ACCESS_KEY=your_aws_secret_key"
echo ""
echo "🚀 After adding secrets, push changes to trigger automated deployment!"