import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import cors from "cors";
import router from "./app/routes";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import path from "path";
import prisma from "./shared/prisma";
import { privacyPolicy, termsandconditions } from "./app/routes/viewRoute";

const app: Application = express();

// Disable ETags to prevent 304 Not Modified responses caching mismatched CORS headers across origins
app.set("etag", false);

// Middleware setup
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.warn("⚠️ Initial database connection notice:", (error as Error)?.message || error);
  }
})();

const corsOptions: cors.CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "token",
    "forgetToken",
    "x-requested-with",
    "x-vercel-protection-bypass",
    "x-vercel-set-bypass-cookie",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
  ],
  optionsSuccessStatus: 200,
};

// Global CORS and Cache-Control middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  );

  const reqHeaders = req.headers["access-control-request-headers"];
  if (reqHeaders) {
    res.setHeader("Access-Control-Allow-Headers", reqHeaders);
  } else {
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, token, forgetToken, x-vercel-protection-bypass, x-vercel-set-bypass-cookie",
    );
  }

  // Prevent caching of API responses across origins (prevents 304 with cached wrong origin)
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Route handler for root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.send({
    Message: "Welcome to api main route",
  });
});
app.get("/api/v1", (_req: Request, res: Response) => {
  res.send({
    Message: "Welcome to api version 1",
  });
});

app.get("/privacy-policy", (_req, res) => {
  res.send(privacyPolicy());
});
app.get("/terms-and-conditions", (_req, res) => {
  res.send(termsandconditions());
});

// Router setup
app.use("/api/v1", router);

// Global Error Handler
app.use(GlobalErrorHandler);

// API Not found handler
app.use((req: Request, res: Response, _next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
