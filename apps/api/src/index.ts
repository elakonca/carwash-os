import fs from "node:fs";
import { env } from "./config/env.js";
import { createApp } from "./app.js";

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const app = createApp();
app.listen(env.API_PORT, "0.0.0.0", () => {
  console.log(`Car Wash OS API listening on http://localhost:${env.API_PORT}`);
});
