import { createHmac, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  scanForSecrets,
  generateSecretReport,
} from "@/lib/github-secret-patterns";
import { nanoid } from "nanoid";

// GitHub webhook payload types
interface GitHubPullRequest {
  number: number;
  title: string;
  head: {
    sha: string;
    ref: string;
  };
  base: {
    sha: string;
    ref: string;
  };
  user: {
    login: string;
  };
}

interface GitHubRepository {
  full_name: string;
  html_url: string;
}

interface GitHubPullRequestPayload {
  action: "opened" | "synchronize" | "reopened" | "closed";
  number: number;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  installation?: {
    id: number;
  };
}

interface GitHubPushPayload {
  ref: string;
  repository: GitHubRepository;
  commits: Array<{
    id: string;
    message: string;
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  installation?: {
    id: number;
  };
}

type SecretSeveritySummary = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type FileSecretFinding = {
  file: string;
  summary: SecretSeveritySummary;
  findings: Array<{
    severity: string;
    type: string;
    description: string;
    line: number;
    column: number;
    snippet: string;
  }>;
};

type PRScanSummary = SecretSeveritySummary & {
  filesScanned: number;
  filesWithSecrets: number;
  totalSecrets: number;
};

type PRScanResult = {
  scanId: string;
  hasSecrets: boolean;
  summary: PRScanSummary;
  findings: FileSecretFinding[];
};

type PushScanFinding = FileSecretFinding & { commit: string };

// Store scan results (in production, use database)
const scanResults = new Map<string, PRScanResult>();

// Verify GitHub webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const hmac = createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  // Timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

// Fetch file content from GitHub
async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DotVault-Secret-Scanner",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch ${path}:`, error);
    return null;
  }
}

// Fetch PR files from GitHub
async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
): Promise<Array<{ filename: string; status: string; patch?: string }>> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DotVault-Secret-Scanner",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch PR files:`, error);
    return [];
  }
}

// Post PR comment
async function postPRComment(
  owner: string,
  repo: string,
  prNumber: number,
  token: string,
  body: string,
): Promise<void> {
  try {
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DotVault-Secret-Scanner",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      },
    );
  } catch (error) {
    console.error(`Failed to post PR comment:`, error);
  }
}

// Update PR check status
async function updatePRCheck(
  owner: string,
  repo: string,
  sha: string,
  token: string,
  status: "pending" | "success" | "failure" | "completed",
  conclusion?:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "timed_out"
    | "action_required",
  output?: {
    title: string;
    summary: string;
    text?: string;
  },
): Promise<void> {
  try {
    // First, create a check run
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/check-runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DotVault-Secret-Scanner",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "DotVault Secret Scan",
          head_sha: sha,
          status,
          conclusion,
          output,
        }),
      },
    );

    if (!response.ok) {
      console.error("Failed to create check run:", await response.text());
    }
  } catch (error) {
    console.error(`Failed to update PR check:`, error);
  }
}

// Scan PR for secrets
async function scanPullRequest(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  token: string,
): Promise<PRScanResult> {
  const files = await fetchPRFiles(owner, repo, prNumber, token);
  const allFindings: FileSecretFinding[] = [];

  for (const file of files) {
    // Skip binary and large files
    if (file.status === "removed") continue;
    if (
      file.filename.match(
        /\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm|mp3|pdf|zip|tar|gz)$/i,
      )
    ) {
      continue;
    }

    const content = await fetchFileContent(
      owner,
      repo,
      file.filename,
      headSha,
      token,
    );
    if (!content) continue;

    const matches = scanForSecrets(content, file.filename);
    if (matches.length > 0) {
      const report = generateSecretReport(matches);
      allFindings.push({
        file: file.filename,
        ...report,
      });
    }
  }

  const scanId = nanoid();
  const hasSecrets = allFindings.some(
    (f) => f.summary.critical > 0 || f.summary.high > 0,
  );

  const result: PRScanResult = {
    scanId,
    hasSecrets,
    summary: {
      filesScanned: files.length,
      filesWithSecrets: allFindings.length,
      totalSecrets: allFindings.reduce((sum, f) => sum + f.summary.total, 0),
      critical: allFindings.reduce((sum, f) => sum + f.summary.critical, 0),
      high: allFindings.reduce((sum, f) => sum + f.summary.high, 0),
      medium: allFindings.reduce((sum, f) => sum + f.summary.medium, 0),
      low: allFindings.reduce((sum, f) => sum + f.summary.low, 0),
      total: allFindings.reduce((sum, f) => sum + f.summary.total, 0),
    },
    findings: allFindings,
  };

  scanResults.set(scanId, result);
  return result;
}

