#!/bin/bash

# Deploy frontend to S3 and invalidate CloudFront cache

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../../.."

# Get infrastructure outputs
get_infra_output() {
    local key="$1"
    cd "$SCRIPT_DIR/.."
    pulumi stack output "$key" 2>/dev/null || echo ""
}

echo "🌐 Deploying Words Wall Frontend"
echo "================================="

# Get infrastructure information
BUCKET_NAME=$(get_infra_output "frontendBucketName")
CLOUDFRONT_ID=$(get_infra_output "cloudfrontDistributionId")
ALB_DNS=$(get_infra_output "albDnsName")
CUSTOM_DOMAIN=$(get_infra_output "customDomainName")
API_DOMAIN=$(get_infra_output "apiDomainName")

if [[ -z "$BUCKET_NAME" ]]; then
    echo "❌ Could not get S3 bucket name from Pulumi outputs"
    echo "Make sure infrastructure is deployed first: ./deployment/deploy-infrastructure.sh"
    exit 1
fi

echo "S3 Bucket: $BUCKET_NAME"
echo "CloudFront Distribution: $CLOUDFRONT_ID"
echo "ALB DNS: $ALB_DNS"
echo "Custom Domain: ${CUSTOM_DOMAIN:-"Not configured"}"
echo "API Domain: ${API_DOMAIN:-"Not configured"}"
echo ""

# Build frontend
echo "🔨 Building frontend..."
cd "$PROJECT_ROOT/frontend"

# Determine API endpoint
if [[ -n "$API_DOMAIN" ]]; then
    export NEXT_PUBLIC_API_BASE_URL="https://$API_DOMAIN"
    echo "🔗 Using custom API domain: $NEXT_PUBLIC_API_BASE_URL"
else
    export NEXT_PUBLIC_API_BASE_URL="http://$ALB_DNS"
    echo "🔗 Using ALB endpoint: $NEXT_PUBLIC_API_BASE_URL"
fi

# Install dependencies and build
npm install
npm run build

echo "✅ Frontend built successfully"

# Upload to S3
echo "📤 Uploading to S3..."
aws s3 sync out/ "s3://$BUCKET_NAME" --delete --quiet

echo "✅ Frontend uploaded to S3"

# Invalidate CloudFront cache
if [[ -n "$CLOUDFRONT_ID" ]]; then
    echo "🔄 Invalidating CloudFront cache..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    echo "CloudFront invalidation created: $INVALIDATION_ID"
    echo "✅ Frontend deployment completed!"
else
    echo "⚠️  No CloudFront distribution found, skipping cache invalidation"
fi

echo ""
echo ""
echo "🎉 Frontend deployment completed!"
echo "=========================================="

if [[ -n "$CUSTOM_DOMAIN" ]]; then
    echo "🌐 Frontend URL: https://$CUSTOM_DOMAIN"
    echo "🔗 API Endpoint: https://$API_DOMAIN"
else
    echo "Frontend URL: $(get_infra_output "cloudfrontUrl")"
    echo "API Endpoint: $NEXT_PUBLIC_API_BASE_URL"
fi
echo "S3 Website URL: $(get_infra_output "frontendBucketWebsiteUrl")"