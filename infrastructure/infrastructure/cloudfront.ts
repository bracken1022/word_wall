import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface CloudFront {
    distributionId: pulumi.Output<string>;
    distributionUrl: pulumi.Output<string>;
    distributionArn: pulumi.Output<string>;
}

export function createCloudFront(
    resourcePrefix: string,
    s3BucketDomainName: pulumi.Output<string>,
    albDnsName: pulumi.Output<string>,
    tags: Record<string, string>,
    certificateArn?: pulumi.Output<string>,
    domainName?: string
): CloudFront {
    const cloudfrontDistribution = new aws.cloudfront.Distribution("frontend-cdn", {
        origins: [
            {
                originId: "S3Origin",
                domainName: s3BucketDomainName,
                s3OriginConfig: {
                    originAccessIdentity: "",
                },
            },
            {
                originId: "ALBOrigin",
                domainName: albDnsName,
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
        comment: `${resourcePrefix} Frontend Distribution`,
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
            {
                pathPattern: "/stickers/*",
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
        viewerCertificate: certificateArn ? {
            acmCertificateArn: certificateArn,
            sslSupportMethod: "sni-only",
            minimumProtocolVersion: "TLSv1.2_2021",
        } : {
            cloudfrontDefaultCertificate: true,
        },
        aliases: domainName ? [domainName] : undefined,
        priceClass: "PriceClass_100",
        tags,
    });

    return {
        distributionId: cloudfrontDistribution.id,
        distributionUrl: pulumi.interpolate`https://${cloudfrontDistribution.domainName}`,
        distributionArn: cloudfrontDistribution.arn,
    };
}