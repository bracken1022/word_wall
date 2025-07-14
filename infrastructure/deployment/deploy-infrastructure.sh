#!/bin/bash

# Deploy infrastructure using Pulumi
# This script handles infrastructure changes like security groups, secrets, load balancers, etc.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/.."

# Configuration
STACK_NAME="production"
PULUMI_ORG="words-wall"

# Parse command line arguments
PREVIEW=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --preview)
            PREVIEW=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --stack)
            STACK_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --preview         Show what would be deployed without making changes"
            echo "  --dry-run         Alias for --preview"
            echo "  --stack NAME      Pulumi stack name (default: production)"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

if [[ "$DRY_RUN" == "true" ]]; then
    PREVIEW=true
fi

echo "🏗️  Deploying Words Wall Infrastructure"
echo "======================================"
echo "Stack: $STACK_NAME"
echo "Mode: $([ "$PREVIEW" == "true" ] && echo "Preview" || echo "Deploy")"
echo ""

# Change to infrastructure directory
cd "$INFRA_DIR"

# Check if Pulumi is installed
if ! command -v pulumi &> /dev/null; then
    echo "❌ Pulumi is required but not installed"
    echo "Install it from: https://www.pulumi.com/docs/get-started/install/"
    exit 1
fi

# Check if stack exists, create if not
echo "🔍 Checking Pulumi stack..."
if ! pulumi stack select "$STACK_NAME" 2>/dev/null; then
    echo "📋 Creating new stack: $STACK_NAME"
    pulumi stack init "$STACK_NAME"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set configuration if needed
echo "⚙️  Setting configuration..."
pulumi config set aws:region ap-southeast-1
pulumi config set environment production

# Run Pulumi
if [[ "$PREVIEW" == "true" ]]; then
    echo "👀 Previewing infrastructure changes..."
    pulumi preview --detailed-diff
else
    echo "🚀 Deploying infrastructure..."
    pulumi up --yes
    
    echo ""
    echo "✅ Infrastructure deployment completed!"
    echo ""
    echo "📋 Outputs:"
    pulumi stack output --json | jq '.'
fi

echo ""
echo "🔧 Next steps:"
echo "1. Update task definition secrets ARNs if needed"
echo "2. Deploy backend: ./deployment/deploy-backend.sh --build --push"
echo "3. Deploy frontend: ./deployment/deploy-frontend.sh"