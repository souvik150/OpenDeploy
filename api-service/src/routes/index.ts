import express from "express";
import { createProject } from "../controllers/projectController";
import { deployProject } from "../controllers/deploymentController";
import { getLogs } from "../controllers/logsController";

const router = express.Router();

router.post("/project", createProject);
router.post("/deploy", deployProject);
router.get("/logs/:id", getLogs);

export default router;
