import { z } from "zod";
import type { BuiltinToolImplementation, ToolContext } from "../types";

const TIMEOUT_MS = 15_000;

function requireToken(ctx: ToolContext, toolLabel: string): string {
  const token = ctx.authConfig?.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error(`${toolLabel} is not configured. Add a GitHub personal access token to this tool under Settings > Tools.`);
  }
  return token;
}

async function githubFetch(path: string, token: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "ai-agent-platform",
        ...init?.headers,
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status}: ${(body as { message?: string })?.message ?? response.statusText}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

const createIssueInput = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export const githubCreateIssueTool: BuiltinToolImplementation<z.infer<typeof createIssueInput>> = {
  key: "github_create_issue",
  name: "GitHub: Create Issue",
  description: "Creates an issue in a GitHub repository.",
  category: "custom",
  inputSchema: createIssueInput,
  inputJsonSchema: {
    type: "object",
    properties: {
      owner: { type: "string" },
      repo: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
      labels: { type: "array", items: { type: "string" } },
    },
    required: ["owner", "repo", "title"],
  },
  async execute(input, ctx) {
    const token = requireToken(ctx, "GitHub: Create Issue");
    const issue = (await githubFetch(`/repos/${input.owner}/${input.repo}/issues`, token, {
      method: "POST",
      body: JSON.stringify({ title: input.title, body: input.body, labels: input.labels }),
    })) as { number: number; html_url: string };
    return { number: issue.number, url: issue.html_url };
  },
};

const listIssuesInput = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "all"]).default("open"),
  limit: z.number().int().positive().max(50).default(10),
});

export const githubListIssuesTool: BuiltinToolImplementation<z.infer<typeof listIssuesInput>> = {
  key: "github_list_issues",
  name: "GitHub: List Issues",
  description: "Lists issues in a GitHub repository.",
  category: "custom",
  inputSchema: listIssuesInput,
  inputJsonSchema: {
    type: "object",
    properties: {
      owner: { type: "string" },
      repo: { type: "string" },
      state: { type: "string", enum: ["open", "closed", "all"], default: "open" },
      limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
    },
    required: ["owner", "repo"],
  },
  async execute(input, ctx) {
    const token = requireToken(ctx, "GitHub: List Issues");
    const issues = (await githubFetch(
      `/repos/${input.owner}/${input.repo}/issues?state=${input.state}&per_page=${input.limit}`,
      token,
    )) as Array<{ number: number; title: string; state: string; html_url: string }>;
    return { issues: issues.map((i) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url })) };
  },
};
