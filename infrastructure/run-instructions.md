# How to Deploy the Ollama Backend

## Step 1: Switch to your main AWS credentials

First, you need to switch from the `pulumi-deployment` user to your main AWS credentials. 

**Option A: Use AWS CLI profiles**
```bash
# If you have a main profile setup
aws configure --profile main
export AWS_PROFILE=main
```

**Option B: Temporarily set credentials**
```bash
# Set your main AWS credentials temporarily
export AWS_ACCESS_KEY_ID=YOUR_MAIN_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_MAIN_SECRET_KEY
export AWS_DEFAULT_REGION=ap-southeast-1
```

**Option C: Use aws configure**
```bash
# Reconfigure with your main credentials temporarily
aws configure
# Enter your main AWS Access Key ID
# Enter your main AWS Secret Access Key  
# Enter region: ap-southeast-1
# Enter output format: json
```

## Step 2: Run the deployment script

```bash
cd /Users/weibo/Project/claude_project/words_wall/infrastructure
./quick-deploy.sh
```

## Step 3: Monitor the deployment

```bash
# Watch the deployment progress
aws ecs describe-services --cluster words-wall-cluster --services words-wall-backend-service --query 'services[0].deployments'

# Monitor logs for Ollama startup
aws logs tail /ecs/words-wall-backend --follow
```

## What to look for in the logs:

✅ **Success indicators:**
- `🚀 Starting Words Wall Backend with Ollama...`
- `📡 Starting Ollama server...`
- `✅ Ollama is ready!`
- `📥 Pulling Qwen3:1.7b model...`
- `🎯 Model ready. Starting NestJS application...`

❌ **If you see issues:**
- `❌ Ollama binary not found!` - Will fallback to NestJS only
- `❌ Ollama failed to start` - Will continue without AI

## Step 4: Test Qwen responses

1. Go to your frontend: `http://words-wall-frontend-production-1752396973474.s3-website-ap-southeast-1.amazonaws.com`
2. Create a new word with AI enabled
3. Check logs for: `=== RAW QWEN RESPONSE ===`

## Step 5: Switch back to pulumi credentials (optional)

```bash
# If you want to switch back to pulumi user for infrastructure work
export AWS_PROFILE=default  # or whatever your pulumi profile is
```