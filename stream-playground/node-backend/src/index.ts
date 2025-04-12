import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Enable CORS
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// HTTP route for standard streaming
app.get("/", async (req, res) => {
    const filePath = path.join(__dirname, "../data.txt");
    const readStream = fs.createReadStream(filePath, {
      highWaterMark: 1024 // 1KB chunks
    });
    
    readStream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).send('Error streaming file');
      }
    });
    
    readStream.pipe(res);
});

// SSE route
app.get("/sse", (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write(`data: SSE Connection established\n\n`);
  
  const filePath = path.join(__dirname, "../data.txt");
  const readStream = fs.createReadStream(filePath, {
    highWaterMark: 1024 // 1KB chunks
  });
  
  readStream.on('data', (chunk) => {
    // Format properly for SSE - each message needs to start with "data: "
    // and end with two newlines
    res.write(`data: ${chunk.toString().replace(/\n/g, '\ndata: ')}\n\n`);
  });
  
  readStream.on('end', () => {
    res.write(`data: [STREAM-COMPLETE]\n\n`);
    res.end();
  });
  
  readStream.on('error', (error) => {
    console.error('SSE stream error:', error);
    res.write(`data: [STREAM-ERROR] ${error.message}\n\n`);
    res.end();
  });
  
  // Handle client disconnect
  req.on('close', () => {
    console.log('SSE client disconnected');
    readStream.destroy(); // Clean up the stream
  });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Handle messages from client
  ws.on('message', (message) => {
    const msg = message.toString();
    console.log('Received:', msg);
    
    // If client requests file streaming
    if (msg === 'start-stream') {
      const filePath = path.join(__dirname, "../data.txt");
      const readStream = fs.createReadStream(filePath, {
        highWaterMark: 1024 // 1KB chunks
      });
      
      readStream.on('data', (chunk) => {
        // Only send if connection is still open
        if (ws.readyState === ws.OPEN) {
          ws.send(chunk.toString());
        }
      });
      
      readStream.on('end', () => {
        if (ws.readyState === ws.OPEN) {
          ws.send('[STREAM-COMPLETE]');
        }
      });
      
      readStream.on('error', (error) => {
        console.error('WebSocket stream error:', error);
        if (ws.readyState === ws.OPEN) {
          ws.send('[STREAM-ERROR] ' + error.message);
        }
      });
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`WebSocket server started on ws://localhost:${PORT}`);
  console.log(`SSE server started on http://localhost:${PORT}/sse`);
});