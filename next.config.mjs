/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@huggingface/transformers', 'pdf-parse'],
  webpack: (config) => {
    // Transformers.js uses dynamic require of optional native bindings;
    // mark these as external so webpack doesn't try to bundle them.
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
      sharp: 'commonjs sharp',
    });
    return config;
  },
};

export default nextConfig;
