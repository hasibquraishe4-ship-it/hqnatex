import config from "../../vite.config.ts";
export default { ...config, server: { ...config.server, watch: { ...config.server?.watch, ignored: ["**/backups/**"] } } };
