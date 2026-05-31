import fetch from "node-fetch";
import { getConfig } from "./config.js";
class ApiClient {
  async request(endpoint, options = {}) {
    const config = await getConfig();
    const url = `${config.apiUrl}/api${endpoint}`;
    const headers = {
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
      const error = await response.json().catch(() => ({
        error: "Unknown error",
      }));
      throw new Error(
        error.message || error.error || `HTTP ${response.status}`,
      );
    }
    return response.json();
  }
  // Auth
  async login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  }
  async getToken() {
    const config = await getConfig();
    if (!config.apiToken) {
      throw new Error("Not authenticated");
    }
    return this.request("/auth/token", {
      token: config.apiToken,
    });
  }
  // Projects
  async listProjects() {
    return this.request("/projects");
  }
  async getProject(id) {
    return this.request(`/projects/${id}`);
  }
  async createProject(name) {
    return this.request("/projects", {
      method: "POST",
      body: { name },
    });
  }
  // Environment Variables
  async listEnvs(projectId) {
    return this.request(`/projects/${projectId}/envs`);
  }
  async getEnv(projectId, label) {
    return this.request(
      `/projects/${projectId}/envs/${encodeURIComponent(label)}`,
    );
  }
  async createEnv(projectId, label, content) {
    return this.request(`/projects/${projectId}/envs`, {
      method: "POST",
      body: { label, content },
    });
  }
  async updateEnv(projectId, label, content) {
    return this.request(
      `/projects/${projectId}/envs/${encodeURIComponent(label)}`,
      {
        method: "PUT",
        body: { content },
      },
    );
  }
  async deleteEnv(projectId, label) {
    await this.request(
      `/projects/${projectId}/envs/${encodeURIComponent(label)}`,
      {
        method: "DELETE",
      },
    );
  }
}
export const api = new ApiClient();
//# sourceMappingURL=api.js.map
