import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface DomainConfiguration {
    certificateArn: pulumi.Output<string>;
    hostedZoneId: pulumi.Output<string>;
    domainName: string;
    apiDomainName: string;
}

export function createDomainConfiguration(
    resourcePrefix: string,
    domainName: string,
    tags: Record<string, string>
): DomainConfiguration {
    const apiDomainName = `api.${domainName}`;
    
    // Get or create hosted zone for the domain
    const hostedZone = aws.route53.getZone({
        name: domainName,
        privateZone: false,
    });

    // Request ACM certificate for both main domain and API subdomain
    const certificate = new aws.acm.Certificate("ssl-certificate", {
        domainName: domainName,
        subjectAlternativeNames: [
            `*.${domainName}`, // Wildcard for all subdomains
            apiDomainName,
        ],
        validationMethod: "DNS",
        tags: {
            ...tags,
            Name: `${resourcePrefix}-ssl-certificate`,
        },
    });

    // Create DNS validation records
    const certificateValidations = certificate.domainValidationOptions.apply(options => 
        options.map((option, index) => {
            return new aws.route53.Record(`cert-validation-${index}`, {
                name: option.resourceRecordName,
                type: option.resourceRecordType,
                records: [option.resourceRecordValue],
                zoneId: hostedZone.then(zone => zone.zoneId),
                ttl: 60,
            });
        })
    );

    // Wait for certificate validation
    const certificateValidation = new aws.acm.CertificateValidation("certificate-validation", {
        certificateArn: certificate.arn,
        validationRecordFqdns: certificateValidations.apply(validations => 
            validations.map(validation => validation.fqdn)
        ),
    });

    return {
        certificateArn: certificateValidation.certificateArn,
        hostedZoneId: pulumi.output(hostedZone.then(zone => zone.zoneId)),
        domainName,
        apiDomainName,
    };
}