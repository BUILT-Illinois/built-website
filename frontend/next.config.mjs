/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: CloudFront (Phase 2) and GitHub Pages (today) both serve
  // pure files with no server, so all dynamic data is fetched client-side
  // from the API instead. See docs/aws-migration-plan.md §3, §4.
  output: "export",
  // Emits e.g. about/index.html instead of about.html, so a request for
  // "/about" (no extension) resolves on static hosts that serve a
  // directory's index.html by default — GitHub Pages today, S3/CloudFront
  // after Phase 2.
  trailingSlash: true,
  // next/image's optimizer needs a server; static export has none, and
  // every image here is already served as-is from /public.
  images: {
    unoptimized: true,
  },
  // Security headers (CSP, HSTS, X-Frame-Options, etc.) are set at the
  // CloudFront response headers policy in Phase 2, not here — a static
  // export has no server to attach headers to. See docs/aws-migration-plan.md
  // §3 (Key decisions) and §7 (Phase 2).
};

export default nextConfig;
