// src/tools/offers.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toOfferSummary } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
};
const readParams = {
  id: z.string().optional(),
  code: z.string().optional(),
};
const addParams = {
  name: z.string(),
  code: z.string(),
  cadence: z.string(),
  duration: z.string(),
  amount: z.number(),
  tier_id: z.string(),
  type: z.string(),
  display_title: z.string().optional(),
  display_description: z.string().optional(),
  duration_in_months: z.number().optional(),
  currency: z.string().optional(),
  // Add more fields as needed
};
const editParams = {
  id: z.string(),
  name: z.string().optional(),
  code: z.string().optional(),
  display_title: z.string().optional(),
  display_description: z.string().optional(),
  // Only a subset of fields are editable per Ghost API docs
};
const deleteParams = {
  id: z.string(),
};

export function registerOfferTools(server: McpServer) {
  // Browse offers
  server.tool(
    "offers_browse",
    "List offers as compact summaries (id, name, code, status, type, amount, cadence, currency, redemption_count). Use offers_read with an id or code for display title, description, duration, and tier. Check pagination.next for more pages.",
    browseParams,
    async (args, _extra) => {
      const { items, meta } = await ghostApiClient.offers.browse(args);
      return textResult(browseEnvelope(items.map(toOfferSummary), meta));
    }
  );

  // Read offer
  server.tool(
    "offers_read",
    "Fetch one offer by id or code, with full detail including display title, description, duration, and tier.",
    readParams,
    async (args, _extra) => {
      const offer = await ghostApiClient.offers.read(args);
      return textResult(offer);
    }
  );

  // Add offer
  server.tool(
    "offers_add",
    "Create a new offer. Returns a minimal confirmation {id,status,updated_at}.",
    addParams,
    async (args, _extra) => {
      const offer = await ghostApiClient.offers.add(args);
      return textResult(toConfirmation(offer));
    }
  );

  // Edit offer
  server.tool(
    "offers_edit",
    "Update an existing offer by id (only name, code, and display fields are editable). Returns a minimal confirmation {id,status,updated_at}.",
    editParams,
    async (args, _extra) => {
      const offer = await ghostApiClient.offers.edit(args);
      return textResult(toConfirmation(offer));
    }
  );

  // Delete offer
  server.tool(
    "offers_delete",
    "Permanently delete an offer by id. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.offers.delete(args);
      return textResult(`Offer with id ${args.id} deleted.`);
    }
  );
}
