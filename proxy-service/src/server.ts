import app from "./app";
import { config } from "./config";

app.listen(config.port, () => {
  console.log(`Reverse Proxy Running at port ${config.port}`);
});
