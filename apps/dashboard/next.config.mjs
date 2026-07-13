/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vippin/core", "@vippin/ui", "@vippin/supabase"],
};

export default nextConfig;
