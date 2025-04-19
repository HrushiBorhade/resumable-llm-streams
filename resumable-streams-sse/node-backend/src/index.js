// import express from "express";
// import cors from "cors";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import dotenv from "dotenv";
// import Anthropic from "@anthropic-ai/sdk";

// dotenv.config();

// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();
// app.use(cors());

// // In-memory store for active streams
// // In a production app, use Redis or another persistent store
// const activeStreams = new Map();

// app.get("/", (req, res) => {
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   res.write(`data: SSE Connection establishment\n\n`);

//   const filePath = path.join(__dirname, "../data.txt");
//   const readStream = fs.createReadStream(filePath, {
//     highWaterMark: 10,
//   });

//   let eventId = 0;

//   readStream.on("data", (chunk) => {
//     eventId++;
//     res.write(`id: ${eventId}\ndata: ${chunk.toString().replace(/\n/g, "\ndata: ")}\n\n`);
//   });

//   readStream.on("end", () => {
//     res.write(`data: [STREAM-COMPLETE]\n\n`);
//     res.end();
//   });

//   readStream.on("error", (error) => {
//     console.error("SSE stream error:", error);
//     res.write(`data: [STREAM-ERROR] ${error.message}\n\n`);
//     res.end();
//   });

//   // Handle client disconnect
//   req.on("close", () => {
//     console.log("SSE client disconnected");
//     readStream.destroy(); // Clean up the stream
//   });
// });

// app.get("/ai", async (req, res) => {
//   const response = await anthropic.messages.create({
//     model: "claude-3-7-sonnet-20250219",
//     max_tokens: 1024,
//     messages: [
//       {
//         role: "user",
//         content: "tell me a short, funny yo mamma joke",
//       },
//     ],
//   });
//   res.json({
//     response,
//   });
// });

// app.get("/ai/stream", async (req, res) => {
//   // Get the topic from query parameters
//   const topic = req.query.topic || "1000 words on server sent events'";
//   const lastEventId = req.query.lastEventId || req.headers["last-event-id"] || "0";
  
//   // Generate a unique session ID for this stream
//   const sessionId = req.query.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
//   // Set SSE headers
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   // Check if we have a cached stream for resuming
//   let cachedChunks = [];
//   let nextEventId = 1;
  
//   if (activeStreams.has(sessionId)) {
//     cachedChunks = activeStreams.get(sessionId).chunks;
//     nextEventId = activeStreams.get(sessionId).nextEventId;
    
//     // Send all chunks that client hasn't received yet
//     if (lastEventId && !isNaN(parseInt(lastEventId.toString()))) {
//       const clientLastEventId = parseInt(lastEventId.toString());
      
//       // Send all chunks that the client hasn't received yet
//       for (let i = 0; i < cachedChunks.length; i++) {
//         const chunk = cachedChunks[i];
//         if (chunk.id > clientLastEventId) {
//           res.write(`id: ${chunk.id}\ndata: ${chunk.text.replace(/\n/g, "\ndata: ")}\n\n`);
//         }
//       }
      
//       // If we've already completed the stream, send the completion message and end
//       if (activeStreams.get(sessionId).completed) {
//         res.write(`data: [STREAM-COMPLETE]\n\n`);
//         res.end();
//         return;
//       }
//     }
//   } else {
//     // First time seeing this session, initialize it
//     activeStreams.set(sessionId, {
//       chunks: [],
//       nextEventId: 1,
//       completed: false,
//       topic
//     });
    
//     // Initial message
//     // res.write(`data: Stream starting with topic: ${topic}\n\n`);
//   }

//   try {
//     // Skip creating a new stream if we're just resuming and already completed
//     if (!activeStreams.get(sessionId).completed) {
//       const stream = await anthropic.messages.stream({
//         model: "claude-3-7-sonnet-20250219",
//         max_tokens: 1024,
//         messages: [
//           {
//             role: "user",
//             content: topic.toString(),
//           },
//         ],
//       });

