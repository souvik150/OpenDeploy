import { PrismaClient } from "@open-deploy/prisma-schema";

export const prisma = new PrismaClient({
  // log: ["query"],
});
