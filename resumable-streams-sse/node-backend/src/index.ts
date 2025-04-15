import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: SSE Connection establishment\n\n`);

  const filePath = path.join(__dirname, "../data.txt");
  const readStream = fs.createReadStream(filePath, {
    highWaterMark: 10,
  });

  readStream.on("data", (chunk) => {
    res.write(`data: ${chunk.toString().replace(/\n/g, "\ndata: ")}\n\n`);
  });

  readStream.on("end", () => {
    res.write(`data: [STREAM-COMPLETE]\n\n`);
    res.end();
  });

  readStream.on("error", (error) => {
    console.error("SSE stream error:", error);
    res.write(`data: [STREAM-ERROR] ${error.message}\n\n`);
    res.end();
  });

  // Handle client disconnect
  req.on("close", () => {
    console.log("SSE client disconnected");
    readStream.destroy(); // Clean up the stream
  });
});

app.get("/ai", async (req, res) => {
  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "tell me a short, funny yo mamma joke",
      },
    ],
  });
  res.json({
    response,
  });
});

app.get("/ai/stream", async (req, res) => {
  const topic = req.query?.topic || "anthropic";
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await anthropic.messages.stream({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate 100 words description on: ${topic}`,
        },
      ],
    });

    stream.on("message", (message) => {
      console.log("message", message);
    });

    // Stream each text chunk to the client as it arrives
    stream.on("text", (text) => {
      if (text) {
        console.log("text", text);
        res.write(`data: ${text.replace(/\n/g, "\ndata: ")}\n\n`);
      }
    });
    console.log("stream messages", stream.messages);

    // Handle stream completion
    stream.on("end", () => {
      res.write(`data: [STREAM-COMPLETE]\n\n`);
      res.end();
    });

    // Handle any errors during streaming
    stream.on("error", (error) => {
      console.error("AI stream error:", error);
      res.write(`data: [STREAM-ERROR] ${error.message}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on("close", () => {
      console.log("SSE client disconnected");
      // If there's a way to abort the stream, do it here
    });
  } catch (error) {
    console.error("Error setting up AI stream:", error);
    res.write(`data: [STREAM-ERROR] ${error.message}\n\n`);
    res.end();
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`SSE server started on http://localhost:${PORT}`);
});
