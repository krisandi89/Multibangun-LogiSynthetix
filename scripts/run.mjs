import { build, createServer, preview } from "vite";
import config from "../vite.config.js";
const options = { ...config, configFile: false };
const command = process.argv[2] || "dev";
if (command === "build") await build(options);
else if (command === "preview") {
  const server = await preview({
    ...options,
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  });
  server.printUrls();
} else {
  const server = await createServer(options);
  await server.listen();
  server.printUrls();
}
