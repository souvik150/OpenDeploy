import { prisma } from "../services/prisma";
import { DeployementStatus } from "@open-deploy/prisma-schema";
import { config } from "../config";

export const handleProxyRequest = async (req: any, res: any, proxy: any) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];

  const project = await prisma.project.findFirst({
    where: {
      subDomain: subdomain,
    },
    include: {
      Deployement: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  if (!project.Deployement || project.Deployement.length === 0) {
    return res
      .status(404)
      .json({ error: "No deployment found for this project" });
  }

  const deployment = project.Deployement[0];
  if (!deployment) {
    return res.status(404).json({ error: "No deployment found" });
  }

  if (
    deployment.status === DeployementStatus.IN_PROGRESS ||
    deployment.status === DeployementStatus.QUEUED
  ) {
    return res.status(404).json({ error: "Deployment in progress" });
  } else if (deployment.status === DeployementStatus.FAIL) {
    return res.status(404).json({ error: "Deployment failed" });
  }

  const resolvesTo = `${config.basePath}/${deployment.id}`;
  console.log("Resolves To: ", resolvesTo);

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
};
