// This is the Vercel serverless function entry point.
// It re-exports the default handler from the compiled ESM server bundle.
// The compiled bundle is at ../dist/index.mjs

// We use a dynamic import so Vercel's bundler doesn't try to analyze the compiled output.
let handler;

export default async function (req, res) {
    if (!handler) {
        const mod = await import('../dist/index.mjs');
        handler = mod.default;
    }
    return handler(req, res);
}
