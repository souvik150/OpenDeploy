import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { config } from "../config";

const ecsClient = new ECSClient({
  region: config.aws.region || "us-east-1",
  credentials: {
    accessKeyId: config.aws.accessKeyId || "",
    secretAccessKey: config.aws.secretAccessKey || "",
  },
});

export async function runEcsTask(
  projectId: string,
  deploymentId: string,
  gitURL: string
) {
  const command = new RunTaskCommand({
    cluster: config.aws.cluster,
    taskDefinition: config.aws.task,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: config.aws.subnetGroupIds,
        securityGroups: config.aws.securityGroupIds,
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: config.aws.builderImageName,
          environment: [
            { name: "GIT_REPOSITORY__URL", value: gitURL },
            { name: "PROJECT_ID", value: projectId },
            { name: "DEPLOYMENT_ID", value: deploymentId },
          ],
        },
      ],
    },
  });

  return ecsClient.send(command);
}
