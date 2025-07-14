import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface VpcResources {
    vpcId: pulumi.Output<string>;
    publicSubnetIds: pulumi.Output<string[]>;
    privateSubnetIds: pulumi.Output<string[]>;
}

export function createVpcResources(_tags: Record<string, string>): VpcResources {
    // Get default VPC and subnets (for simplicity, you can create custom VPC later)
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

    return {
        vpcId: pulumi.output(defaultVpc.then(vpc => vpc.id)),
        publicSubnetIds: pulumi.output(publicSubnets.then(subnets => subnets.ids)),
        privateSubnetIds: pulumi.output(privateSubnets.then(subnets => subnets.ids)),
    };
}