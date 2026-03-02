import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler  : true, // new React optimizer (safe to enable)
    reactStrictMode: true,
    
    images: {
        // Allow quality 100 in addition to the default 75
        qualities: [75, 100],
    },
    
    // Turbo config
    turbopack: {
        rules: {}, // Optional: define custom Turbopack rules if needed
    },
};

export default nextConfig;