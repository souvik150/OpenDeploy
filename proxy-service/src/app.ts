import express from "express";
import { handleProxyRequest } from "./controllers/projectController";
import { proxy } from "./middleware/proxy";

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Route to handle proxy requests
app.use((req, res) => {
  handleProxyRequest(req, res, proxy);
});

export default app;
