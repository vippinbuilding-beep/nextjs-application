/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vippin/core", "@vippin/ui", "@vippin/supabase"],
  // `sharp` is a native module (image transcoding in our upload routes); keep it
  // external so it is required at runtime instead of being bundled.
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        // Covers both public objects and short-lived signed URLs, which our
        // thumbnail route redirects to.
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
