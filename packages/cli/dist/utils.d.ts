export declare function formatEnvContent(content: string): string;
export declare function maskSecrets(content: string): string;
export declare function readEnvFile(filePath: string): Promise<string>;
export declare function writeEnvFile(
  filePath: string,
  content: string,
): Promise<void>;
export declare function printEnvTable(
  envs: {
    label: string;
    updatedAt: string;
  }[],
): void;
export declare function printProjectTable(
  projects: {
    name: string;
    slug: string;
    createdAt: string;
  }[],
): void;
export declare function detectEnvFiles(): string[];
export declare function parseEnvContent(
  content: string,
): Record<string, string>;
export declare function mergeEnvContent(
  existing: string,
  incoming: string,
  options?: {
    overwrite?: boolean;
  },
): string;
//# sourceMappingURL=utils.d.ts.map
