#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
    version: "1.1.0", // TODO: Get version from package.json
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
import { registerPageTools } from "./tools/pages";
registerPageTools(server);
import { registerImageTools } from "./tools/images";
registerImageTools(server);

import { registerPrompts } from "./prompts";
registerPrompts(server);

// Set up and connect to the standard I/O transport
async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Ghost MCP TypeScript Server running on stdio"); // Log to stderr
}

// Start the server
startServer().catch((error: any) => { // Add type annotation for error
    console.error("Fatal error starting server:", error);
    process.exit(1);
});