// src/tools/members.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toMemberSummary, DEFAULT_MEMBER_FIELDS } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation, pickFields } from "../utils/respond";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional().describe("Ghost NQL filter, e.g. 'status:paid'"),
  limit: z.number().optional().describe("Results per page, max 100, default 15"),
  page: z.number().optional(),
  order: z.string().optional().describe("e.g. 'created_at desc'"),
  fields: z.string().optional().describe("Comma-separated attributes to return, e.g. 'id,email,status'. Cannot be combined with include."),
  include: z.string().optional().describe("Relations to include: 'newsletters', 'labels', or 'newsletters,labels'. When set, fields is ignored."),
};
const readParams = {
  id: z.string().optional(),
  email: z.string().optional(),
};
const addParams = {
  email: z.string(),
  name: z.string().optional(),
  note: z.string().optional(),
  labels: z.array(z.object({ name: z.string(), slug: z.string().optional() })).optional(),
  newsletters: z.array(z.object({ id: z.string() })).optional(),
};
const editParams = {
  id: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  note: z.string().optional(),
  labels: z.array(z.object({ name: z.string(), slug: z.string().optional() })).optional(),
  newsletters: z.array(z.object({ id: z.string() })).optional(),
};
const deleteParams = {
  id: z.string(),
};

function toMemberSummaryWithRelations(member: any) {
  return {
    ...toMemberSummary(member),
    labels: member.labels?.map((l: any) => ({ name: l.name, slug: l.slug })),
    newsletters: member.newsletters?.map((n: any) => ({ id: n.id, name: n.name })),
  };
}

export function registerMemberTools(server: McpServer) {
  // Browse members
  server.tool(
    "members_browse",
    "List members as compact summaries (id, name, email, status, dates, email stats). Use fields= to narrow or include='newsletters,labels' for relations. Max 100/page; check pagination.next and pass page= to continue.",
    browseParams,
    async (args, _extra) => {
      const { fields, include, ...rest } = args;
      if (include) {
        const { items, meta } = await ghostApiClient.members.browse({ ...rest, include });
        return textResult(browseEnvelope(items.map(toMemberSummaryWithRelations), meta));
      }
      const effectiveFields = fields ?? DEFAULT_MEMBER_FIELDS;
      const { items, meta } = await ghostApiClient.members.browse({ ...rest, fields: effectiveFields });
      const fieldList = effectiveFields.split(",");
      return textResult(browseEnvelope(items.map((item: any) => pickFields(item, fieldList)), meta));
    }
  );

  // Read member
  server.tool(
    "members_read",
    "Fetch one member by id or email, with full detail including subscriptions, labels, newsletters, and notes.",
    readParams,
    async (args, _extra) => {
      const member = await ghostApiClient.members.read(args);
      return textResult(member);
    }
  );

  // Add member
  server.tool(
    "members_add",
    "Create a new member by email. Returns a minimal confirmation {id,email,status,updated_at}.",
    addParams,
    async (args, _extra) => {
      const member = await ghostApiClient.members.add(args);
      return textResult(toConfirmation(member));
    }
  );

  // Edit member
  server.tool(
    "members_edit",
    "Update an existing member by id. Returns a minimal confirmation {id,email,status,updated_at}.",
    editParams,
    async (args, _extra) => {
      const member = await ghostApiClient.members.edit(args);
      return textResult(toConfirmation(member));
    }
  );

  // Delete member
  server.tool(
    "members_delete",
    "Permanently delete a member by id. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.members.delete(args);
      return textResult(`Member with id ${args.id} deleted.`);
    }
  );
}
