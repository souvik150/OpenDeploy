import { Request, Response } from "express";
import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { prisma } from "../models/prisma";

export const createProject = async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    gitURL: z.string().regex(/https:\/\/github.com\/.*/),
  });

  const safeParseRes = schema.safeParse(req.body);
  if (safeParseRes.error) {
    return res.status(400).json({ error: safeParseRes.error.errors });
  }

  const { name, gitURL } = safeParseRes.data;

  const project = await prisma.project.create({
    data: {
      name,
      gitURL,
      subDomain: generateSlug(),
    },
  });

  return res.json({
    status: "success",
    data: project,
  });
};