// Generate PR comment from scan results
function generatePRComment(result: PRScanResult): string {
  const { summary, findings } = result;

  let comment = "## 🔒 DotVault Secret Scan Results\n\n";

  if (summary.totalSecrets === 0) {
    comment += "✅ **No secrets detected!** Your code looks clean.\n\n";
    comment += "---\n\n";
    comment +=
      "💡 **Tip:** Consider using [DotVault](https://dotvault.io) to securely manage your environment variables instead of hardcoding them.\n";
    return comment;
  }

  comment += `⚠️ **${summary.totalSecrets} potential secret(s) detected** across ${summary.filesWithSecrets} file(s)\n\n`;
  comment += "### Summary\n\n";
  comment += `- 🔴 Critical: ${summary.critical}\n`;
  comment += `- 🟠 High: ${summary.high}\n`;
  comment += `- 🟡 Medium: ${summary.medium}\n`;
  comment += `- 🔵 Low: ${summary.low}\n\n`;

  comment += "### Findings\n\n";

  for (const finding of findings.slice(0, 10)) {
    comment += `<details>\n<summary><b>${finding.file}</b> (${finding.summary.total} secret${finding.summary.total > 1 ? "s" : ""})</summary>\n\n`;

    for (const item of finding.findings.slice(0, 5)) {
      const emoji =
        item.severity === "critical"
          ? "🔴"
          : item.severity === "high"
            ? "🟠"
            : item.severity === "medium"
              ? "🟡"
              : "🔵";
      comment += `${emoji} **${item.type}** (Line ${item.line})\n`;
      comment += `> ${item.description}\n`;
      comment += `> \`${item.snippet}\`\n\n`;
    }

    if (finding.findings.length > 5) {
      comment += `*... and ${finding.findings.length - 5} more*\n`;
    }

    comment += "</details>\n\n";
  }

  if (findings.length > 10) {
    comment += `*... and ${findings.length - 10} more files*\n\n`;
  }

  comment += "---\n\n";
  comment += "### 🛡️ How to Fix\n\n";
  comment +=
    "1. **Remove secrets from code** - Never commit API keys, passwords, or tokens\n";
  comment +=
    "2. **Use environment variables** - Store secrets in `.env` files (add to `.gitignore`)\n";
  comment +=
    "3. **Use DotVault** - Securely share and sync env files with your team\n\n";
  comment += "[Get started with DotVault →](https://dotvault.io)\n";

  return comment;
}

