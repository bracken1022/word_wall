# 🗄️ RDS Setup for Words Wall

## After creating your RDS instance, follow these steps:

### 1. Get RDS Connection Details

From AWS Console → RDS → Databases → words-wall-db:
- **Endpoint**: `words-wall-db.xxxxxx.ap-southeast-1.rds.amazonaws.com`
- **Port**: `5432` (PostgreSQL) or `3306` (MySQL)
- **Username**: `wordswall`
- **Password**: The password you created
- **Database**: `wordswall`

### 2. Update Task Definition

Replace in `.aws/task-definition.json`:

```json
{
  "name": "DATABASE_URL",
  "value": "postgresql://wordswall:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/wordswall"
}
```

**Example:**
```json
{
  "name": "DATABASE_URL", 
  "value": "postgresql://wordswall:mypassword123@words-wall-db.abc123.ap-southeast-1.rds.amazonaws.com:5432/wordswall"
}
```

### 3. Security Configuration

**RDS Security Group** needs to allow:
- **Type**: PostgreSQL
- **Port**: 5432
- **Source**: ECS tasks security group or VPC CIDR (10.0.0.0/16)

### 4. Database Migration (First Time)

Since we're switching from SQLite to PostgreSQL, you'll need to:

1. **Let TypeORM create tables** (synchronize is disabled in production)
2. **Or create migration scripts**

### 5. Optional: Use AWS Secrets Manager

For better security, store database credentials in Secrets Manager:

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:216673926326:secret:words-wall/database-url"
    }
  ]
}
```

### 6. Cost Optimization

- **Free Tier**: db.t3.micro (750 hours/month free)
- **Storage**: 20 GB General Purpose SSD (free tier)
- **Backup**: 7 days retention
- **Multi-AZ**: Disable for development, enable for production

### 7. Monitoring

- Enable Enhanced Monitoring
- Set up CloudWatch alarms for:
  - CPU utilization > 80%
  - Database connections > 80% of max
  - Free storage space < 2GB

### 8. Backup Strategy

- **Automated backups**: 7-30 days retention
- **Manual snapshots**: Before major updates
- **Cross-region backup**: For disaster recovery

## Quick RDS Creation Script

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier words-wall-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username wordswall \
  --master-user-password YOUR_STRONG_PASSWORD \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-name wordswall \
  --backup-retention-period 7 \
  --storage-encrypted \
  --region ap-southeast-1
```

## Benefits of RDS vs SQLite + EFS

✅ **Automatic backups and point-in-time recovery**  
✅ **High availability with Multi-AZ deployment**  
✅ **Automatic software patching**  
✅ **Better performance for concurrent users**  
✅ **Read replicas for scaling**  
✅ **Built-in monitoring and metrics**  