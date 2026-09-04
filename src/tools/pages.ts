import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";
import { toPageSummary, DEFAULT_PAGE_FIELDS, PAGE_READ_FIELDS } from "../utils/summaries";
import { textResult, browseEnvelope, toConfirmation, pickFields } from "../utils/respond";

const browseParams = {
  filter: z.string().optional().describe("Ghost NQL filter, e.g. 'status:published'"),
  limit: z.number().optional().describe("Results per page, max 100, default 15"),
  page: z.number().optional(),
  order: z.string().optional().describe("e.g. 'published_at desc'"),
  fields: z.string().optional().describe("Comma-separated attributes to return, e.g. 'id,title,status,published_at'. Cannot be combined with include."),
  include: z.string().optional().describe("Relations to include: 'tags', 'authors', or 'tags,authors'. When set, fields is ignored."),
};
const readParams = {
  id: z.string().optional(),
  slug: z.string().optional(),
  content: z
    .enum(["html", "lexical"])
    .optional()
    .describe("Omit for metadata only (default). Pass 'html' or 'lexical' to also return that one content format."),
};
const tagRef = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    slug: z.string().optional(),
    name: z.string().optional(),
  }),
]);
const authorRef = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    slug: z.string().optional(),
    email: z.string().optional(),
  }),
]);
const pageMutableFields = {
  html: z.string().optional().describe("HTML content for the page. Any <img> src values must be publicly accessible URLs — upload local images via images_upload first and use the returned URL."),
  lexical: z.string().optional(),
  status: z.string().optional().describe("Page status: 'draft', 'published', or 'scheduled'. All image URLs referenced in the page must be uploaded and accessible before setting status to 'published'."),
  slug: z.string().optional(),
  visibility: z.string().optional(),
  featured: z.boolean().optional(),
  show_title_and_feature_image: z.boolean().optional(),
  published_at: z.string().optional(),
  custom_excerpt: z.string().optional(),
  feature_image: z.string().url().optional().describe("Publicly accessible HTTPS URL of the feature image. Use the URL returned by images_upload for Ghost-hosted images."),
  feature_image_alt: z.string().optional(),
  feature_image_caption: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().url().optional().describe("Publicly accessible HTTPS URL for the Open Graph image. Use the URL returned by images_upload for Ghost-hosted images."),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image: z.string().url().optional().describe("Publicly accessible HTTPS URL for the Twitter card image. Use the URL returned by images_upload for Ghost-hosted images."),
  codeinjection_head: z.string().optional(),
  codeinjection_foot: z.string().optional(),
  canonical_url: z.string().optional(),
  tags: z.array(tagRef).optional(),
  authors: z.array(authorRef).optional(),
};
const addParams = {
  title: z.string(),
  ...pageMutableFields,
};
const editParams = {
  id: z.string(),
  updated_at: z.string(),
  title: z.string().optional(),
  ...pageMutableFields,
};
const deleteParams = {
  id: z.string(),
};

export function registerPageTools(server: McpServer) {
  server.tool(
    "pages_browse",
    "List pages as compact summaries. Default fields: id,title,slug,status,dates,url,excerpt. Use fields= to narrow or include='tags,authors' for relations. Max 100/page; check pagination.next and pass page= to continue.",
    browseParams,
    async (args, _extra) => {
      const { fields, include, ...rest } = args;
      if (include) {
        // include mode: fields must not be sent alongside include, so
        // project client-side via the summary function instead.
        const { items, meta } = await ghostApiClient.pages.browse({ ...rest, include });
        return textResult(browseEnvelope(items.map(toPageSummary), meta));
      }
      const effectiveFields = fields ?? DEFAULT_PAGE_FIELDS;
      const { items, meta } = await ghostApiClient.pages.browse({ ...rest, fields: effectiveFields });
      const fieldList = effectiveFields.split(",");
      return textResult(browseEnvelope(items.map((item: any) => pickFields(item, fieldList)), meta));
    }
  );

  server.tool(
    "pages_read",
    "Fetch one page by id or slug. Returns metadata only by default; pass content='html' or 'lexical' for the body. Returns updated_at, which pages_edit requires.",
    readParams,
    async (args, _extra) => {
      const { content, ...identifier } = args;
      if (!content) {
        const page = await ghostApiClient.pages.read({ ...identifier, fields: PAGE_READ_FIELDS });
        return textResult(page);
      }
      const page = await ghostApiClient.pages.read({ ...identifier, formats: content });
      // Ghost may return default content keys regardless of formats; never
      // return more than the one requested format.
      delete page.mobiledoc;
      delete page.plaintext;
      if (content === "html") delete page.lexical;
      else delete page.html;
      return textResult(page);
    }
  );

  server.tool(
    "pages_add",
    "Create a new Ghost page. If the page includes images (feature_image, og_image, twitter_image, or <img> tags in html), upload them first using images_upload and use the returned URLs. Setting status to 'published' immediately makes the page live. Returns a minimal confirmation {id,slug,status,url,updated_at}.",
    addParams,
    async (args, _extra) => {
      const options = args.html ? { source: "html" } : undefined;
      const page = await ghostApiClient.pages.add(args, options);
      return textResult(toConfirmation(page));
    }
  );

  server.tool(
    "pages_edit",
    "Update an existing Ghost page. Requires the current updated_at timestamp to prevent conflicting edits. If adding or changing images, upload them via images_upload first and use the returned URLs. Changing status to 'published' immediately makes the page live. Returns a minimal confirmation; its updated_at is the value required by the next edit.",
    editParams,
    async (args, _extra) => {
      const options = args.html ? { source: "html" } : undefined;
      const page = await ghostApiClient.pages.edit(args, options);
      return textResult(toConfirmation(page));
    }
  );

  server.tool(
    "pages_delete",
    "Permanently delete a page by id. This cannot be undone.",
    deleteParams,
    async (args, _extra) => {
      await ghostApiClient.pages.delete(args);
      return textResult(`Page with id ${args.id} deleted.`);
    }
  );
}
