# 🔐 AWS Secrets Manager Setup for Database Configuration

## Your Secrets Manager Configuration

Since you've already created the database configuration in Secrets Manager, here's what the setup looks like:

### Secrets Manager Secret Structure:
```json
{
  "username": "wordswall",
  "password": "your-db-password",
  "engine": "postgres",
  "host": "words-wall-db.xxxxxx.ap-southeast-1.rds.amazonaws.com",
  "port": 5432,
  "dbInstanceIdentifier": "wordswall"
}
```

### Task Definition Configuration:
```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:216673926326:secret:words-wall/database-config"
    }
  ]
}
```

## Required IAM Permissions

Your ECS Task Execution Role needs these additional permissions:

### Custom Policy for Secrets Manager:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": [
                "arn:aws:secretsmanager:ap-southeast-1:216673926326:secret:words-wall/database-config*"
            ]
        }
    ]
}
```

### How to Add This Policy:

1. **Go to AWS Console** → **IAM** → **Roles**
2. **Find**: `ecsTaskExecutionRole`
3. **Attach policies** → **Create policy**
4. **JSON tab** → Paste the policy above
5. **Name**: `WordsWallSecretsManagerPolicy`
6. **Attach to role**

## Application Code Changes

The application now:
- ✅ **Parses JSON** from Secrets Manager automatically
- ✅ **Uses individual fields** (host, port, username, password, etc.)
- ✅ **Falls back to SQLite** in development
- ✅ **Handles parsing errors** gracefully

## Benefits of This Approach:

✅ **Secure**: Database credentials never appear in logs  
✅ **Flexible**: Easy to update credentials without code changes  
✅ **Audit Trail**: Secrets Manager logs all access  
✅ **Automatic Rotation**: Can enable automatic password rotation  
✅ **Versioning**: Secrets Manager maintains version history  

## Testing

To test the configuration:
1. **Deploy to ECS** with the updated task definition
2. **Check CloudWatch logs** for database connection status
3. **Verify** the application starts without database errors

## Common Issues:

### Permission Denied:
- Check ECS Task Execution Role has Secrets Manager permissions
- Verify the secret ARN is correct

### JSON Parse Error:
- Ensure the secret value is valid JSON
- Check all required fields are present

### Database Connection Failed:
- Verify RDS security group allows ECS access
- Check database credentials are correct
- Ensure RDS instance is in the same VPC as ECS