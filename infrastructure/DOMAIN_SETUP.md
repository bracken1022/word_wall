# Custom Domain Setup Guide

This guide explains how to set up a custom domain for your Words Wall application.

## 🌐 What You'll Get

With a custom domain configured, your application will be accessible at:
- **Frontend**: `https://yourdomain.com` (via CloudFront)
- **API**: `https://api.yourdomain.com` (via Application Load Balancer)

## 📋 Prerequisites

### 1. Own a Domain Name
You need to purchase a domain from a registrar like:
- AWS Route 53
- GoDaddy
- Namecheap
- Cloudflare
- Google Domains

### 2. Domain Must Use Route 53 for DNS
Your domain must use AWS Route 53 as its DNS provider. If you purchased the domain elsewhere, you can transfer DNS management to Route 53.

## 🛠️ Setup Process

### Step 1: Set Up Route 53 Hosted Zone

If you haven't already, create a hosted zone for your domain:

```bash
# If domain purchased outside AWS, create hosted zone
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s)

# Note the Name Servers (NS records) and update them at your registrar
aws route53 get-hosted-zone --id /hostedzone/YOUR_ZONE_ID
```

### Step 2: Configure Domain in Pulumi

```bash
cd infrastructure/

# Set your domain name
pulumi config set domainName yourdomain.com

# Preview the changes
pulumi preview

# Deploy with domain configuration
pulumi up
```

### Step 3: Verify DNS and SSL

After deployment, check that everything is working:

```bash
# Check DNS resolution
nslookup yourdomain.com
nslookup api.yourdomain.com

# Check SSL certificate
curl -I https://yourdomain.com
curl -I https://api.yourdomain.com/health
```

## 🔧 Configuration Details

### Pulumi Configuration

The domain setup adds these configuration options:

```yaml
# Pulumi.production.yaml
config:
  words-wall-infrastructure:domainName: yourdomain.com
```

### What Gets Created

1. **SSL Certificate**: AWS ACM certificate for your domain and `api.yourdomain.com`
2. **DNS Validation**: Route 53 records for certificate validation
3. **CloudFront Distribution**: Configured with your custom domain and SSL
4. **Application Load Balancer**: HTTPS listener with SSL certificate
5. **DNS Records**: 
   - `yourdomain.com` → CloudFront (frontend)
   - `api.yourdomain.com` → ALB (backend API)

### Security Features

- **HTTPS Everywhere**: HTTP requests redirect to HTTPS
- **Modern TLS**: TLS 1.2+ only
- **Secure Headers**: CloudFront security headers
- **Certificate Auto-Renewal**: AWS manages certificate renewal

## 🌍 Example Domain Setup

Let's say your domain is `wordswall.io`:

### 1. Configure the Domain

```bash
cd infrastructure/
pulumi config set domainName wordswall.io
```

### 2. Deploy Infrastructure

```bash
pulumi up
```

### 3. Your URLs

- **Frontend**: https://wordswall.io
- **API**: https://api.wordswall.io
- **Health Check**: https://api.wordswall.io/health

### 4. Update Frontend Configuration

The deployment scripts will automatically use the custom domain:

```bash
# Frontend will build with API_URL=https://api.wordswall.io
npm run frontend:deploy
```

## 🔍 Troubleshooting

### Certificate Validation Stuck

If certificate validation takes too long:

```bash
# Check validation records were created
aws route53 list-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --query 'ResourceRecordSets[?Type==`CNAME`]'

# Check certificate status
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN
```

### DNS Not Resolving

```bash
# Check nameservers at your registrar match Route 53
aws route53 get-hosted-zone --id YOUR_ZONE_ID

# Check DNS propagation (can take up to 48 hours)
dig yourdomain.com
dig api.yourdomain.com
```

### CloudFront Not Using Custom Domain

```bash
# Check CloudFront distribution
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# Verify certificate is in us-east-1 (required for CloudFront)
aws acm list-certificates --region us-east-1
```

## 🚀 Benefits of Custom Domain

1. **Professional Appearance**: `wordswall.io` vs `d1234.cloudfront.net`
2. **SEO Benefits**: Better search engine rankings
3. **Branding**: Consistent with your brand
4. **SSL Security**: HTTPS everywhere with valid certificates
5. **User Trust**: Users trust custom domains more
6. **Easy to Remember**: Much easier for users to remember

## 💰 Cost Considerations

- **Route 53 Hosted Zone**: ~$0.50/month
- **ACM Certificate**: Free (AWS managed)
- **CloudFront Custom Domain**: No additional cost
- **ALB Custom Domain**: No additional cost

Total additional cost: ~$0.50/month for the hosted zone.

## 🔄 Domain Migration

If you want to change domains later:

```bash
# Update configuration
pulumi config set domainName newdomain.com

# Preview changes
pulumi preview

# Deploy new domain setup
pulumi up

# The old domain will still work until you remove it
```

## 📋 Without Custom Domain

If you prefer not to set up a custom domain, your application will continue to work with:
- **Frontend**: CloudFront distribution URL (e.g., `https://d123.cloudfront.net`)
- **API**: ALB DNS name (e.g., `http://words-wall-alb-123.amazonaws.com`)

Simply don't set the `domainName` configuration and everything works with default URLs.

## 🎯 Quick Setup Commands

```bash
# 1. Set your domain
cd infrastructure/
pulumi config set domainName yourdomain.com

# 2. Deploy infrastructure with domain
pulumi up

# 3. Test your domain
curl https://yourdomain.com
curl https://api.yourdomain.com/health

# 4. Deploy frontend with custom domain
npm run frontend:deploy
```

That's it! Your Words Wall application will be available at your custom domain with full SSL security! 🎉