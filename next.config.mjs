/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["docx", "@electric-sql/pglite"],
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  // The Studio Lab reads the architecture guide at run time.
  outputFileTracingIncludes: { "/api/admin/lab": ["./docs/ARCHITECTURE.md"] },
  // pdf.js mentions the Node-only "canvas" package; the browser build never uses it.
  webpack: (config) => { config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false }; return config; },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" }
    ] }];
  }
};
export default nextConfig;
