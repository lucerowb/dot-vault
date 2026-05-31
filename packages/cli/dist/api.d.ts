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
declare class ApiClient {
  private request;
  login(
    email: string,
    password: string,
  ): Promise<{
    token: string;
  }>;
  getToken(): Promise<{
    token: string;
  }>;
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project>;
  createProject(name: string): Promise<Project>;
  listEnvs(projectId: string): Promise<ProjectEnv[]>;
  getEnv(
    projectId: string,
    label: string,
  ): Promise<{
    content: string;
  }>;
  createEnv(
    projectId: string,
    label: string,
    content: string,
  ): Promise<ProjectEnv>;
  updateEnv(
    projectId: string,
    label: string,
    content: string,
  ): Promise<ProjectEnv>;
  deleteEnv(projectId: string, label: string): Promise<void>;
}
export declare const api: ApiClient;
export {};
//# sourceMappingURL=api.d.ts.map