//       // Stream each text chunk to the client as it arrives
//       stream.on("text", (text) => {
//         if (text) {
//           // Store the chunk with its event ID
//           const eventId = nextEventId++;
//           activeStreams.get(sessionId).chunks.push({
//             id: eventId,
//             text
//           });
//           activeStreams.get(sessionId).nextEventId = nextEventId;
          
//           // Send to client
//           res.write(`id: ${eventId}\ndata: ${text.replace(/\n/g, "\ndata: ")}\n\n`);
//         }
//       });

//       // Handle stream completion
//       stream.on("end", () => {
//         activeStreams.get(sessionId).completed = true;
//         res.write(`data: [STREAM-COMPLETE]\n\n`);
//         res.end();
        
//         // In a real app, you'd want to eventually clean up old sessions
//         // Here we'll just keep them for demonstration purposes
//       });

//       // Handle any errors during streaming
//       stream.on("error", (error) => {
//         console.error("AI stream error:", error);
//         res.write(`data: [STREAM-ERROR] ${error.message}\n\n`);
//         res.end();
//       });

//       // Handle client disconnect
//       req.on("close", () => {
//         console.log("SSE client disconnected");
//         // Don't clean up the stream data, to allow resuming
//       });
//     }
//   } catch (error) {
//     console.error("Error setting up AI stream:", error);
//     res.write(`data: [STREAM-ERROR] ${error.message}\n\n`);
//     res.end();
//   }
// });

// // Endpoint to clean up old sessions (in a real app, you might do this automatically)
// app.delete("/sessions/:sessionId", (req, res) => {
//   const { sessionId } = req.params;
//   if (activeStreams.has(sessionId)) {
//     activeStreams.delete(sessionId);
//     res.json({ success: true, message: "Session deleted" });
//   } else {
//     res.status(404).json({ success: false, message: "Session not found" });
//   }
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`SSE server started on http://localhost:${PORT}`);
// });

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Anthropic } from "@anthropic-ai/sdk";

// Configure environment variables
dotenv.config();

// Validate essential environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json());

// In-memory store for active streams
const activeStreams = new Map();

