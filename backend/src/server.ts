import cors from "cors";
import express, { type Request, type Response } from "express";
import "dotenv/config";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";

import preSignupRouter from "./routes/preSignupRoute.js";
import contactRouter from "./routes/contactRoute.js";

const app = express();

app.use(cors());
app.use(express.json());

// 5 reqs per 15 mins
const formLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api/pre-signups", formLimit, preSignupRouter);

app.use("/api/contact", formLimit, contactRouter);

app.get("/api/health", function (req: Request, res: Response): void {
  res.status(200).json({
    message: "Backend is running",
  });
});

const port = Number(process.env.PORT);
const mongo = String(process.env.MONGO_URI);

async function startServer(): Promise<void> {
  await mongoose.connect(mongo);

  console.log("Connected to database");

  app.listen(port, function (error?: Error): void {
    if (error) {
      console.error("Error occurred:", error);
      return;
    }

    console.log(`Server is running on port ${port}`);
  });
}

startServer().catch(function (error: unknown): void {
  console.error("Failed to start server:", error);
  process.exit(1);
});
