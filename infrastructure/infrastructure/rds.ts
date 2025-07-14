import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface RDS {
    endpoint: pulumi.Output<string>;
    port: pulumi.Output<number>;
    dbName: pulumi.Output<string>;
    dbInstanceIdentifier: pulumi.Output<string>;
}

export function createRDS(
    resourcePrefix: string,
    _vpcId: pulumi.Output<string>,
    privateSubnetIds: pulumi.Output<string[]>,
    rdsSecurityGroupId: pulumi.Output<string>,
    tags: Record<string, string>
): RDS {
    // Create DB subnet group
    const dbSubnetGroup = new aws.rds.SubnetGroup("db-subnet-group", {
        name: `${resourcePrefix}-db-subnet-group`,
        subnetIds: privateSubnetIds,
        tags,
    });

    // Create RDS parameter group
    const dbParameterGroup = new aws.rds.ParameterGroup("db-parameter-group", {
        family: "postgres15",
        name: `${resourcePrefix}-postgres15`,
        description: "PostgreSQL 15 parameter group for Words Wall",
        parameters: [
            {
                name: "shared_preload_libraries",
                value: "pg_stat_statements",
            },
            {
                name: "log_statement",
                value: "all",
            },
        ],
        tags,
    });

    // Note: Using RDS managed master user password feature instead of Secrets Manager
    // AWS will automatically create and manage the password

    // Create RDS instance
    const dbInstance = new aws.rds.Instance("db-instance", {
        identifier: `${resourcePrefix}-db`,
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        storageType: "gp2",
        engine: "postgres",
        engineVersion: "15.7",
        instanceClass: "db.t3.micro",
        dbName: "wordswall",
        username: "wordswall",
        manageMasterUserPassword: true,
        vpcSecurityGroupIds: [rdsSecurityGroupId],
        dbSubnetGroupName: dbSubnetGroup.name,
        parameterGroupName: dbParameterGroup.name,
        backupRetentionPeriod: 7,
        backupWindow: "03:00-04:00",
        maintenanceWindow: "Sun:04:00-Sun:05:00",
        storageEncrypted: true,
        deletionProtection: false, // Set to true in production
        skipFinalSnapshot: true, // Set to false in production
        publiclyAccessible: false,
        tags,
    });

    return {
        endpoint: dbInstance.endpoint,
        port: dbInstance.port,
        dbName: dbInstance.dbName!,
        dbInstanceIdentifier: dbInstance.identifier,
    };
}