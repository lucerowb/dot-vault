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

interface ApiError {
  error: string;
  message?: string;
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
    const url = `${config.apiUrl}/api${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options.token || config.apiToken) {
      headers["Authorization"] = `Bearer ${options.token || config.apiToken}`;
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        error: "Unknown error",
      }))) as ApiError;
      throw new Error(
        error.message || error.error || `HTTP ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string }> {
    return this.request<{ token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  }

  async getToken(): Promise<{ token: string }> {
    const config = await getConfig();
    if (!config.apiToken) {
      throw new Error("Not authenticated");
    }
    return this.request<{ token: string }>("/auth/token", {
      token: config.apiToken,
    });
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
