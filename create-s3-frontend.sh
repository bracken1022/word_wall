#!/bin/bash

# Create S3 bucket for frontend hosting
REGION="ap-southeast-1"
BUCKET_NAME="words-wall-frontend-$(date +%s)"  # Add timestamp for uniqueness
ACCOUNT_ID="216673926326"

echo "🪣 Creating S3 bucket for frontend hosting..."

# Create S3 bucket
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document 404.html \
  --region $REGION

# Create bucket policy for public read access
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
EOF

# Apply bucket policy
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file://bucket-policy.json \
  --region $REGION

# Disable block public access (required for static hosting)
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false \
  --region $REGION

echo "✅ S3 bucket created successfully!"
echo ""
echo "📋 Bucket Details:"
echo "  Bucket Name: $BUCKET_NAME"
echo "  Region: $REGION"
echo "  Website URL: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
echo ""
echo "🔗 Save this bucket name for CloudFront setup!"
echo "   Bucket Name: $BUCKET_NAME"

# Clean up
rm -f bucket-policy.json

# Create CloudFront distribution
echo ""
echo "🌐 Creating CloudFront distribution..."

# Create CloudFront distribution configuration
cat > cloudfront-config.json << EOF
{
    "CallerReference": "${BUCKET_NAME}-$(date +%s)",
    "Comment": "Words Wall Frontend Distribution",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3Origin",
                "DomainName": "${BUCKET_NAME}.s3.${REGION}.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3Origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {"Forward": "none"}
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        }
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF

# Create CloudFront distribution
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --region $REGION \
  --query 'Distribution.Id' \
  --output text)

echo "📦 CloudFront distribution created: $DISTRIBUTION_ID"
echo "⏳ Distribution is deploying (this takes 10-15 minutes)..."

# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text)

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Frontend Infrastructure:"
echo "  S3 Bucket: $BUCKET_NAME"
echo "  CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo "  CloudFront Distribution ID: $DISTRIBUTION_ID"
echo ""
echo "🚀 Next Steps:"
echo "1. Build your frontend: 'cd frontend && npm run build'"
echo "2. Upload to S3: 'aws s3 sync out/ s3://$BUCKET_NAME --delete'"
echo "3. Invalidate CloudFront: 'aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths \"/*\"'"

# Clean up
rm -f cloudfront-config.json