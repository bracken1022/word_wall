import * as pulumi from "@pulumi/pulumi";

// Import infrastructure modules
import { createVpcResources } from "./infrastructure/vpc";
import { createSecretsManager } from "./infrastructure/secrets";
import { createSecurityGroups } from "./infrastructure/security-groups";
import { createLoadBalancer } from "./infrastructure/load-balancer";
import { createS3Frontend } from "./infrastructure/s3-frontend";
import { createCloudFront } from "./infrastructure/cloudfront";
import { createECSCluster } from "./infrastructure/ecs-cluster";
import { createRDS } from "./infrastructure/rds";
import { createDomainConfiguration } from "./infrastructure/domain";
import { createDNSRecords } from "./infrastructure/dns-records";

// Get configuration
const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");
const region = awsConfig.require("region");
const environment = config.get("environment") || "production";
const projectName = "words-wall";

// Domain configuration (optional)
const domainName = config.get("domainName"); // e.g., "wordswall.example.com"

// Tags for all resources
export const commonTags = {
    Project: projectName,
    Environment: environment,
    ManagedBy: "pulumi",
};

export const resourcePrefix = `${projectName}-${environment}`;

// ===== INFRASTRUCTURE SETUP =====
// 1. VPC and Networking
const vpcResources = createVpcResources(commonTags);

// 2. Domain Configuration (optional)
const domainConfig = domainName ? createDomainConfiguration(
    resourcePrefix,
    domainName,
    commonTags
) : undefined;

// 3. Secrets Manager
const secrets = createSecretsManager(resourcePrefix, commonTags);

// 4. Security Groups  
const securityGroups = createSecurityGroups(
    resourcePrefix,
    vpcResources.vpcId,
    commonTags
);

// 5. Load Balancer
const loadBalancer = createLoadBalancer(
    resourcePrefix,
    vpcResources.publicSubnetIds,
    securityGroups.albSecurityGroupId,
    commonTags,
    domainConfig?.certificateArn
);

// 6. S3 Frontend
const s3Frontend = createS3Frontend(
    resourcePrefix,
    region,
    commonTags
);

// 7. CloudFront Distribution
const cloudfront = createCloudFront(
    resourcePrefix,
    s3Frontend.bucketDomainName,
    loadBalancer.albDnsName,
    commonTags,
    domainConfig?.certificateArn,
    domainConfig?.domainName
);

// 8. ECS Cluster (infrastructure only, no services)
const ecsCluster = createECSCluster(
    resourcePrefix,
    commonTags
);

// 9. DNS Records (if domain configured)
if (domainConfig) {
    createDNSRecords(
        domainConfig.hostedZoneId,
        domainConfig.domainName,
        domainConfig.apiDomainName,
        cloudfront.distributionUrl.apply(url => url.replace("https://", "")),
        pulumi.output("Z2FDTNDATAQYW2"), // CloudFront hosted zone ID (global)
        loadBalancer.albDnsName,
        loadBalancer.albZoneId,
        commonTags
    );
}

// 10. RDS Database
const rds = createRDS(
    resourcePrefix,
    vpcResources.vpcId,
    vpcResources.publicSubnetIds, // Use public subnets since default VPC doesn't have private ones
    securityGroups.rdsSecurityGroupId,
    commonTags
);


// ===== OUTPUTS =====
// Frontend Infrastructure
export const frontendBucketName = s3Frontend.bucketId;
export const frontendBucketWebsiteUrl = s3Frontend.websiteUrl;
export const cloudfrontUrl = cloudfront.distributionUrl;
export const cloudfrontDistributionId = cloudfront.distributionId;

// Load Balancer
export const albDnsName = loadBalancer.albDnsName;
export const albZoneId = loadBalancer.albZoneId;
export const albArn = loadBalancer.albArn;
export const targetGroupArn = loadBalancer.targetGroupArn;

// Security Groups
export const albSecurityGroupId = securityGroups.albSecurityGroupId;
export const ecsSecurityGroupId = securityGroups.ecsSecurityGroupId;
export const rdsSecurityGroupId = securityGroups.rdsSecurityGroupId;

// VPC and Networking
export const vpcId = vpcResources.vpcId;
export const publicSubnetIds = vpcResources.publicSubnetIds;
export const privateSubnetIds = vpcResources.privateSubnetIds;

// ECS Infrastructure
export const ecsClusterName = ecsCluster.clusterName;
export const ecsClusterArn = ecsCluster.clusterArn;

// Database
export const rdsEndpoint = rds.endpoint;
export const rdsPort = rds.port;
export const rdsDbName = rds.dbName;

// Secrets
export const jwtSecretArn = secrets.jwtSecretArn;
export const databaseUrlSecretArn = secrets.databaseUrlSecretArn;

// Domain outputs (if configured)
export const customDomainName = domainConfig?.domainName;
export const apiDomainName = domainConfig?.apiDomainName;
export const certificateArn = domainConfig?.certificateArn;
export const hostedZoneId = domainConfig?.hostedZoneId;

// Configuration for ECS Task Definitions (used by deployment scripts)
export const ecsTaskConfig = {
    cluster: ecsCluster.clusterName,
    securityGroups: [securityGroups.ecsSecurityGroupId],
    subnets: vpcResources.publicSubnetIds, // Use public subnets since default VPC doesn't have private ones
    targetGroupArn: loadBalancer.targetGroupArn,
    secrets: {
        jwtSecret: secrets.jwtSecretArn,
        databaseUrl: secrets.databaseUrlSecretArn,
    },
};