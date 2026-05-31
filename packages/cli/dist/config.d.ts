interface Config {
  apiUrl: string;
  apiToken?: string;
  defaultProject?: string;
}
export declare function getConfig(): Promise<Config>;
export declare function saveConfig(config: Partial<Config>): Promise<void>;
export declare function clearConfig(): Promise<void>;
export declare function isAuthenticated(): Promise<boolean>;
export declare function requireAuth(): Promise<string>;
export {};
//# sourceMappingURL=config.d.ts.map
