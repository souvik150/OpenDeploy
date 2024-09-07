import httpProxy from "http-proxy";
import { IncomingMessage, ServerResponse } from "http";

export const proxy = httpProxy.createProxy();

proxy.on(
  "proxyReq",
  (proxyReq: any, req: IncomingMessage, res: ServerResponse) => {
    const url = req.url;
    if (url === "/") {
      proxyReq.path += "index.html"; // Modify the proxy request path if necessary
    }
  }
);