export async function POST(request: Request) {
  const headersList = await headers();
  const signature = headersList.get("x-hub-signature-256");
  const event = headersList.get("x-github-event");

  // Get webhook secret from environment
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return jsonError(
      "CONFIG_ERROR",
      "GitHub webhook secret not configured",
      500,
    );
  }

  // Get payload
  const payload = await request.text();

  // Verify signature
  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return jsonError("UNAUTHORIZED", "Invalid signature", 401);
  }

  const data = JSON.parse(payload);

  // Get GitHub App token
  const githubToken = process.env.GITHUB_APP_TOKEN;
  if (!githubToken) {
    return jsonError("CONFIG_ERROR", "GitHub App token not configured", 500);
  }

  try {
    switch (event) {
      case "pull_request": {
        const prData = data as GitHubPullRequestPayload;

        // Only scan on open, synchronize (new commits), or reopen
        if (!["opened", "synchronize", "reopened"].includes(prData.action)) {
          return jsonSuccess({ message: "Skipped: not a relevant PR action" });
        }

        const [owner, repo] = prData.repository.full_name.split("/");
        if (!owner || !repo) {
          return jsonError("INVALID_DATA", "Invalid repository format", 400);
        }

        const prNumber = prData.number;
        const headSha = prData.pull_request.head.sha;

        // Set check to pending
        await updatePRCheck(
          owner,
          repo,
          headSha,
          githubToken,
          "pending",
          undefined,
          {
            title: "Scanning for secrets...",
            summary:
              "DotVault is scanning this PR for exposed secrets and API keys.",
          },
        );

        // Scan the PR
        const result = await scanPullRequest(
          owner,
          repo,
          prNumber,
          headSha,
          githubToken,
        );

        // Update check status
        await updatePRCheck(
          owner,
          repo,
          headSha,
          githubToken,
          "completed",
          result.hasSecrets ? "failure" : "success",
          {
            title: result.hasSecrets
              ? `${result.summary.totalSecrets} secret(s) detected`
              : "No secrets detected",
            summary: result.hasSecrets
              ? `Found ${result.summary.critical} critical, ${result.summary.high} high severity secrets`
              : "Your code is clean! No secrets were detected.",
            text: JSON.stringify(result.summary, null, 2),
          },
        );

        // Post comment
        const comment = generatePRComment(result);
        await postPRComment(owner, repo, prNumber, githubToken, comment);

        return jsonSuccess({
          message: "PR scanned successfully",
          scanId: result.scanId,
          hasSecrets: result.hasSecrets,
          summary: result.summary,
        });
      }

      case "push": {
        const pushData = data as GitHubPushPayload;

        // Only scan pushes to main/master branches
        if (
          !pushData.ref.includes("main") &&
          !pushData.ref.includes("master")
        ) {
          return jsonSuccess({ message: "Skipped: not main/master branch" });
        }

        const [owner, repo] = pushData.repository.full_name.split("/");
        if (!owner || !repo) {
          return jsonError("INVALID_DATA", "Invalid repository format", 400);
        }

        // Scan each commit's changes
        const allFindings: PushScanFinding[] = [];

        for (const commit of pushData.commits.slice(0, 10)) {
          const filesToScan = [...commit.added, ...commit.modified];

          for (const file of filesToScan) {
            if (
              file.match(
                /\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm|mp3|pdf|zip|tar|gz)$/i,
              )
            ) {
              continue;
            }

            const content = await fetchFileContent(
              owner,
              repo,
              file,
              commit.id,
              githubToken,
            );

            if (content) {
              const matches = scanForSecrets(content, file);
              if (matches.length > 0) {
                const report = generateSecretReport(matches);
                allFindings.push({
                  commit: commit.id.slice(0, 7),
                  file,
                  ...report,
                });
              }
            }
          }
        }

        // In production, you might want to notify via Slack/email for critical findings
        const hasCritical = allFindings.some(
          (f) => f.summary.critical > 0 || f.summary.high > 0,
        );

        if (hasCritical) {
          console.error(
            `CRITICAL: Secrets detected in push to ${pushData.repository.full_name}`,
            allFindings,
          );
        }

        return jsonSuccess({
          message: "Push scanned successfully",
          commitsScanned: pushData.commits.length,
          findings: allFindings.length,
        });
      }

      default:
        return jsonSuccess({ message: `Unhandled event: ${event}` });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return jsonError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to process webhook",
      500,
    );
  }
}

// GET endpoint to retrieve scan results
export async function GET(request: Request) {
  const url = new URL(request.url);
  const scanId = url.searchParams.get("scanId");

  if (!scanId) {
    return jsonError("MISSING_PARAM", "scanId parameter required", 400);
  }

  const result = scanResults.get(scanId);
  if (!result) {
    return jsonError("NOT_FOUND", "Scan result not found", 404);
  }

  return jsonSuccess(result);
}
