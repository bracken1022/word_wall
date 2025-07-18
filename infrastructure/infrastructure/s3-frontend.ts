import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface S3Frontend {
    bucketId: pulumi.Output<string>;
    bucketArn: pulumi.Output<string>;
    bucketDomainName: pulumi.Output<string>;
    websiteUrl: pulumi.Output<string>;
}

export function createS3Frontend(
    resourcePrefix: string,
    region: string,
    tags: Record<string, string>
): S3Frontend {
    // S3 Bucket for frontend
    const frontendBucket = new aws.s3.Bucket("frontend-bucket", {
        bucket: "words-wall-frontend-production-1752396973474",
        tags,
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

    return {
        bucketId: frontendBucket.id,
        bucketArn: frontendBucket.arn,
        bucketDomainName: frontendBucket.bucketDomainName,
        websiteUrl: pulumi.interpolate`http://${frontendBucket.id}.s3-website-${region}.amazonaws.com`,
    };
}