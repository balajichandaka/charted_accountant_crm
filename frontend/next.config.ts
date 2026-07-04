import type { NextConfig } from "next";

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "cafirmops.in";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // Multi-tenant subdomains + CloudFront/ALB may send Origin != internal Host.
      allowedOrigins: [
        rootDomain,
        `*.${rootDomain}`,
        `https://${rootDomain}`,
        `https://*.${rootDomain}`,
        "localhost:3000",
        "localhost:3001",
        "firm1.localhost:3001",
      ],
    },
  },
};

export default nextConfig;