// Session cleanup timer (24 hours)
const SESSION_TTL = 24 * 60 * 60 * 1000;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create a new session or retrieve an existing one
app.post("/sessions", (req, res) => {
  try {
    const { sessionId, prompt } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    
    // Check if session already exists
    if (activeStreams.has(sessionId)) {
      const session = activeStreams.get(sessionId);
      return res.json({ 
        sessionId,
        exists: true,
        prompt: session.prompt,
        isCompleted: session.completed
      });
    }
    
    // Create new session
    activeStreams.set(sessionId, {
      chunks: [],
      nextEventId: 1,
      completed: false,
      prompt: prompt || "No prompt provided",
      createdAt: Date.now(),
      fullResponse: ""
    });
    
    // Set up automatic cleanup
    setTimeout(() => {
      if (activeStreams.has(sessionId)) {
        console.log(`Cleaning up expired session: ${sessionId}`);
        activeStreams.delete(sessionId);
      }
    }, SESSION_TTL);
    
    res.json({ 
      sessionId, 
      exists: false,
      prompt,
      isCompleted: false
    });
    
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Get session info
app.get("/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  
  if (!activeStreams.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  const session = activeStreams.get(sessionId);
  
  res.json({
    sessionId,
    prompt: session.prompt,
    isCompleted: session.completed,
    createdAt: session.createdAt,
    responseLength: session.fullResponse.length
  });
});

// Get the full response for a session
app.get("/sessions/:sessionId/response", (req, res) => {
  const { sessionId } = req.params;
  
  if (!activeStreams.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  const session = activeStreams.get(sessionId);
  
  res.json({
    sessionId,
    isCompleted: session.completed,
    response: session.fullResponse
  });
});

// Stream AI response
app.get("/ai/stream", async (req, res) => {
  // Get the session ID and topic from query parameters
  const sessionId = req.query.sessionId;
  const topic = req.query.topic;
  const lastEventId = req.query.lastEventId || req.headers["last-event-id"] || "0";
  
  // Validate required parameters
  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }
  
  if (!topic && !activeStreams.has(sessionId)) {
    return res.status(400).json({ error: "Topic is required for new sessions" });
  }
  
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for Nginx
  
  // Check if this session exists or needs to be created
  if (!activeStreams.has(sessionId)) {
    // Create new session
    activeStreams.set(sessionId, {
      chunks: [],
      nextEventId: 1,
      completed: false,
      prompt: topic || "",
      createdAt: Date.now(),
      fullResponse: ""
    });
    
    // Set up automatic cleanup
    setTimeout(() => {
      if (activeStreams.has(sessionId)) {
        console.log(`Cleaning up expired session: ${sessionId}`);
        activeStreams.delete(sessionId);
      }
    }, SESSION_TTL);
  }
  
  const session = activeStreams.get(sessionId);
  
  // Send any cached chunks if client is reconnecting
  if (lastEventId && !isNaN(parseInt(lastEventId.toString()))) {
    const clientLastEventId = parseInt(lastEventId.toString());
    
    // Send all chunks that the client hasn't received yet
    for (let i = 0; i < session.chunks.length; i++) {
      const chunk = session.chunks[i];
      if (chunk.id > clientLastEventId) {
        res.write(`id: ${chunk.id}\ndata: ${chunk.text.replace(/\n/g, "\ndata: ")}\n\n`);
      }
    }
    
    // If we've already completed the stream, send the completion message and end
    if (session.completed) {
      res.write(`data: [STREAM-COMPLETE]\n\n`);
      res.end();
      return;
    }
  }

  // Handle already completed sessions differently to avoid creating a new stream
  if (session.completed) {
    res.write(`data: ${session.fullResponse.replace(/\n/g, "\ndata: ")}\n\n`);
    res.write(`data: [STREAM-COMPLETE]\n\n`);
    res.end();
    return;
  }

  try {
    // Start the stream if this session isn't completed
    if (!session.completed) {
      const stream = await anthropic.messages.stream({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4096, // Increased for more comprehensive responses
        messages: [
          {
            role: "user",
            content: session.prompt,
          },
        ],
      });

      // Stream each text chunk to the client as it arrives
      stream.on("text", (text) => {
        if (text) {
          // Store the chunk with its event ID
          const eventId = session.nextEventId++;
          session.chunks.push({
            id: eventId,
            text
          });
          
          // Append to full response
          session.fullResponse += text;
          
          // Send to client
          res.write(`id: ${eventId}\ndata: ${text.replace(/\n/g, "\ndata: ")}\n\n`);
        }
      });

      // Handle stream completion
      stream.on("end", () => {
        session.completed = true;
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
        console.log(`SSE client disconnected (sessionId: ${sessionId})`);
        // Stream continues in background to completion
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error setting up AI stream:", error);
    res.write(`data: [STREAM-ERROR] ${errorMessage}\n\n`);
    res.end();
  }
});

// List all active sessions (admin endpoint)
app.get("/admin/sessions", (req, res) => {
  const sessions = [];
  
  for (const [sessionId, session] of activeStreams.entries()) {
    sessions.push({
      sessionId,
      prompt: session.prompt,
      isCompleted: session.completed,
      createdAt: session.createdAt,
      responseLength: session.fullResponse.length
    });
  }
  
  res.json({ sessions });
});

// Delete a session
app.delete("/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  
  if (activeStreams.has(sessionId)) {
    activeStreams.delete(sessionId);
    res.json({ success: true, message: "Session deleted" });
  } else {
    res.status(404).json({ success: false, message: "Session not found" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message 
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// Add proper shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  process.exit(0)
})