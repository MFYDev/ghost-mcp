// Ghost blog post data model.
export interface Post {
    id: string;
    title: string;
    status: string;
    url: string;
    created_at: string;
    html?: string | null;
    plaintext?: string | null;
    excerpt?: string | null;
}

// Ghost page data model.
export interface Page {
    id: string;
    title: string;
    status: string;
    url: string;
    created_at: string;
    html?: string | null;
    plaintext?: string | null;
    excerpt?: string | null;
    show_title_and_feature_image?: boolean | null;
}

// Ghost user data model.
export interface User {
    id: string;
    name: string;
    email: string;
    slug: string;
    status: string;
    location?: string | null;
    website?: string | null;
    bio?: string | null;
    profile_image?: string | null;
    cover_image?: string | null;
    created_at: string;
    last_seen?: string | null;
    roles: any[]; // Using any for simplicity, could define a more specific Role interface
}

// Ghost member data model.
export interface Member {
    id: string;
    name: string;
    email: string;
    status: string;
    created_at: string;
    note?: string | null;
    labels: any[]; // Using any for simplicity, could define a more specific Label interface
    email_count: number;
    email_opened_count: number;
    email_open_rate: number;
    last_seen_at?: string | null;
    newsletters: any[]; // Using any for simplicity, could define a more specific Newsletter interface
    subscriptions: any[]; // Using any for simplicity, could define a more specific Subscription interface
}

// Ghost tier data model.
export interface Tier {
    id: string;
    name: string;
    description?: string | null;
    type: string;
    active: boolean;
    welcome_page_url?: string | null;
    created_at: string;
    updated_at: string;
    monthly_price?: any | null; // Could define a more specific Price interface
    yearly_price?: any | null; // Could define a more specific Price interface
    currency: string;
    benefits: string[];
}

// Ghost offer data model.
export interface Offer {
    id: string;
    name: string;
    code: string;
    display_title: string;
    display_description?: string | null;
    type: string;
    status: string;
    cadence: string;
    amount: number;
    duration: string;
    currency: string;
    tier: any; // Could define a more specific Tier interface or use the one above
    redemption_count: number;
    created_at: string;
}

// Ghost newsletter data model.
export interface Newsletter {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    visibility: string;
    subscribe_on_signup: boolean;
    sort_order: number;
    sender_name: string;
    sender_email?: string | null;
    sender_reply_to?: string | null;
    show_header_icon: boolean;
    show_header_title: boolean;
    show_header_name: boolean;
    show_feature_image: boolean;
    title_font_category: string;
    body_font_category: string;
    show_badge: boolean;
    created_at: string;
    updated_at: string;
}