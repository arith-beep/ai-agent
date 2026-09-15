import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-agent/auth",
    "@ai-agent/crypto",
    "@ai-agent/message-bus",
    "@ai-agent/model-providers",
    "@ai-agent/observability",
    "@ai-agent/queue",
    "@ai-agent/scheduler",
    "@ai-agent/shared-types",
    "@ai-agent/storage",
    "@ai-agent/tasks",
    "@ai-agent/tools",
    "@ai-agent/workflow-engine",
  ],
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
