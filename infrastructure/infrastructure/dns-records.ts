import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface DNSRecords {
    frontendRecord?: aws.route53.Record;
    apiRecord?: aws.route53.Record;
}

export function createDNSRecords(
    hostedZoneId: pulumi.Output<string>,
    domainName: string,
    apiDomainName: string,
    cloudfrontDomainName: pulumi.Output<string>,
    cloudfrontZoneId: pulumi.Output<string>,
    albDnsName: pulumi.Output<string>,
    albZoneId: pulumi.Output<string>,
    _tags: Record<string, string>
): DNSRecords {
    // Frontend DNS record pointing to CloudFront
    const frontendRecord = new aws.route53.Record("frontend-dns", {
        name: domainName,
        type: "A",
        zoneId: hostedZoneId,
        aliases: [
            {
                name: cloudfrontDomainName,
                zoneId: cloudfrontZoneId,
                evaluateTargetHealth: false,
            },
        ],
    });

    // API DNS record pointing to ALB
    const apiRecord = new aws.route53.Record("api-dns", {
        name: apiDomainName,
        type: "A",
        zoneId: hostedZoneId,
        aliases: [
            {
                name: albDnsName,
                zoneId: albZoneId,
                evaluateTargetHealth: true,
            },
        ],
    });

    return {
        frontendRecord,
        apiRecord,
    };
}