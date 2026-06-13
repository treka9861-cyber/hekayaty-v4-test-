import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// 0. COMPRESSION
app.use(compression());

// 1. SECURITY HEADERS (CORS, XSS, Clickjacking, etc.)
app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.supabase.co"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "http:", "https://*.supabase.co", "https://ui-avatars.com", "https://*.cloudinary.com", "https://images.unsplash.com", "https://img.youtube.com", "https://www.transparenttextures.com"],
          connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://*.cloudinary.com"],
          frameSrc: ["'self'", "https://www.youtube.com", "https://*.supabase.co"],
        },
      },
}));

// 2. RATE LIMITING (Prevent Brute Force / DDoS)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 attempts per hour for login/registration
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts. Please try again in an hour.",
});

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many chat messages sent. Please slow down.",
});

const ordersLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many checkout attempts. Please wait.",
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many files uploaded. Please wait.",
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many admin actions performed. Please slow down.",
});

app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/orders", ordersLimiter);
app.use("/api/chat", chatLimiter);
app.use("/api/upload", uploadLimiter);
app.use("/api/admin", adminLimiter);

// 3. BODY LIMITING (Prevent Large Payload Attacks)
app.use(express.json({
  limit: "1mb", verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

let appReady = false;
let initError: Error | null = null;
const setupPromise = (async () => {
  try {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
      serveStatic(app);
    } else if (!process.env.VERCEL) {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }
  } catch (error: any) {
    console.error("🔥 FATAL INIT ERROR:", error);
    initError = error;
  } finally {
    appReady = true;
  }
})();

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  setupPromise.then(() => {
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
      },
      () => {
        log(`serving on port ${port}`);
      },
    );
  });
}

// Export for Vercel
export default async function handler(req: Request, res: Response) {
  if (!appReady) {
    await setupPromise;
  }
  if (initError) {
    return res.status(500).json({ 
      error: "Server Initialization Failed", 
      message: initError.message, 
      stack: initError.stack 
    });
  }
  return app(req, res);
}


