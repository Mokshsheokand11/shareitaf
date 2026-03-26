import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;
// IMPORTANT:
// Do not throw at module-load time (top-level), because Vercel may fail the function
// before it reaches your route handler's try/catch, returning a non-JSON 500.
// Throw inside `connectDb()` so the handler can return a consistent JSON error.

let cached = (globalThis as any).__mongooseConn;

if (!cached) {
  cached = (globalThis as any).__mongooseConn = { conn: null, promise: null };
}

export async function connectDb() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
