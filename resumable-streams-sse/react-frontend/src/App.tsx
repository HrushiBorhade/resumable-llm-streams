// src/App.tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { ModeToggle } from "./components/theme";

export default function App() {
  const [tab, setTab] = useState("chat");
  const [prompt, setPrompt] = useState("");

  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleStartStream = () => {
    setContent("");
    setIsStreaming(true);
    setError("");
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const params = new URLSearchParams({
        topic: prompt ?? "Server sent events",
      });
      const es = new EventSource(`http://localhost:3000/ai/stream?${params}`);
      eventSourceRef.current = es;

      es.onopen = (e: Event): void => {
        console.log("SSE Connection Opened", e);
      };
      es.onmessage = (event: MessageEvent): void => {
        const message = event.data as string;

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
        setError("SSE connection error");
        es.close();
        setIsStreaming(false);
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="container mx-auto p-4 h-screen flex flex-col relative">
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

        <TabsContent value="chat" className="flex-1 p-4 flex flex-col gap-2">
          {/* <Chat /> */}

          <Input
            placeholder="Enter a topic e.g - Server Side Events"
            value={prompt}
            className="font-mono"
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button
            onClick={handleStartStream}
            disabled={isStreaming}
            className="w-full"
            variant="default"
          >
            {isStreaming ? "SSE Streaming..." : "Start SSE Stream"}
            {isStreaming && (
              <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse"></span>
            )}
          </Button>
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
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && !isStreaming && content && (
            <div className="text-sm text-muted-foreground w-full flex items-center gap-2">
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
              <li>localStorage to persist session IDs</li>
              <li>Event IDs to track streaming progress</li>
            </ul>
            <Button onClick={() => setTab("chat")}>Back to Chat</Button>
          </div>
        </TabsContent>
      </Tabs>
      <div className="absolute top-5 right-5">
        <ModeToggle />
      </div>
    </div>
  );
}
