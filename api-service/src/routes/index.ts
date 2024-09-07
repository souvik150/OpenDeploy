import express from "express";
import { createProject } from "../controllers/projectController";
import { deployProject } from "../controllers/deploymentController";

const router = express.Router();

router.post("/project", createProject);
router.post("/deploy", deployProject);

export default router;
