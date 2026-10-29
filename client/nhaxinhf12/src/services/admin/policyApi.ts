import { ENDPOINTS, buildUrlWithQuery } from "../apiEndpoints";

export interface AdminPolicy {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
  intro: string;
  content: string;
  templateType: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  accentColor: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED" | string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyInput {
  title: string;
  slug?: string;
  shortTitle?: string;
  intro?: string;
  content?: string;
  templateType?: string;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  accentColor?: string;
  status?: string;
}

export interface UpdatePolicyInput {
  title: string;
  slug?: string;
  shortTitle?: string;
  intro?: string;
  content?: string;
  templateType?: string;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  accentColor?: string;
  status?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `Yêu cầu thất bại (${res.status})`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

export const policyApi = {
  async getAll(status?: string, keyword?: string): Promise<AdminPolicy[]> {
    const query: Record<string, any> = {};
    if (status && status !== "ALL") query.status = status;
    if (keyword && keyword.trim()) query.keyword = keyword.trim();

    const url = buildUrlWithQuery(ENDPOINTS.ADMIN.POLICIES.BASE, query);
    return request<AdminPolicy[]>(url);
  },

  async getById(id: number): Promise<AdminPolicy> {
    return request<AdminPolicy>(ENDPOINTS.ADMIN.POLICIES.BY_ID(id));
  },

  async create(input: CreatePolicyInput): Promise<AdminPolicy> {
    return request<AdminPolicy>(ENDPOINTS.ADMIN.POLICIES.BASE, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async update(id: number, input: UpdatePolicyInput): Promise<AdminPolicy> {
    return request<AdminPolicy>(ENDPOINTS.ADMIN.POLICIES.BY_ID(id), {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  async delete(id: number): Promise<void> {
    await request<void>(ENDPOINTS.ADMIN.POLICIES.BY_ID(id), {
      method: "DELETE",
    });
  },
};
