import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface SecurityGroups {
    albSecurityGroupId: pulumi.Output<string>;
    ecsSecurityGroupId: pulumi.Output<string>;
    rdsSecurityGroupId: pulumi.Output<string>;
}

export function createSecurityGroups(
    resourcePrefix: string,
    vpcId: pulumi.Output<string>,
    tags: Record<string, string>
): SecurityGroups {
    // ALB Security Group
    const albSecurityGroup = new aws.ec2.SecurityGroup("alb-sg", {
        namePrefix: `${resourcePrefix}-alb-`,
        description: "Security group for Words Wall Application Load Balancer",
        vpcId,
        ingress: [
            {
                fromPort: 80,
                toPort: 80,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"],
                description: "HTTP",
            },
            {
                fromPort: 443,
                toPort: 443,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"],
                description: "HTTPS",
            },
        ],
        egress: [
            {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
        tags,
    });

    // ECS Security Group
    const ecsSecurityGroup = new aws.ec2.SecurityGroup("ecs-sg", {
        namePrefix: `${resourcePrefix}-ecs-`,
        description: "Security group for Words Wall ECS tasks",
        vpcId,
        ingress: [
            {
                fromPort: 3001,
                toPort: 3001,
                protocol: "tcp",
                securityGroups: [albSecurityGroup.id],
                description: "Allow ALB to reach ECS on port 3001",
            },
            {
                fromPort: 11434,
                toPort: 11434,
                protocol: "tcp",
                self: true,
                description: "Allow internal Ollama communication",
            },
        ],
        egress: [
            {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
        tags,
    });

    // RDS Security Group
    const rdsSecurityGroup = new aws.ec2.SecurityGroup("rds-sg", {
        namePrefix: `${resourcePrefix}-rds-`,
        description: "Security group for Words Wall RDS database",
        vpcId,
        ingress: [
            {
                fromPort: 5432,
                toPort: 5432,
                protocol: "tcp",
                securityGroups: [ecsSecurityGroup.id],
                description: "Allow ECS to reach RDS on port 5432",
            },
        ],
        egress: [
            {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
        tags,
    });

    return {
        albSecurityGroupId: albSecurityGroup.id,
        ecsSecurityGroupId: ecsSecurityGroup.id,
        rdsSecurityGroupId: rdsSecurityGroup.id,
    };
}