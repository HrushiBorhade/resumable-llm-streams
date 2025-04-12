import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, AlertCircle, Wifi, Server, Radio } from "lucide-react";
import { ModeToggle } from "./components/theme";

export default function App() {
  // HTTP Streaming state
  const [streamContent, setStreamContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // WebSocket state
  const [wsContent, setWsContent] = useState<string>("");
  const [isWsStreaming, setIsWsStreaming] = useState<boolean>(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const wsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // SSE State
  const [sseContent, setSseContent] = useState<string>("");
  const [isSseStreaming, setIsSseStreaming] = useState<boolean>(false);
  const [sseError, setSseError] = useState<string | null>(null);
  const sseTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Function to start the HTTP stream
  const startHttpStream = async (): Promise<void> => {
    // Reset states
    setStreamContent("");
    setError(null);
    setIsStreaming(true);

    try {
      // Fetch from our Express stream endpoint
      const response = await fetch("http://localhost:8080/");

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Get a reader from the response body stream
      const reader = response.body.getReader();

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("HTTP Stream complete");
          break;
        }

        // Convert the chunk (Uint8Array) to text
        const chunk = new TextDecoder().decode(value);

        // Update state with the new chunk
        setStreamContent((prevContent) => prevContent + chunk);
      }
    } catch (err) {
      console.error("HTTP Stream error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsStreaming(false);
    }
  };

  // Function to start WebSocket stream
  const startWsStream = (): void => {
    // Reset states
    setWsContent("");
    setWsError(null);
    setIsWsStreaming(true);

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    // Create new WebSocket connection
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = (): void => {
      console.log("WebSocket connected");
      // Request streaming to start
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("start-stream");
      }
    };

    ws.onmessage = (event: MessageEvent): void => {
      const message = event.data as string;

      // Check for special messages
      if (message === "[STREAM-COMPLETE]") {
        console.log("WebSocket stream complete");
        setIsWsStreaming(false);
        return;
      }

      if (message.startsWith("[STREAM-ERROR]")) {
        const errorMsg = message.replace("[STREAM-ERROR] ", "");
        console.error("WebSocket error:", errorMsg);
        setWsError(errorMsg);
        setIsWsStreaming(false);
        return;
      }

      // Update content with new chunk
      setWsContent((prevContent) => prevContent + message);
    };

    ws.onerror = (event: Event): void => {
      console.error("WebSocket error:", event);
      setWsError("WebSocket connection error");
      setIsWsStreaming(false);
    };

    ws.onclose = (): void => {
      console.log("WebSocket closed");
      setIsWsStreaming(false);
    };
  };

  // Function to start SSE stream
  const startSseStream = (): void => {
    // Reset states
    setSseContent("");
    setSseError(null);
    setIsSseStreaming(true);

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Create new SSE connection
    const eventSource = new EventSource("http://localhost:8080/sse");
    eventSourceRef.current = eventSource;

    // Type for SSE events
    eventSource.onopen = (event: Event): void => {
      console.log("SSE connection opened", event);
    };

    eventSource.onmessage = (event: MessageEvent): void => {
      const message = event.data as string;

      // Check for special messages
      if (message === "[STREAM-COMPLETE]") {
        console.log("SSE stream complete");
        eventSource.close();
        setIsSseStreaming(false);
        return;
      }

      if (message.startsWith("[STREAM-ERROR]")) {
        const errorMsg = message.replace("[STREAM-ERROR] ", "");
        console.error("SSE error:", errorMsg);
        setSseError(errorMsg);
        eventSource.close();
        setIsSseStreaming(false);
        return;
      }

      // Update content with new chunk
      setSseContent((prevContent) => prevContent + message);
    };

    eventSource.onerror = (event: Event): void => {
      console.error("SSE error:", event);
      setSseError("SSE connection error");
      eventSource.close();
      setIsSseStreaming(false);
    };
  };

  // Clean up connections on unmount
  useEffect(() => {
    return () => {
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Close SSE
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Auto-scroll the HTTP textarea as content is added
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [streamContent]);

  // Auto-scroll the WebSocket textarea as content is added
  useEffect(() => {
    if (wsTextareaRef.current) {
      wsTextareaRef.current.scrollTop = wsTextareaRef.current.scrollHeight;
    }
  }, [wsContent]);

  // Auto-scroll the SSE textarea as content is added
  useEffect(() => {
    if (sseTextareaRef.current) {
      sseTextareaRef.current.scrollTop = sseTextareaRef.current.scrollHeight;
    }
  }, [sseContent]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Stream Playground</h1>
        <p className="text-muted-foreground mt-2">
          Compare different streaming technologies: HTTP, WebSockets, and
          Server-Sent Events
        </p>
      </div>

      <Tabs defaultValue="http" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="http" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            HTTP Stream
          </TabsTrigger>
          <TabsTrigger value="websocket" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            WebSocket
          </TabsTrigger>
          <TabsTrigger value="sse" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Server-Sent Events
          </TabsTrigger>
        </TabsList>

        {/* HTTP Stream Tab */}
        <TabsContent value="http">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                HTTP Streaming
              </CardTitle>
              <CardDescription>
                One-time HTTP connection that streams data from server to client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button
                  onClick={startHttpStream}
                  disabled={isStreaming}
                  className="w-full"
                  variant="default"
                >
                  {isStreaming ? "HTTP Streaming..." : "Start HTTP Stream"}
                  {isStreaming && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse"></span>
                  )}
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={streamContent}
                  readOnly
                  className="font-mono h-64 resize-none"
                  placeholder="HTTP stream content will appear here..."
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
            </CardContent>
            <CardFooter>
              {error && (
                <Alert variant="destructive" className="w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!error && !isStreaming && streamContent && (
                <div className="text-sm text-muted-foreground w-full flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  HTTP streaming complete
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* WebSocket Tab */}
        <TabsContent value="websocket">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                WebSocket Streaming
              </CardTitle>
              <CardDescription>
                Bidirectional persistent connection for real-time data streaming
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button
                  onClick={startWsStream}
                  disabled={isWsStreaming}
                  className="w-full"
                  variant="default"
                >
                  {isWsStreaming
                    ? "WebSocket Streaming..."
                    : "Start WebSocket Stream"}
                  {isWsStreaming && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse"></span>
                  )}
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  ref={wsTextareaRef}
                  value={wsContent}
                  readOnly
                  className="font-mono h-64 resize-none"
                  placeholder="WebSocket stream content will appear here..."
                />

                {isWsStreaming && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 animate-pulse"
                  >
                    Streaming...
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {wsError && (
                <Alert variant="destructive" className="w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{wsError}</AlertDescription>
                </Alert>
              )}

              {!wsError && !isWsStreaming && wsContent && (
                <div className="text-sm text-muted-foreground w-full flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  WebSocket streaming complete
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* SSE Tab */}
        <TabsContent value="sse">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Server-Sent Events Streaming
              </CardTitle>
              <CardDescription>
                Server-to-client one-way connection with automatic reconnection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button
                  onClick={startSseStream}
                  disabled={isSseStreaming}
                  className="w-full"
                  variant="default"
                >
                  {isSseStreaming ? "SSE Streaming..." : "Start SSE Stream"}
                  {isSseStreaming && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse"></span>
                  )}
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  ref={sseTextareaRef}
                  value={sseContent}
                  readOnly
                  className="font-mono h-64 resize-none"
                  placeholder="SSE stream content will appear here..."
                />

                {isSseStreaming && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 animate-pulse"
                  >
                    Streaming...
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {sseError && (
                <Alert variant="destructive" className="w-full">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{sseError}</AlertDescription>
                </Alert>
              )}

              {!sseError && !isSseStreaming && sseContent && (
                <div className="text-sm text-muted-foreground w-full flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  SSE streaming complete
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="absolute top-5 right-5">
        <ModeToggle />
      </div>
    </div>
  );
}
