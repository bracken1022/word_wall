import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface LoadBalancer {
    albArn: pulumi.Output<string>;
    albDnsName: pulumi.Output<string>;
    albZoneId: pulumi.Output<string>;
    targetGroupArn: pulumi.Output<string>;
}

export function createLoadBalancer(
    resourcePrefix: string,
    publicSubnetIds: pulumi.Output<string[]>,
    albSecurityGroupId: pulumi.Output<string>,
    tags: Record<string, string>,
    certificateArn?: pulumi.Output<string>
): LoadBalancer {
    // Application Load Balancer
    const applicationLoadBalancer = new aws.lb.LoadBalancer("alb", {
        name: `${resourcePrefix}-alb`,
        loadBalancerType: "application",
        internal: false,
        securityGroups: [albSecurityGroupId],
        subnets: publicSubnetIds,
        enableDeletionProtection: false,
        tags,
    });

    // Target Group for ECS service
    const ecsTargetGroup = new aws.lb.TargetGroup("backend-tg", {
        name: `${resourcePrefix}-backend-tg`,
        port: 3001,
        protocol: "HTTP",
        targetType: "ip",
        vpcId: aws.ec2.getVpc({ default: true }).then(vpc => vpc.id),
        healthCheck: {
            enabled: true,
            path: "/health",
            port: "traffic-port",
            protocol: "HTTP",
            healthyThreshold: 2,
            unhealthyThreshold: 3,
            timeout: 5,
            interval: 30,
            matcher: "200",
        },
        tags,
    });

    // ALB HTTP Listener (redirect to HTTPS if certificate provided)
    new aws.lb.Listener("alb-http-listener", {
        loadBalancerArn: applicationLoadBalancer.arn,
        port: 80,
        protocol: "HTTP",
        defaultActions: certificateArn ? [
            {
                type: "redirect",
                redirect: {
                    port: "443",
                    protocol: "HTTPS",
                    statusCode: "HTTP_301",
                },
            },
        ] : [
            {
                type: "forward",
                targetGroupArn: ecsTargetGroup.arn,
            },
        ],
    });

    // ALB HTTPS Listener (if certificate provided)
    if (certificateArn) {
        new aws.lb.Listener("alb-https-listener", {
            loadBalancerArn: applicationLoadBalancer.arn,
            port: 443,
            protocol: "HTTPS",
            sslPolicy: "ELBSecurityPolicy-TLS-1-2-2017-01",
            certificateArn: certificateArn,
            defaultActions: [
                {
                    type: "forward",
                    targetGroupArn: ecsTargetGroup.arn,
                },
            ],
        });
    }

    return {
        albArn: applicationLoadBalancer.arn,
        albDnsName: applicationLoadBalancer.dnsName,
        albZoneId: applicationLoadBalancer.zoneId,
        targetGroupArn: ecsTargetGroup.arn,
    };
}