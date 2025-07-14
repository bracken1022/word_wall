import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Get configuration
const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");
const region = awsConfig.require("region");
const environment = config.get("environment") || "production";

// Tags for all resources
const commonTags = {
    Project: "words-wall",
    Environment: environment,
    ManagedBy: "pulumi",
};

// Get default VPC and subnets
const defaultVpc = aws.ec2.getVpc({
    default: true,
});

const publicSubnets = defaultVpc.then(vpc => aws.ec2.getSubnets({
    filters: [
        {
            name: "vpc-id",
            values: [vpc.id],
        },
        {
            name: "map-public-ip-on-launch",
            values: ["true"],
        },
    ],
}));

const privateSubnets = defaultVpc.then(vpc => aws.ec2.getSubnets({
    filters: [
        {
            name: "vpc-id",
            values: [vpc.id],
        },
        {
            name: "map-public-ip-on-launch",
            values: ["false"],
        },
    ],
}));

// ===== S3 BUCKET FOR FRONTEND =====
const frontendBucket = new aws.s3.Bucket("words-wall-frontend", {
    bucket: `words-wall-frontend-${environment}-${Date.now()}`,
    tags: commonTags,
});

// Configure bucket for static website hosting
new aws.s3.BucketWebsiteConfigurationV2("frontend-website", {
    bucket: frontendBucket.id,
    indexDocument: {
        suffix: "index.html",
    },
    errorDocument: {
        key: "404.html",
    },
});

