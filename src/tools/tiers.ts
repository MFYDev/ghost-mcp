// src/tools/tiers.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toTierSummary } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
  include: z.string().optional().describe("e.g. 'monthly_price,yearly_price,benefits' on Ghost versions where prices are include-driven"),
};
const readParams = {
  id: z.string().optional(),
  slug: z.string().optional(),
  include: z.string().optional(),
};
const addParams = {
  name: z.string(),
  description: z.string().optional(),
  welcome_page_url: z.string().optional(),
  visibility: z.string().optional(),
  monthly_price: z.number().optional(),
  yearly_price: z.number().optional(),
  currency: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  // Add more fields as needed
};
const editParams = {
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  welcome_page_url: z.string().optional(),
  visibility: z.string().optional(),
  monthly_price: z.number().optional(),
  yearly_price: z.number().optional(),
  currency: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  // Add more fields as needed
};
const deleteParams = {
  id: z.string(),
};

export function registerTierTools(server: McpServer) {
  // Browse tiers
  server.tool(
    "tiers_browse",
    "List tiers as compact summaries (id, name, type, active, prices, currency). Use tiers_read with an id or slug for benefits, welcome_page_url, and description. Check pagination.next for more pages.",
    browseParams,
    async (args, _extra) => {
      const { items, meta } = await ghostApiClient.tiers.browse(args);
      return textResult(browseEnvelope(items.map(toTierSummary), meta));
    }
  );

  // Read tier
  server.tool(
    "tiers_read",
    "Fetch one tier by id or slug, with full detail including benefits, welcome_page_url, and description.",
    readParams,
    async (args, _extra) => {
      const tier = await ghostApiClient.tiers.read(args);
      return textResult(tier);
    }
  );

  // Add tier
  server.tool(
    "tiers_add",
    "Create a new tier. Returns a minimal confirmation {id,slug,updated_at}.",
    addParams,
    async (args, _extra) => {
      const tier = await ghostApiClient.tiers.add(args);
      return textResult(toConfirmation(tier));
    }
  );

  // Edit tier
  server.tool(
    "tiers_edit",
    "Update an existing tier by id. Returns a minimal confirmation {id,slug,updated_at}.",
    editParams,
    async (args, _extra) => {
      const tier = await ghostApiClient.tiers.edit(args);
      return textResult(toConfirmation(tier));
    }
  );

  // Delete tier
  server.tool(
    "tiers_delete",
    "Permanently delete a tier by id. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.tiers.delete(args);
      return textResult(`Tier with id ${args.id} deleted.`);
    }
  );
}
