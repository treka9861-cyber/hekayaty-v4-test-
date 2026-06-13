// Vercel serverless entry point.
// @vercel/node will compile this TypeScript file and bundle all server code.
// The handler in server/index.ts guards against BullMQ, Redis, and Vite imports on Vercel.
export { default } from '../server/index';
