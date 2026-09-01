#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as http from "node:http";
import { ghostApiClient } from './ghostApi'; // Import the initialized Ghost API client
import {
    handleUserResource,
    handleMemberResource,
    handleTierResource,
    handleOfferResource,
    handleNewsletterResource,
    handlePostResource,
    handleBlogInfoResource
} from './resources'; // Import resource handlers

// Create an MCP server instance
const server = new McpServer({
    name: "ghost-mcp-ts",
    version: "1.0.0", // TODO: Get version from package.json
}, {
    capabilities: {
        resources: {}, // Capabilities will be enabled as handlers are registered
        tools: {},
        prompts: {},
        logging: {} // Enable logging capability
    }
});

// Register resource handlers
server.resource("user", new ResourceTemplate("user://{user_id}", { list: undefined }), handleUserResource);
server.resource("member", new ResourceTemplate("member://{member_id}", { list: undefined }), handleMemberResource);
server.resource("tier", new ResourceTemplate("tier://{tier_id}", { list: undefined }), handleTierResource);
server.resource("offer", new ResourceTemplate("offer://{offer_id}", { list: undefined }), handleOfferResource);
server.resource("newsletter", new ResourceTemplate("newsletter://{newsletter_id}", { list: undefined }), handleNewsletterResource);
server.resource("post", new ResourceTemplate("post://{post_id}", { list: undefined }), handlePostResource);
server.resource("blog-info", "blog://info", handleBlogInfoResource);

// Register tools
import { registerPostTools } from "./tools/posts";
import { registerMemberTools } from "./tools/members";
registerPostTools(server);
registerMemberTools(server);
import { registerUserTools } from "./tools/users";
registerUserTools(server);
import { registerTagTools } from "./tools/tags";
registerTagTools(server);
import { registerTierTools } from "./tools/tiers";
registerTierTools(server);
import { registerOfferTools } from "./tools/offers";
registerOfferTools(server);
import { registerNewsletterTools } from "./tools/newsletters";
registerNewsletterTools(server);
import { registerInviteTools } from "./tools/invites";
registerInviteTools(server);

import { registerRoleTools } from "./tools/roles";
registerRoleTools(server);
import { registerWebhookTools } from "./tools/webhooks";
registerWebhookTools(server);

import { registerPrompts } from "./prompts";
registerPrompts(server);

// Set up and connect the transport. Defaults to stdio (upstream behavior);
// set MCP_TRANSPORT=http to serve Streamable HTTP on $PORT (default 3210).
async function startServer() {
    const transportMode = (process.env.MCP_TRANSPORT || "stdio").toLowerCase();

    if (transportMode === "http") {
        const port = parseInt(process.env.PORT || "3210", 10);
        const host = process.env.HOST || "0.0.0.0";

        // Stateless mode: no session latch, so any number of clients (agents)
        // can connect concurrently without tripping "already initialized".
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });

        const httpServer = http.createServer(async (req, res) => {
            // Liveness probe for podman/systemd healthchecks
            if (req.url === "/health") {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ status: "ok" }));
                return;
            }
            try {
                await transport.handleRequest(req, res);
            } catch (err: any) {
                if (!res.headersSent) {
                    res.writeHead(500, { "content-type": "application/json" });
                }
                res.end(JSON.stringify({
                    jsonrpc: "2.0",
                    error: { code: -32603, message: String(err?.message || err) },
                    id: null,
                }));
            }
        });

        await server.connect(transport);
        httpServer.listen(port, host, () => {
            console.error(`Ghost MCP TypeScript Server running on Streamable HTTP at http://${host}:${port}/mcp`);
        });
        return;
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Ghost MCP TypeScript Server running on stdio"); // Log to stderr
}

// Start the server
startServer().catch((error: any) => { // Add type annotation for error
    console.error("Fatal error starting server:", error);
    process.exit(1);
});