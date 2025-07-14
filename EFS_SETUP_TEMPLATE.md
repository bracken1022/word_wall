# EFS Setup for Words Wall

## After creating EFS file system and access points, update the task definition:

Replace these values in `.aws/task-definition.json`:

```json
{
  "volumes": [
    {
      "name": "efs-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "YOUR_EFS_FILE_SYSTEM_ID",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "YOUR_DATABASE_ACCESS_POINT_ID"
        }
      }
    },
    {
      "name": "efs-uploads",
      "efsVolumeConfiguration": {
        "fileSystemId": "YOUR_EFS_FILE_SYSTEM_ID",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "YOUR_UPLOADS_ACCESS_POINT_ID"
        }
      }
    }
  ]
}
```

## Mount Points in Container:
```json
{
  "mountPoints": [
    {
      "sourceVolume": "efs-data",
      "containerPath": "/app/data",
      "readOnly": false
    },
    {
      "sourceVolume": "efs-uploads",
      "containerPath": "/app/uploads",
      "readOnly": false
    }
  ]
}
```

## Security Group Rules:
- **Type**: NFS
- **Protocol**: TCP
- **Port**: 2049
- **Source**: ECS security group or VPC CIDR (e.g., 10.0.0.0/16)