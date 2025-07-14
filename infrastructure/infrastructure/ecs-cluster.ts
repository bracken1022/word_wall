import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface ECSCluster {
    clusterArn: pulumi.Output<string>;
    clusterName: pulumi.Output<string>;
    executionRoleArn: pulumi.Output<string>;
    taskRoleArn: pulumi.Output<string>;
}

export function createECSCluster(
    resourcePrefix: string,
    tags: Record<string, string>
): ECSCluster {
    // ECS Cluster
    const cluster = new aws.ecs.Cluster("cluster", {
        name: `${resourcePrefix}-cluster`,
        settings: [
            {
                name: "containerInsights",
                value: "enabled",
            },
        ],
        tags,
    });

    // ECS Task Execution Role
    const executionRole = new aws.iam.Role("ecs-execution-role", {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Principal: {
                        Service: "ecs-tasks.amazonaws.com",
                    },
                },
            ],
        }),
        tags,
    });

    // Attach the managed execution role policy
    new aws.iam.RolePolicyAttachment("ecs-execution-role-policy", {
        role: executionRole.name,
        policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    // Add Secrets Manager permissions to execution role
    new aws.iam.RolePolicy("ecs-execution-secrets-policy", {
        role: executionRole.id,
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        "secretsmanager:GetSecretValue",
                    ],
                    Resource: "*",
                },
                {
                    Effect: "Allow",
                    Action: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    Resource: "*",
                },
            ],
        }),
    });

    // ECS Task Role (for application permissions)
    const taskRole = new aws.iam.Role("ecs-task-role", {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "sts:AssumeRole",
                    Effect: "Allow",
                    Principal: {
                        Service: "ecs-tasks.amazonaws.com",
                    },
                },
            ],
        }),
        tags,
    });

    // Add application-specific permissions to task role if needed
    new aws.iam.RolePolicy("ecs-task-app-policy", {
        role: taskRole.id,
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    Resource: "*",
                },
            ],
        }),
    });

    return {
        clusterArn: cluster.arn,
        clusterName: cluster.name,
        executionRoleArn: executionRole.arn,
        taskRoleArn: taskRole.arn,
    };
}