// Disable public access block for static hosting
const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock("frontend-public-access", {
    bucket: frontendBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

// Bucket policy for public read access
new aws.s3.BucketPolicy("frontend-bucket-policy", {
    bucket: frontendBucket.id,
    policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "${frontendBucket.arn}/*"
            }
        ]
    }`,
}, { dependsOn: [bucketPublicAccessBlock] });

// ===== APPLICATION LOAD BALANCER =====
// ALB Security Group
const albSecurityGroup = new aws.ec2.SecurityGroup("words-wall-alb-sg", {
    namePrefix: "words-wall-alb-",
    description: "Security group for Words Wall Application Load Balancer",
    vpcId: defaultVpc.then(vpc => vpc.id),
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
    tags: commonTags,
});

// Application Load Balancer
const applicationLoadBalancer = new aws.lb.LoadBalancer("words-wall-alb", {
    name: "words-wall-alb",
    loadBalancerType: "application",
    internal: false,
    securityGroups: [albSecurityGroup.id],
    subnets: publicSubnets.then(subnets => subnets.ids),
    enableDeletionProtection: false,
    tags: commonTags,
});

// Target Group for ECS service
const ecsTargetGroup = new aws.lb.TargetGroup("words-wall-backend-tg", {
    name: "words-wall-backend-tg",
    port: 3001,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: defaultVpc.then(vpc => vpc.id),
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
    tags: commonTags,
});

// ALB HTTP Listener (keep HTTP for now to avoid certificate complexity)
new aws.lb.Listener("words-wall-alb-http-listener", {
    loadBalancerArn: applicationLoadBalancer.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [
        {
            type: "forward",
            targetGroupArn: ecsTargetGroup.arn,
        },
    ],
});

// ===== CLOUDFRONT DISTRIBUTION =====
const cloudfrontDistribution = new aws.cloudfront.Distribution("words-wall-frontend-cdn", {
    origins: [
        {
            originId: "S3Origin",
            domainName: frontendBucket.bucketDomainName,
            s3OriginConfig: {
                originAccessIdentity: "",
            },
        },
        {
            originId: "ALBOrigin",
            domainName: applicationLoadBalancer.dnsName,
            customOriginConfig: {
                httpPort: 80,
                httpsPort: 443,
                originProtocolPolicy: "http-only",
                originSslProtocols: ["TLSv1.2"],
            },
        },
    ],
    enabled: true,
    isIpv6Enabled: true,
    comment: "Words Wall Frontend Distribution",
    defaultRootObject: "index.html",
    defaultCacheBehavior: {
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        targetOriginId: "S3Origin",
        compress: true,
        viewerProtocolPolicy: "redirect-to-https",
        minTtl: 0,
        defaultTtl: 86400,
        maxTtl: 31536000,
        forwardedValues: {
            queryString: false,
            cookies: {
                forward: "none",
            },
        },
    },
    orderedCacheBehaviors: [
        {
            pathPattern: "/api/*",
            targetOriginId: "ALBOrigin",
            allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
            cachedMethods: ["GET", "HEAD", "OPTIONS"],
            viewerProtocolPolicy: "redirect-to-https",
            minTtl: 0,
            defaultTtl: 0,
            maxTtl: 0,
            forwardedValues: {
                queryString: true,
                headers: ["*"],
                cookies: {
                    forward: "all",
                },
            },
        },
        {
            pathPattern: "/auth/*",
            targetOriginId: "ALBOrigin",
            allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
            cachedMethods: ["GET", "HEAD", "OPTIONS"],
            viewerProtocolPolicy: "redirect-to-https",
            minTtl: 0,
            defaultTtl: 0,
            maxTtl: 0,
            forwardedValues: {
                queryString: true,
                headers: ["*"],
                cookies: {
                    forward: "all",
                },
            },
        },
        {
            pathPattern: "/health",
            targetOriginId: "ALBOrigin",
            allowedMethods: ["GET", "HEAD"],
            cachedMethods: ["GET", "HEAD"],
            viewerProtocolPolicy: "redirect-to-https",
            minTtl: 0,
            defaultTtl: 0,
            maxTtl: 0,
            forwardedValues: {
                queryString: false,
                cookies: {
                    forward: "none",
                },
            },
        },
    ],
    customErrorResponses: [
        {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: "/index.html",
        },
    ],
    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },
    viewerCertificate: {
        cloudfrontDefaultCertificate: true,
    },
    priceClass: "PriceClass_100",
    tags: commonTags,
});

// ===== ECS SECURITY GROUP UPDATES =====
// ECS Security Group (will be referenced by existing ECS service)
const ecsSecurityGroup = new aws.ec2.SecurityGroup("words-wall-ecs-sg", {
    namePrefix: "words-wall-ecs-",
    description: "Security group for Words Wall ECS tasks",
    vpcId: defaultVpc.then(vpc => vpc.id),
    ingress: [
        {
            fromPort: 3001,
            toPort: 3001,
            protocol: "tcp",
            securityGroups: [albSecurityGroup.id],
            description: "Allow ALB to reach ECS on port 3001",
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
    tags: commonTags,
});

// ===== RDS SECURITY GROUP (for future RDS setup) =====
const rdsSecurityGroup = new aws.ec2.SecurityGroup("words-wall-rds-sg", {
    namePrefix: "words-wall-rds-",
    description: "Security group for Words Wall RDS database",
    vpcId: defaultVpc.then(vpc => vpc.id),
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
    tags: commonTags,
});

// ===== OUTPUTS =====
export const frontendBucketName = frontendBucket.id;
export const frontendBucketWebsiteUrl = pulumi.interpolate`http://${frontendBucket.id}.s3-website-${region}.amazonaws.com`;
export const cloudfrontUrl = pulumi.interpolate`https://${cloudfrontDistribution.domainName}`;
export const cloudfrontDistributionId = cloudfrontDistribution.id;

export const albDnsName = applicationLoadBalancer.dnsName;
export const albZoneId = applicationLoadBalancer.zoneId;
export const albArn = applicationLoadBalancer.arn;
export const targetGroupArn = ecsTargetGroup.arn;

export const albSecurityGroupId = albSecurityGroup.id;
export const ecsSecurityGroupId = ecsSecurityGroup.id;
export const rdsSecurityGroupId = rdsSecurityGroup.id;

export const vpcId = defaultVpc.then(vpc => vpc.id);
export const publicSubnetIds = publicSubnets.then(subnets => subnets.ids);
export const privateSubnetIds = privateSubnets.then(subnets => subnets.ids);