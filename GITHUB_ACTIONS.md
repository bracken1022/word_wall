# 🚀 GitHub Actions CI/CD Documentation

This document explains the comprehensive GitHub Actions workflows set up for the Words Wall project.

## 🔄 Workflow Overview

### 1. 🧪 **Continuous Integration** (`ci.yml`)
**Triggers**: Push/PR to main/develop
**Purpose**: Run tests, linting, security audits

```yaml
# Runs on every push and pull request
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

**Jobs:**
- **Backend CI**: Tests, linting, building
- **Frontend CI**: Tests, linting, building
- **Security Audit**: Vulnerability scanning
- **Dependency Check**: Outdated packages
- **CI Summary**: Results overview

### 2. 🚀 **Backend Deployment** (`deploy-backend.yml`)
**Triggers**: Push to main (backend changes)
**Purpose**: Deploy backend to AWS ECS

```yaml
# Triggers only when backend files change
on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'
```

**Pipeline:**
1. **Test**: Run backend tests
2. **Build**: Create Docker image
3. **Push**: Upload to ECR
4. **Deploy**: Update ECS service

### 3. 🌐 **Frontend Deployment** (`deploy-frontend.yml`)
**Triggers**: Push to main (frontend changes)
**Purpose**: Deploy frontend to Vercel

```yaml
# Separate pipeline for frontend
on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
```

**Features:**
- **Preview Deployments**: For pull requests
- **Production Deployments**: For main branch
- **PR Comments**: Preview URLs in comments

### 4. 🎉 **Release Management** (`release.yml`)
**Triggers**: Git tags (v*) or manual
**Purpose**: Create releases and deploy

```yaml
# Automatic releases on version tags
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
```

**Process:**
1. **Generate Changelog**: From git commits
2. **Build Artifacts**: Compiled packages
3. **Docker Release**: Tagged images
4. **Deploy**: Production deployment

### 5. 🔧 **Maintenance** (`maintenance.yml`)
**Triggers**: Daily schedule (2 AM UTC)
**Purpose**: Automated maintenance tasks

```yaml
# Daily maintenance checks
on:
  schedule:
    - cron: '0 2 * * *'
```

**Tasks:**
- **Dependency Updates**: Check for outdated packages
- **Health Checks**: Monitor application status
- **Performance**: Response time monitoring
- **Cleanup**: Remove old workflow runs
- **Backup**: Verify backup status

## 🔧 Setup Instructions

### 1. **Repository Secrets**

Add these secrets in GitHub Settings → Secrets and variables → Actions:

#### AWS Deployment
```bash
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Vercel Deployment
```bash
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxx
```

### 2. **Repository Variables**

Add these variables for monitoring:

```bash
PRODUCTION_URL=https://your-backend-url.com
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### 3. **Branch Protection Rules**

Set up branch protection for `main`:

```yaml
Required status checks:
  - backend-ci
  - frontend-ci
  - security-audit

Restrictions:
  - Require pull request reviews
  - Dismiss stale reviews
  - Require status checks to pass
```

## 📋 Workflow Details

### CI Pipeline Features

#### 🔍 **Code Quality**
- **ESLint**: Code style and error checking
- **Prettier**: Code formatting validation
- **TypeScript**: Type checking
- **Tests**: Unit and integration tests

#### 🛡️ **Security**
- **npm audit**: Vulnerability scanning
- **CodeQL**: Static analysis
- **Dependency scanning**: Security advisories

#### 📊 **Reporting**
- **Coverage reports**: Test coverage metrics
- **Build artifacts**: Compiled applications
- **Summary reports**: Job status overview

### Deployment Pipeline Features

#### 🐳 **Backend (AWS ECS)**
- **Docker build**: Multi-stage optimized build
- **ECR push**: Private registry storage
- **ECS deployment**: Rolling update strategy
- **Health checks**: Zero-downtime deployment

#### 🌐 **Frontend (Vercel)**
- **Next.js build**: Optimized production build
- **Preview deployments**: Branch previews
- **Production deployment**: Global CDN
- **Performance optimization**: Automatic optimizations

## 🎯 Usage Examples

### 1. **Regular Development**
```bash
# Create feature branch
git checkout -b feature/new-mobile-component

# Make changes and commit
git add .
git commit -m "✨ feat: add new mobile component"

# Push and create PR
git push origin feature/new-mobile-component
# Create PR in GitHub → CI runs automatically
```

### 2. **Creating a Release**
```bash
# Tag a new version
git tag v1.2.0
git push origin v1.2.0

# Or manually trigger release workflow
# GitHub → Actions → Release Management → Run workflow
```

### 3. **Hotfix Deployment**
```bash
# For urgent backend fixes
git checkout main
git commit -m "🐛 fix: critical security patch"
git push origin main
# Backend deployment triggers automatically

# For frontend fixes
git commit -m "🐛 fix: mobile layout issue"
git push origin main
# Frontend deployment triggers automatically
```

## 📊 Monitoring & Maintenance

### Daily Automated Checks
- **2 AM UTC**: Maintenance workflow runs
- **Dependency updates**: Checks for outdated packages
- **Security audits**: Scans for vulnerabilities
- **Health monitoring**: Verifies application status
- **Performance tracking**: Monitors response times

### Manual Maintenance
- **Weekly**: Review dependency update reports
- **Monthly**: Test backup restoration
- **Quarterly**: Review and update workflows

## 🚨 Troubleshooting

### Common Issues

#### ❌ **Deployment Failures**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify ECR repository exists
aws ecr describe-repositories --repository-names words-wall-backend

# Check ECS service status
aws ecs describe-services --cluster words-wall-cluster --services words-wall-backend-service
```

#### ❌ **Build Failures**
```bash
# Local testing
cd backend && yarn test
cd frontend && yarn build

# Check Node.js version
node --version # Should be 20.11+
```

#### ❌ **Permission Issues**
```bash
# Verify GitHub secrets are set
# Settings → Secrets and variables → Actions

# Check IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name github-actions-words-wall
```

### Debug Commands

#### Check Workflow Status
```bash
# Using GitHub CLI
gh run list --workflow=ci.yml
gh run view --log RUN_ID

# Check specific job
gh run view RUN_ID --job backend-ci
```

#### Local Docker Testing
```bash
# Test backend Docker build
cd backend
docker build -t words-wall-backend:test .
docker run -p 3001:3001 words-wall-backend:test

# Test health endpoint
curl http://localhost:3001/health
```

## 📈 Performance Optimization

### Workflow Speed Improvements
- **Caching**: Node.js dependencies cached
- **Parallel jobs**: CI jobs run in parallel
- **Conditional runs**: Only run when files change
- **Artifact reuse**: Share builds between jobs

### Cost Optimization
- **Path filters**: Only run relevant workflows
- **Cleanup**: Automatic removal of old runs
- **Scheduled maintenance**: Off-peak hours
- **Efficient Docker builds**: Multi-stage builds

## 🔮 Future Enhancements

### Planned Improvements
- **E2E Testing**: Playwright integration
- **Load Testing**: Performance benchmarking
- **A/B Testing**: Feature flag deployments
- **Mobile Testing**: Device farm integration
- **Monitoring**: Advanced observability

### Advanced Features
- **Blue/Green Deployments**: Zero-downtime updates
- **Canary Releases**: Gradual rollouts
- **Auto-scaling**: Dynamic capacity management
- **Multi-region**: Global deployment strategy

---

## 📞 Support

- **Workflow Issues**: Check GitHub Actions logs
- **AWS Issues**: Review CloudWatch logs
- **Vercel Issues**: Check Vercel dashboard
- **General**: Create GitHub issue with workflow logs