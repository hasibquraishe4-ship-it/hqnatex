import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [
        react(),
        {
            name: "hqnatex-dev-auth-bridge",
            configureServer: function (server) {
                server.middlewares.use(function (req, res, next) {
                    var _a;
                    // HQNATEX_BROWSER_METADATA_REWRITE_V4_1
                    //
                    // Cloud Shell browser-safe metadata transport.
                    // Avoid String.startsWith because the Vite config
                    // TypeScript target does not expose ES2015 String APIs.
                    var metadataPrefix = "/__hqnatex/hr-form-metadata?path=";
                    if (req.method === "GET" &&
                        typeof req.url === "string" &&
                        req.url.indexOf(metadataPrefix) === 0) {
                        var encodedPath = req.url
                            .slice(metadataPrefix.length)
                            .split("&")[0];
                        var targetPath = "";
                        try {
                            targetPath =
                                decodeURIComponent(encodedPath);
                        }
                        catch (_b) {
                            res.statusCode = 400;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify({
                                detail: "Invalid HR metadata path.",
                            }));
                            return;
                        }
                        if (targetPath.indexOf("/api/") !== 0) {
                            res.statusCode = 400;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify({
                                detail: "HR metadata target must be an API path.",
                            }));
                            return;
                        }
                        // Rewrite before the existing /api auth bridge.
                        // Existing V3 then performs the real DRF OPTIONS.
                        req.method =
                            "OPTIONS";
                        req.url =
                            targetPath;
                    }
                    if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith("/api/")) {
                        var incoming = req.headers["x-hqnatex-authorization"];
                        var value = Array.isArray(incoming)
                            ? incoming[0]
                            : incoming;
                        if (value) {
                            req.headers.authorization = value;
                            delete req.headers["x-hqnatex-authorization"];
                            // HQNATEX_OPTIONS_METADATA_BRIDGE_V3
                            //
                            // Browser form metadata uses DRF OPTIONS.
                            // Vite dev middleware can terminate OPTIONS before
                            // the normal /api proxy. Forward ONLY /api OPTIONS
                            // to the existing Django runtime.
                            if (req.method === "OPTIONS" &&
                                typeof req.url === "string" &&
                                req.url.indexOf("/api/") === 0) {
                                var fetchFn = globalThis.fetch;
                                if (typeof fetchFn !==
                                    "function") {
                                    res.statusCode = 500;
                                    res.setHeader("Content-Type", "application/json");
                                    res.end(JSON.stringify({
                                        detail: "Runtime fetch is unavailable.",
                                    }));
                                    return;
                                }
                                var forwardHeaders_1 = {
                                    Accept: "application/json",
                                    Host: "localhost",
                                };
                                var headerNames = [
                                    "authorization",
                                    "x-tenant-id",
                                    "x-company-id",
                                    "x-active-company-id",
                                    "accept-language",
                                ];
                                headerNames.forEach(function (name) {
                                    var raw = req.headers[name];
                                    if (Array.isArray(raw)) {
                                        forwardHeaders_1[name] = raw.join(", ");
                                    }
                                    else if (raw !== undefined
                                        &&
                                            raw !== null) {
                                        forwardHeaders_1[name] = String(raw);
                                    }
                                });
                                fetchFn("http://127.0.0.1:8000"
                                    + req.url, {
                                    method: "OPTIONS",
                                    headers: forwardHeaders_1,
                                })
                                    .then(function (upstream) {
                                    return upstream
                                        .text()
                                        .then(function (body) { return ({
                                        upstream: upstream,
                                        body: body,
                                    }); });
                                })
                                    .then(function (result) {
                                    var upstream = result.upstream;
                                    var body = result.body;
                                    res.statusCode =
                                        upstream.status;
                                    var contentType = upstream.headers.get("content-type");
                                    if (contentType) {
                                        res.setHeader("Content-Type", contentType);
                                    }
                                    var allow = upstream.headers.get("allow");
                                    if (allow) {
                                        res.setHeader("Allow", allow);
                                    }
                                    var vary = upstream.headers.get("vary");
                                    if (vary) {
                                        res.setHeader("Vary", vary);
                                    }
                                    res.end(body);
                                })
                                    .catch(function (error) {
                                    res.statusCode =
                                        502;
                                    res.setHeader("Content-Type", "application/json");
                                    res.end(JSON.stringify({
                                        detail: "Vite OPTIONS metadata bridge failed: "
                                            + String(error),
                                    }));
                                });
                                return;
                            }
                        }
                    }
                    next();
                });
            },
        },
    ],
    server: {
        host: "0.0.0.0",
        // HQNATEX:
        // Do not let Vite answer API OPTIONS with its own empty 204.
        // /api OPTIONS must reach Django/DRF through the proxy so
        // serializer metadata (actions.POST) is preserved.
        cors: false,
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
            },
        },
    },
});
