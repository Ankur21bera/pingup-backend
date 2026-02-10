import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDb from "./config/db.js";

import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";

import { clerkMiddleware } from "@clerk/express";
import userRouter from "./Route/userRoute.js";

const app = express();

// Connect DB
await connectDb();

// Middlewares
app.use(express.json());
app.use(cors());

// Test route
app.get("/", (req, res) => res.send("Server Is Running"));

// Clerk middleware (for your normal APIs)
app.use(clerkMiddleware());

// Inngest endpoint (webhooks)
app.use("/api/inngest", serve({ client: inngest, functions }));

// API routes
app.use("/api/user", userRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
