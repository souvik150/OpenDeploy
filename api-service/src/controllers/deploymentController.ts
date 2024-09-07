import { Request, Response } from "express";
import { prisma } from "../models/prisma";
import { DeployementStatus } from "@prisma/client";
import { runEcsTask } from "../services/ecsService";

export const deployProject = async (req: Request, res: Response) => {
  const { projectId } = req.body;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const existingDeployment = await prisma.deployment.findFirst({
    where: {
      projectId,
      status: DeployementStatus.IN_PROGRESS,
    },
  });

  if (existingDeployment) {
    return res.status(400).json({ error: "Deployment already running" });
  }

  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      status: DeployementStatus.QUEUED,
    },
  });

  await runEcsTask(projectId, deployment.id.toString(), project.gitURL);

  return res.json({
    status: "queued",
    data: { deploymentId: deployment.id },
  });
};
