// Response helpers that keep tool output compact for agentic callers.
// All payloads are stringified without indentation; browse results carry
// pagination meta so callers can iterate page-by-page.

export type Pagination = {
  page: number;
  limit: number | string;
  pages: number;
  total: number;
  next: number | null;
  prev: number | null;
};

export function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof payload === "string" ? payload : JSON.stringify(payload),
      },
    ],
  };
}

export function browseEnvelope(items: unknown[], meta?: { pagination?: Pagination }) {
  const pagination: Pagination = meta?.pagination ?? {
    page: 1,
    limit: items.length,
    pages: 1,
    total: items.length,
    next: null,
    prev: null,
  };
  return { items, pagination };
}

// Minimal write confirmation shared by all resources: enough for the caller
// to reference the object (id, slug, url) and chain edits (updated_at).
export function toConfirmation(obj: any) {
  const confirmation: Record<string, unknown> = {
    id: obj.id,
    title: obj.title ?? obj.name ?? obj.email,
    slug: obj.slug,
    status: obj.status,
    url: obj.url,
    updated_at: obj.updated_at,
  };
  for (const key of Object.keys(confirmation)) {
    if (confirmation[key] === undefined) delete confirmation[key];
  }
  return confirmation;
}

// Client-side projection guard for fields mode, in case Ghost ignores or
// only partially honors the fields query param.
export function pickFields(obj: any, fields: string[]) {
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    const key = field.trim();
    if (key && obj[key] !== undefined) picked[key] = obj[key];
  }
  return picked;
}
