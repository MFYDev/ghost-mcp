import crypto from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import axios, { type AxiosInstance } from 'axios';
import { GHOST_API_URL, GHOST_ADMIN_API_KEY, GHOST_API_VERSION } from './config';

type BrowseParams = {
  filter?: string;
  limit?: number;
  page?: number;
  order?: string;
  fields?: string;
  include?: string;
  formats?: string;
} & Record<string, string | number | undefined>;
type ReadParams = { id?: string; slug?: string; fields?: string; include?: string; formats?: string } & Record<string, unknown>;
type BrowseResult = { items: any[]; meta?: any };

class ResourceClient {
  constructor(
    private readonly resource: string,
    private readonly client: GhostAdminClient,
  ) {}

  browse(params?: BrowseParams): Promise<BrowseResult> {
    return this.client._browse(this.resource, params);
  }

  read(params: ReadParams): Promise<any> {
    return this.client._read(this.resource, params);
  }

  add(data: Record<string, unknown>, options?: Record<string, string>): Promise<any> {
    return this.client._add(this.resource, data, options);
  }

  edit(data: Record<string, unknown>, options?: Record<string, string>): Promise<any> {
    return this.client._edit(this.resource, data, options);
  }

  delete(params: { id: string }): Promise<void> {
    return this.client._delete(this.resource, params);
  }
}

class GhostAdminClient {
  private readonly http: AxiosInstance;
  private readonly keyId: string;
  private readonly secret: Buffer;
  private readonly version: string;

  readonly posts: ResourceClient;
  readonly pages: ResourceClient;
  readonly tags: ResourceClient;
  readonly members: ResourceClient;
  readonly tiers: ResourceClient;
  readonly offers: ResourceClient;
  readonly newsletters: ResourceClient;
  readonly users: ResourceClient;
  readonly roles: ResourceClient;
  readonly invites: ResourceClient;
  readonly webhooks: ResourceClient;
  readonly site: ResourceClient;
  readonly images: {
    upload(params: { file: string; purpose?: string; ref?: string }): Promise<any>;
  };

  constructor({ url, key, version }: { url: string; key: string; version: string }) {
    const [keyId, hexSecret] = key.split(':');
    this.keyId = keyId;
    this.secret = Buffer.from(hexSecret, 'hex');
    this.version = version;

    this.http = axios.create({ baseURL: `${url}/ghost/api/admin` });
    this.http.interceptors.request.use((config: any) => {
      config.headers.Authorization = `Ghost ${this._generateToken()}`;
      return config;
    });

    this.posts = new ResourceClient('posts', this);
    this.pages = new ResourceClient('pages', this);
    this.tags = new ResourceClient('tags', this);
    this.members = new ResourceClient('members', this);
    this.tiers = new ResourceClient('tiers', this);
    this.offers = new ResourceClient('offers', this);
    this.newsletters = new ResourceClient('newsletters', this);
    this.users = new ResourceClient('users', this);
    this.roles = new ResourceClient('roles', this);
    this.invites = new ResourceClient('invites', this);
    this.webhooks = new ResourceClient('webhooks', this);
    this.site = new ResourceClient('site', this);
    this.images = { upload: (p) => this._uploadImage(p) };
  }

  // Ghost Admin API JWT: HS256, kid in header, aud = /{version}/admin/
  _generateToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: this.keyId })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: `/${this.version}/admin/` })).toString('base64url');
    const sig = crypto.createHmac('sha256', this.secret).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${sig}`;
  }

  async _browse(resource: string, params?: BrowseParams): Promise<BrowseResult> {
    if (params && typeof params.limit === 'number') {
      params = { ...params, limit: Math.min(params.limit, 100) };
    }
    const { data } = await this.http.get(`/${resource}/`, { params });
    return { items: data[resource], meta: data.meta };
  }

  async _read(resource: string, params: ReadParams): Promise<any> {
    const { id, slug, ...rest } = params;
    const url = id ? `/${resource}/${id}/` : slug ? `/${resource}/slug/${slug}/` : `/${resource}/`;
    const { data } = await this.http.get(url, { params: rest });
    const val = data[resource];
    return Array.isArray(val) ? val[0] : val;
  }

  async _add(resource: string, body: Record<string, unknown>, options?: Record<string, string>): Promise<any> {
    const { data } = await this.http.post(`/${resource}/`, { [resource]: [body] }, { params: options });
    return data[resource][0];
  }

  async _edit(resource: string, body: Record<string, unknown>, options?: Record<string, string>): Promise<any> {
    const { id } = body;
    const { data } = await this.http.put(`/${resource}/${id}/`, { [resource]: [body] }, { params: options });
    return data[resource][0];
  }

  async _delete(resource: string, params: { id: string }): Promise<void> {
    await this.http.delete(`/${resource}/${params.id}/`);
  }

  async _uploadImage(params: { file: string; purpose?: string; ref?: string }): Promise<any> {
    const buf = await readFile(params.file);
    const ext = path.extname(params.file).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const mimeType = mimeTypes[ext] ?? 'application/octet-stream';
    const form = new FormData();
    form.append('file', new Blob([buf], { type: mimeType }), path.basename(params.file));
    if (params.purpose) form.append('purpose', params.purpose);
    if (params.ref) form.append('ref', params.ref);
    const { data } = await this.http.post('/images/upload/', form);
    return data.images[0];
  }
}

export const ghostApiClient = new GhostAdminClient({
  url: GHOST_API_URL,
  key: GHOST_ADMIN_API_KEY,
  version: GHOST_API_VERSION,
});
