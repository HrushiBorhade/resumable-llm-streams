// src/App.tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

// Configuration for resumable streaming
const STORAGE_KEY = "sse_stream_state";
const API_BASE_URL = "http://localhost:3000";

// Type definitions for stream state
interface StreamState {
  content: string;
  prompt: string;
  status: "idle" | "streaming" | "complete" | "error";
  lastEventId: string;
  error?: string;
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const [prompt, setPrompt] = useState("");
  
  // Main streaming state
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [lastEventId, setLastEventId] = useState("");
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load previous stream state on component mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as StreamState;
        
        setContent(parsedState.content);
        setPrompt(parsedState.prompt);
        setLastEventId(parsedState.lastEventId || "");
        
        if (parsedState.status === "streaming") {
          // If we were streaming before, attempt to resume
          setTimeout(() => {
            handleStartStream(parsedState.prompt, parsedState.lastEventId);
          }, 100);
        } else if (parsedState.status === "error") {
          setError(parsedState.error || "Unknown error");
        }
      } catch (e) {
        console.error("Error parsing saved stream state:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save current stream state whenever key values change
  useEffect(() => {
    const currentState: StreamState = {
      content,
      prompt,
      status: isStreaming ? "streaming" : error ? "error" : content ? "complete" : "idle",
      lastEventId,
      error: error || undefined
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  }, [content, prompt, isStreaming, error, lastEventId]);

  const handleStartStream = (userPrompt = prompt, resumeFromId = "") => {
    // If no prompt is set and we're not resuming, don't do anything
    if (!userPrompt && !resumeFromId) return;
    
    // Set UI state
    setIsStreaming(true);
    setError("");
    
    // If not resuming, clear previous content
    if (!resumeFromId) {
      setContent("");
      setLastEventId("");
    }
    
    // Close existing EventSource if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Create URL with prompt as query parameter
      // Create URL with prompt as query parameter
      const url = new URL(`${API_BASE_URL}/ai/stream`);
      url.searchParams.append("topic", userPrompt);
      
      // Add lastEventId to the URL if resuming
      if (resumeFromId) {
        url.searchParams.append("lastEventId", resumeFromId);
      }
      
      // Create new EventSource with the complete URL
      const es = new EventSource(url.toString());
      
      
      eventSourceRef.current = es;

      es.onopen = (e: Event): void => {
        console.log("SSE Connection Opened", e);
      };
      
      es.onmessage = (event: MessageEvent): void => {
        const message = event.data as string;
        
        // Store last event ID for resuming
        if (event.lastEventId) {
          setLastEventId(event.lastEventId);
        }

        // Check for special messages
        if (message === "[STREAM-COMPLETE]") {
          console.log("SSE stream complete");
          es.close();
          setIsStreaming(false);
          return;
        }

        if (message.startsWith("[STREAM-ERROR]")) {
          const errorMsg = message.replace("[STREAM-ERROR] ", "");
          console.error("SSE error:", errorMsg);
          setError(errorMsg);
          es.close();
          setIsStreaming(false);
          return;
        }

        // Update content with new chunk
        setContent((prevContent) => prevContent + message);
      };

      es.onerror = (event: Event): void => {
        console.error("SSE error:", event);
        // Don't immediately set error - allow reconnection attempts
        setTimeout(() => {
          if (es.readyState === EventSource.CLOSED) {
            setError("SSE connection error - reconnection failed");
            setIsStreaming(false);
          }
        }, 5000); // Wait 5 seconds for potential reconnection
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      setIsStreaming(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="container mx-auto p-4 h-screen flex flex-col">
      <header className="py-4">
        <h1 className="text-2xl font-bold">Resumable LLM Streaming Demo</h1>
        <p className="text-gray-500">
          Test resumable streaming by changing tabs or closing/reopening the
          browser
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 p-4">
          <div className="flex gap-2 mb-4">
            <Input 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="flex-1"
            />
            <Button
              onClick={() => handleStartStream()}
              disabled={isStreaming || !prompt}
              variant="default"
            >
              {isStreaming ? "Streaming..." : "Start Stream"}
              {isStreaming && (
                <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse"></span>
              )}
            </Button>
          </div>
          
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              readOnly
              className="font-mono h-64 resize-none"
              placeholder="SSE stream content will appear here..."
            />

            {isStreaming && (
              <Badge
                variant="secondary"
                className="absolute top-2 right-2 animate-pulse"
              >
                Streaming...
              </Badge>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive" className="w-full mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && !isStreaming && content && (
            <div className="text-sm text-muted-foreground w-full flex items-center gap-2 mt-2">
              <Info className="h-4 w-4" />
              SSE streaming complete
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="flex-1 p-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Settings</h2>
            <p>
              Note: The chat stream continues in the background even when you're
              on this tab. Switch back to the chat tab to see the progress.
            </p>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-900 p-4">
              <p>
                This demo shows how Server-Sent Events (SSE) can maintain a
                stream across route changes. In a real application, you could
                add settings for model parameters here.
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setContent("");
                setPrompt("");
                setError("");
                setLastEventId("");
                setIsStreaming(false);
              }}
            >
              Clear Saved State
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="about" className="flex-1 p-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">About Resumable Streaming</h2>
            <p>This demo shows how to implement resumable streaming with:</p>
            <ul className="list-disc pl-5">
              <li>Node.js + Express backend</li>
              <li>React + TypeScript frontend</li>
              <li>Server-Sent Events (SSE) for streaming</li>
              <li>localStorage to persist stream state</li>
              <li>Event IDs to track streaming progress</li>
              <li>Automatic reconnection and resumption</li>
            </ul>
            <Button onClick={() => setTab("chat")}>Back to Chat</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}