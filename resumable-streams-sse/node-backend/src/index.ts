import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(cors());

app.get("/", (req,res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: SSE Connection establishment\n\n`);

  const filePath =path.join(__dirname, "../data.txt");
  const readStream = fs.createReadStream(filePath, {
    highWaterMark: 10
  })

  readStream.on('data', (chunk) => {
    res.write(`data: ${chunk.toString().replace(/\n/g, '\ndata: ')}\n\n`)
  })

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
})

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`SSE server started on http://localhost:${PORT}`);
});