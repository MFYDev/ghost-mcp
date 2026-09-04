// Projection functions for browse (list) operations.
// Each function strips large content fields, returning only identifying
// and navigational metadata. Use the corresponding *_read tool to fetch
// a full object once you have the id or slug.

// Default fields sent to Ghost via ?fields= when the caller does not request
// included relations. Must stay in sync with the to*Summary keys below
// (relations like tags/authors/roles are excluded — they require ?include=,
// which cannot be combined with ?fields=).
export const DEFAULT_POST_FIELDS =
  "id,title,slug,status,featured,created_at,updated_at,published_at,url,custom_excerpt";
export const DEFAULT_PAGE_FIELDS = DEFAULT_POST_FIELDS;
export const DEFAULT_MEMBER_FIELDS =
  "id,name,email,status,created_at,last_seen_at,email_count,email_open_rate";
export const DEFAULT_USER_FIELDS = "id,name,email,slug,status,created_at";
export const DEFAULT_TAG_FIELDS = "id,name,slug,description,created_at";
export const DEFAULT_NEWSLETTER_FIELDS =
  "id,name,status,visibility,subscribe_on_signup,sort_order";
export const DEFAULT_TIER_FIELDS =
  "id,name,type,active,monthly_price,yearly_price,currency";
export const DEFAULT_OFFER_FIELDS =
  "id,name,code,status,type,amount,cadence,currency,redemption_count";
export const DEFAULT_INVITE_FIELDS = "id,email,role_id,status,created_at";
export const DEFAULT_ROLE_FIELDS = "id,name,description";

// Extra non-relation metadata returned by posts_read/pages_read on top of the
// browse defaults (still excludes html/lexical/mobiledoc content).
export const POST_READ_FIELDS =
  DEFAULT_POST_FIELDS +
  ",visibility,email_only,canonical_url,feature_image,feature_image_alt,meta_title,meta_description";
export const PAGE_READ_FIELDS =
  DEFAULT_PAGE_FIELDS +
  ",visibility,canonical_url,feature_image,feature_image_alt,meta_title,meta_description,show_title_and_feature_image";

export function toPostSummary(post: any) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    featured: post.featured,
    created_at: post.created_at,
    updated_at: post.updated_at,
    published_at: post.published_at,
    url: post.url,
    custom_excerpt: post.custom_excerpt,
    tags: post.tags?.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })),
    authors: post.authors?.map((a: any) => ({ id: a.id, name: a.name, slug: a.slug })),
  };
}

export function toPageSummary(page: any) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    featured: page.featured,
    created_at: page.created_at,
    updated_at: page.updated_at,
    published_at: page.published_at,
    url: page.url,
    custom_excerpt: page.custom_excerpt,
    tags: page.tags?.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })),
    authors: page.authors?.map((a: any) => ({ id: a.id, name: a.name, slug: a.slug })),
  };
}

export function toMemberSummary(member: any) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    status: member.status,
    created_at: member.created_at,
    last_seen_at: member.last_seen_at,
    email_count: member.email_count,
    email_open_rate: member.email_open_rate,
  };
}

export function toUserSummary(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    slug: user.slug,
    status: user.status,
    created_at: user.created_at,
    roles: user.roles?.map((r: any) => ({ id: r.id, name: r.name })),
  };
}

export function toTagSummary(tag: any) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    created_at: tag.created_at,
  };
}

export function toNewsletterSummary(newsletter: any) {
  return {
    id: newsletter.id,
    name: newsletter.name,
    status: newsletter.status,
    visibility: newsletter.visibility,
    subscribe_on_signup: newsletter.subscribe_on_signup,
    sort_order: newsletter.sort_order,
  };
}

export function toTierSummary(tier: any) {
  return {
    id: tier.id,
    name: tier.name,
    type: tier.type,
    active: tier.active,
    monthly_price: tier.monthly_price,
    yearly_price: tier.yearly_price,
    currency: tier.currency,
  };
}

export function toOfferSummary(offer: any) {
  return {
    id: offer.id,
    name: offer.name,
    code: offer.code,
    status: offer.status,
    type: offer.type,
    amount: offer.amount,
    cadence: offer.cadence,
    currency: offer.currency,
    redemption_count: offer.redemption_count,
  };
}

export function toInviteSummary(invite: any) {
  return {
    id: invite.id,
    email: invite.email,
    role_id: invite.role_id,
    status: invite.status,
    created_at: invite.created_at,
  };
}

export function toRoleSummary(role: any) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
  };
}
