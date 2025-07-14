import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface SecretsManager {
    jwtSecretArn: pulumi.Output<string>;
    databaseUrlSecretArn: pulumi.Output<string>;
}

export function createSecretsManager(
    resourcePrefix: string,
    tags: Record<string, string>
): SecretsManager {
    // JWT Secret
    const jwtSecret = new aws.secretsmanager.Secret("jwt-secret", {
        name: `${resourcePrefix}-jwt-secret`,
        description: "JWT secret for Words Wall application",
        tags,
    });

    new aws.secretsmanager.SecretVersion("jwt-secret-version", {
        secretId: jwtSecret.id,
        secretString: pulumi.secret("your-super-secret-jwt-key-change-this-in-production"),
    });

    // Database URL Secret
    const databaseUrlSecret = new aws.secretsmanager.Secret("database-url-secret", {
        name: `${resourcePrefix}-database-url`,
        description: "Database URL for Words Wall application",
        tags,
    });

    // Note: The actual database URL will be set after RDS is created
    // For now, create placeholder - update this with actual RDS endpoint later
    new aws.secretsmanager.SecretVersion("database-url-version", {
        secretId: databaseUrlSecret.id,
        secretString: pulumi.secret("postgresql://user:password@localhost:5432/wordswall"),
    });

    return {
        jwtSecretArn: jwtSecret.arn,
        databaseUrlSecretArn: databaseUrlSecret.arn,
    };
}