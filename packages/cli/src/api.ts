import fetch from "node-fetch";
import { getConfig } from "./config.js";

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface ProjectEnv {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiErrorBody {
  error?: string | { code?: string; message?: string };
  message?: string;
  code?: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

function parseApiError(body: ApiErrorBody, status: number): string {
  if (typeof body.error === "object" && body.error?.message) {
    return body.error.message;
  }
  if (typeof body.error === "string") {
    return body.error;
  }
  return body.message || body.code || `HTTP ${status}`;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      token?: string;
    } = {},
  ): Promise<T> {
    const config = await getConfig();
    const base = config.apiUrl.replace(/\/$/, "");
    const url = `${base}/api${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const sessionToken = options.token || config.apiToken;
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const raw = (await response.json().catch(() => ({}))) as ApiEnvelope<T> &
      ApiErrorBody &
      T;

    if (!response.ok) {
      throw new Error(parseApiError(raw, response.status));
    }

    if (
      raw &&
      typeof raw === "object" &&
      "success" in raw &&
      raw.success === true &&
      "data" in raw
    ) {
      return raw.data as T;
    }

    return raw as T;
  }

  // Auth (Better Auth email sign-in)
  async login(email: string, password: string): Promise<{ token: string }> {
    const config = await getConfig();
    const base = config.apiUrl.replace(/\/$/, "");
    const response = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      token?: string;
      session?: { token?: string };
      message?: string;
      code?: string;
    };

    if (!response.ok) {
      throw new Error(
        data.message || data.code || `HTTP ${response.status}`,
      );
    }

    const token = data.token ?? data.session?.token;
    if (!token) {
      throw new Error(
        "Sign-in succeeded but no session token was returned. Redeploy the app with bearer auth enabled if this persists.",
      );
    }

    return { token };
  }

  async getToken(): Promise<{ token: string }> {
    const config = await getConfig();
    if (!config.apiToken) {
      throw new Error("Not authenticated");
    }

    const session = await this.request<{ user?: { id: string } } | null>(
      "/auth/get-session",
      { token: config.apiToken },
    );

    if (!session?.user) {
      throw new Error("Session expired or invalid");
    }

    return { token: config.apiToken };
  }

  // Projects
  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>("/projects");
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(name: string): Promise<Project> {
    return this.request<Project>("/projects", {
      method: "POST",
      body: { name },
    });
  }

  // Environment Variables
  async listEnvs(projectId: string): Promise<ProjectEnv[]> {
    return this.request<ProjectEnv[]>(`/projects/${projectId}/envs`);
  }

  async getEnv(projectId: string, label: string): Promise<{ content: string }> {
    return this.request<{ content: string }>(
      `/projects/${projectId}/envs/${encodeURIComponent(label)}`,
    );
  }

  async createEnv(
    projectId: string,
    label: string,
    content: string,
  ): Promise<ProjectEnv> {
    return this.request<ProjectEnv>(`/projects/${projectId}/envs`, {
      method: "POST",
      body: { label, content },
    });
  }

  async updateEnv(
    projectId: string,
    label: string,
    content: string,
  ): Promise<ProjectEnv> {
    return this.request<ProjectEnv>(
      `/projects/${projectId}/envs/${encodeURIComponent(label)}`,
      {
        method: "PUT",
        body: { content },
      },
    );
  }

  async deleteEnv(projectId: string, label: string): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/envs/${encodeURIComponent(label)}`,
      {
        method: "DELETE",
      },
    );
  }
}

export const api = new ApiClient();
