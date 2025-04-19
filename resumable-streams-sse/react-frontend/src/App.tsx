// // src/App.tsx
// import { useEffect, useRef, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "./components/ui/input";
// import { Badge } from "./components/ui/badge";
// import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
// import { AlertCircle, Info } from "lucide-react";
// import { ModeToggle } from "./components/theme";
// import Markdown from "react-markdown";
// import { cn } from "./lib/utils";
// // Configuration for resumable streaming
// const STORAGE_KEY = "sse_stream_state";
// const API_BASE_URL = "http://localhost:3000";

// // Type definitions for stream state
// interface StreamState {
//   content: string;
//   prompt: string;
//   status: "idle" | "streaming" | "complete" | "error";
//   lastEventId: string;
//   error?: string;
// }

// export default function App() {
//   const [tab, setTab] = useState("chat");
//   const [prompt, setPrompt] = useState("");

//   // Main streaming state
//   const [content, setContent] = useState("");
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [error, setError] = useState("");
//   const [lastEventId, setLastEventId] = useState("");

//   // const textareaRef = useRef<HTMLTextAreaElement | null>(null);
//   const eventSourceRef = useRef<EventSource | null>(null);

//   // Load previous stream state on component mount
//   useEffect(() => {
//     const savedState = localStorage.getItem(STORAGE_KEY);

//     if (savedState) {
//       try {
//         const parsedState = JSON.parse(savedState) as StreamState;

//         setContent(parsedState.content);
//         setPrompt(parsedState.prompt);
//         setLastEventId(parsedState.lastEventId || "");

//         if (parsedState.status === "streaming") {
//           // If we were streaming before, attempt to resume
//           setTimeout(() => {
//             handleStartStream(parsedState.prompt, parsedState.lastEventId);
//           }, 100);
//         } else if (parsedState.status === "error") {
//           setError(parsedState.error || "Unknown error");
//         }
//       } catch (e) {
//         console.error("Error parsing saved stream state:", e);
//         localStorage.removeItem(STORAGE_KEY);
//       }
//     }
//   }, []);

//   // Save current stream state whenever key values change
//   useEffect(() => {
//     const currentState: StreamState = {
//       content,
//       prompt,
//       status: isStreaming
//         ? "streaming"
//         : error
//         ? "error"
//         : content
//         ? "complete"
//         : "idle",
//       lastEventId,
//       error: error || undefined,
//     };

//     localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
//   }, [content, prompt, isStreaming, error, lastEventId]);

//   const handleStartStream = (userPrompt = prompt, resumeFromId = "") => {
//     // If no prompt is set and we're not resuming, don't do anything
//     if (!userPrompt && !resumeFromId) return;

//     // Set UI state
//     setIsStreaming(true);
//     setError("");

//     // If not resuming, clear previous content
//     if (!resumeFromId) {
//       setContent("");
//       setLastEventId("");
//     }

//     // Close existing EventSource if any
//     if (eventSourceRef.current) {
//       eventSourceRef.current.close();
//       eventSourceRef.current = null;
//     }

//     try {
//       // Create URL with prompt as query parameter
//       // Create URL with prompt as query parameter
//       const url = new URL(`${API_BASE_URL}/ai/stream`);
//       url.searchParams.append("topic", userPrompt);

//       // Add lastEventId to the URL if resuming
//       if (resumeFromId) {
//         url.searchParams.append("lastEventId", resumeFromId);
//       }

//       // Create new EventSource with the complete URL
//       const es = new EventSource(url.toString());

//       eventSourceRef.current = es;

//       es.onopen = (e: Event): void => {
//         console.log("SSE Connection Opened", e);
//       };

//       es.onmessage = (event: MessageEvent): void => {
//         const message = event.data as string;

//         // Store last event ID for resuming
//         if (event.lastEventId) {
//           setLastEventId(event.lastEventId);
//         }

//         // Check for special messages
//         if (message === "[STREAM-COMPLETE]") {
//           console.log("SSE stream complete");
//           es.close();
//           setIsStreaming(false);
//           return;
//         }

//         if (message.startsWith("[STREAM-ERROR]")) {
//           const errorMsg = message.replace("[STREAM-ERROR] ", "");
//           console.error("SSE error:", errorMsg);
//           setError(errorMsg);
//           es.close();
//           setIsStreaming(false);
//           return;
//         }

//         // Update content with new chunk
//         setContent((prevContent) => prevContent + message);
//       };

//       es.onerror = (event: Event): void => {
//         console.error("SSE error:", event);
//         // Don't immediately set error - allow reconnection attempts
//         setTimeout(() => {
//           if (es.readyState === EventSource.CLOSED) {
//             setError("SSE connection error - reconnection failed");
//             setIsStreaming(false);
//           }
//         }, 5000); // Wait 5 seconds for potential reconnection
//       };
//     } catch (error) {
//       setError(error instanceof Error ? error.message : "Unknown error");
//       setIsStreaming(false);
//     }
//   };

//   // Clean up on unmount
//   useEffect(() => {
//     return () => {
//       if (eventSourceRef.current) {
//         eventSourceRef.current.close();
//         eventSourceRef.current = null;
//       }
//     };
//   }, []);

//   // Auto-scroll effect
//   // useEffect(() => {
//   //   if (textareaRef.current) {
//   //     textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
//   //   }
//   // }, [content]);

//   return (
//     <div className="container "
//     >
//       <header className="py-4">
//         <h1 className="text-2xl font-bold">Resumable LLM Streaming Demo</h1>
//         <p className="text-gray-500">
//           Test resumable streaming by changing tabs or closing/reopening the
//           browser
//         </p>
//       </header>
//       <Header hidden={false}/>

//       <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
//         <TabsList>
//           <TabsTrigger value="chat">Chat</TabsTrigger>
//           <TabsTrigger value="settings">Settings</TabsTrigger>
//           <TabsTrigger value="about">About</TabsTrigger>
//         </TabsList>

//         <TabsContent value="chat" className="flex-1 p-4">
//           <div className="flex gap-2 mb-4">
//             <Input
//               value={prompt}
//               onChange={(e) => setPrompt(e.target.value)}
//               placeholder="Enter your prompt here..."
//               className="flex-1"
//             />
//             <Button
//               onClick={() => handleStartStream()}
//               disabled={isStreaming || !prompt}
//               variant="default"
//             >
//               {isStreaming ? "Streaming..." : "Start Stream"}
//               {isStreaming && (
//                 <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse"></span>
//               )}
//             </Button>
//           </div>

//           <div className="relative">
//             <div className="h-[40vh] overflow-y-auto border rounded-md p-3">
//               {content ? (
//                 <Markdown>{content}</Markdown>
//               ) : (
//                 <p className="text-muted-foreground">
//                   SSE stream content will appear here...
//                 </p>
//               )}
//             </div>

//             {isStreaming && (
//               <Badge
//                 variant="secondary"
//                 className="absolute top-2 right-2 animate-pulse"
//               >
//                 Streaming...
//               </Badge>
//             )}
//           </div>

//           {error && (
//             <Alert variant="destructive" className="w-full mt-4">
//               <AlertCircle className="h-4 w-4" />
//               <AlertTitle>Error</AlertTitle>
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           {!error && !isStreaming && content && (
//             <div className="text-sm text-muted-foreground w-full flex items-center gap-2 mt-2">
//               <Info className="h-4 w-4" />
//               SSE streaming complete
//             </div>
//           )}
//         </TabsContent>

//         <TabsContent value="settings" className="flex-1 p-4">
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold">Settings</h2>
//             <p>
//               Note: The chat stream continues in the background even when you're
//               on this tab. Switch back to the chat tab to see the progress.
//             </p>

//             <div className="rounded-lg bg-blue-50 dark:bg-blue-900 p-4">
//               <p>
//                 This demo shows how Server-Sent Events (SSE) can maintain a
//                 stream across route changes. In a real application, you could
//                 add settings for model parameters here.
//               </p>
//             </div>

//             <Button
//               variant="outline"
//               onClick={() => {
//                 localStorage.removeItem(STORAGE_KEY);
//                 setContent("");
//                 setPrompt("");
//                 setError("");
//                 setLastEventId("");
//                 setIsStreaming(false);
//               }}
//             >
//               Clear Saved State
//             </Button>
//           </div>
//         </TabsContent>

//         <TabsContent value="about" className="flex-1 p-4">
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold">About Resumable Streaming</h2>
//             <p>This demo shows how to implement resumable streaming with:</p>
//             <ul className="list-disc pl-5">
//               <li>Node.js + Express backend</li>
//               <li>React + TypeScript frontend</li>
//               <li>Server-Sent Events (SSE) for streaming</li>
//               <li>localStorage to persist stream state</li>
//               <li>Event IDs to track streaming progress</li>
//               <li>Automatic reconnection and resumption</li>
//             </ul>
//             <Button onClick={() => setTab("chat")}>Back to Chat</Button>
//           </div>
//         </TabsContent>
//       </Tabs>
//       <div className="absolute top-5 right-5">
//         <ModeToggle />
//       </div>
//     </div>
//   );
// }


// function Header(props: {
//   hidden: boolean
// }) {
//   return <header className="collapsible-row-grid-700 closed:collapse-row group" data-closed={props.hidden ? "" : undefined} style={{
//     overflowAnchor: 'none',
//   }}>
//     <div className="min-h-0">
//       <div className="mb-12 mt-20 text-center lg:text-start flex flex-col items-center lg:block g-closed:opacity-0 g-closed:translate-y-10 transition duration-700">
//         <div className="text-5xl md:text-6xl lg:text-5xl xl:text-6xl  tracking-[-0.08em] font-mono header-fill font-bold">
//         resumable-llm-streams
//         </div>
//         <div className="text-foreground-muted max-w-100 mt-2 font-sans text-xl g-closed:opacity-0 g-closed:translate-y-10 transition duration-700">
//         Test resumable streaming by changing tabs or closing/reopening the
//         browser
//         </div>
//       </div>
//     </div>
//   </header>
// }

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useNavigate, 
  useParams, 
  useLocation 
} from "react-router-dom";
import { ModeToggle } from "./components/theme";

// Motion configuration for iOS-like smoothness
const springConfig = {
  damping: 25,
  stiffness: 120,
  mass: 0.8
};

// Apple-like easing
const appleEasing = [0.23, 1, 0.32, 1]; // ease-out-quint

// Backend URL
const API_URL = "http://localhost:3000";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col relative">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:sessionId" element={<SessionPage />} />
        </Routes>
        <div className="absolute top-4 right-4"><ModeToggle/></div>
      </div>

    </Router>
  );
}

function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const createSession = async (prompt) => {
    try {
      // Generate a unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create the session on the backend
      const response = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          prompt
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const inputPosition = inputRef.current?.getBoundingClientRect();
      
      navigate(`/${sessionId}`, { 
        state: { 
          prompt, 
          inputPosition,
          isNewSession: true
        } 
      });
    } catch (error) {
      console.error("Error creating session:", error);
      setIsSubmitting(false);
    }
  };

  const handleAskButtonClick = async () => {
    if (!prompt.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    await createSession(prompt);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <motion.div 
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.7,
          ease: appleEasing
        }}
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAskButtonClick();
          }} 
          className="relative"
        >
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ask me anything..."
            className="p-5"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
          <Button 
            type="button" 
            className="absolute right-2 top-1"
            size="sm"
            disabled={isSubmitting || !prompt.trim()}
            onClick={handleAskButtonClick}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

function SessionPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [streamedText, setStreamedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  const [renderPhase, setRenderPhase] = useState("transitioning"); // "transitioning", "streaming"
  const [sessionInfo, setSessionInfo] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Get prompt from location state or session info
  const promptText = location.state?.prompt || sessionInfo?.prompt || "Loading...";
  const inputPosition = location.state?.inputPosition;
  const isNewSession = location.state?.isNewSession;

  // Track title animation separately for smoother motion
  const titleY = useMotionValue(inputPosition ? inputPosition.top - 80 : 0);
  const titleX = useMotionValue(inputPosition ? inputPosition.left - 20 : 0);
  const titleWidth = useMotionValue(inputPosition ? inputPosition.width : "auto");
  const titleFontSize = useMotionValue(inputPosition ? "1.125rem" : "1.25rem");
  
  // Apply spring physics for smoother animation
  const springY = useSpring(titleY, springConfig);
  const springX = useSpring(titleX, springConfig);
  const springWidth = useSpring(titleWidth, springConfig);

  // Fetch session info when component mounts or sessionId changes
  useEffect(() => {
    async function fetchSessionInfo() {
      if (!sessionId) return;
      
      try {
        // Try to get the session info from the backend
        const response = await fetch(`${API_URL}/sessions/${sessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          setSessionInfo(data);
          
          // If the session is already completed, fetch the full response
          if (data.isCompleted) {
            const fullResponse = await fetch(`${API_URL}/sessions/${sessionId}/response`);
            if (fullResponse.ok) {
              const fullData = await fullResponse.json();
              setStreamedText(fullData.response);
              setIsLoading(false);
            }
          }
        } else {
          // If session doesn't exist and we don't have prompt info, go back to home
          if (!location.state?.prompt) {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Error fetching session info:", error);
        setConnectionError("Failed to connect to server");
      }
    }
    
    fetchSessionInfo();
  }, [sessionId, navigate, location.state]);

  // Animate title to final position
  useEffect(() => {
    // Start title animation immediately
    titleY.set(0);
    titleX.set(0);
    titleWidth.set("auto");
    titleFontSize.set("1.25rem");
    
    // Delay before starting the streaming phase
    const timer = setTimeout(() => {
      setRenderPhase("streaming");
    }, 800); // Match animation duration
    
    return () => clearTimeout(timer);
  }, [titleY, titleX, titleWidth, titleFontSize]);

  // Set up SSE connection after animation completes
  useEffect(() => {
    if (renderPhase !== "streaming" || !sessionId) return;
    
    // Skip SSE if we already have the full response
    if (sessionInfo?.isCompleted) {
      setIsLoading(false);
      return;
    }
    
    let source = null;
    let retryTimeout = null;
    
    const connectToStream = () => {
      // Clear any existing retry timeouts
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      
      // Close any existing connection
      if (eventSource) {
        eventSource.close();
      }
      
      // Build the URL with session info
      const url = `${API_URL}/ai/stream?sessionId=${sessionId}${
        location.state?.prompt ? `&topic=${encodeURIComponent(location.state.prompt)}` : ''
      }`;
      
      // Create new EventSource
      source = new EventSource(url);
      
      // Handle incoming data
      source.onmessage = (event) => {
        if (event.data === "[STREAM-COMPLETE]") {
          source.close();
          toast("Stream completed")
          setIsLoading(false);
        } else if (event.data.startsWith("[STREAM-ERROR]")) {
          setConnectionError(event.data.replace("[STREAM-ERROR] ", ""));
          source.close();
          
          // Retry after delay
          if (reconnectAttempts < 3) {
            retryTimeout = setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              connectToStream();
            }, 3000);
          }
        } else {
          setStreamedText(prev => prev + event.data);
          setIsLoading(false);
          setConnectionError(null);
          setReconnectAttempts(0);
        }
      };
      
      // Handle connection open
      source.onopen = () => {
        console.log("SSE connection opened");
        setConnectionError(null);
      };
      
      // Handle errors
      source.onerror = (error) => {
        console.error("SSE error:", error);
        setConnectionError("Connection error. Reconnecting...");
        source.close();
        
        // Attempt to reconnect after a delay
        if (reconnectAttempts < 3) {
          retryTimeout = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectToStream();
          }, 3000);
        } else {
          setConnectionError("Failed to connect after multiple attempts");
        }
      };
      
      setEventSource(source);
    };
    
    connectToStream();
    
    // Clean up the connection when component unmounts
    return () => {
      if (source) {
        source.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [sessionId, renderPhase, reconnectAttempts, location.state?.prompt, sessionInfo?.isCompleted]);

  const handleNewPrompt = () => {
    // Clean up before navigating
    if (eventSource) {
      eventSource.close();
    }
    navigate("/");
  };

  // Smooth scroll detection  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Header animation variants
  const headerVariants = {
    initial: {
      height: "auto",
      boxShadow: "0 0 0 rgba(0, 0, 0, 0)"
    },
    scrolled: {
      height: "auto",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <motion.header
        variants={headerVariants}
        initial="initial"
        animate={isScrolled ? "scrolled" : "initial"}
        transition={{ 
          duration: 0.5, 
          ease: appleEasing
        }}
        className="sticky top-0 z-10 w-full backdrop-blur-xs"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.h1 
              className="text-xl font-medium truncate max-w-xl"
              style={{
                y: springY,
                x: springX,
                width: springWidth,
                fontSize: titleFontSize
              }}
              transition={{ 
                type: "spring",
                damping: 25,
                stiffness: 120,
                mass: 0.8
              }}
            >
              {promptText}
            </motion.h1>
            <Button 
              variant="outline" 
              onClick={handleNewPrompt}
              className="ml-auto"
            >
              New Prompt
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {connectionError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600"
            >
              {connectionError}
              {reconnectAttempts > 0 && reconnectAttempts < 3 && (
                <span> (Attempt {reconnectAttempts}/3)</span>
              )}
            </motion.div>
          )}
          
          {renderPhase === "transitioning" || (renderPhase === "streaming" && isLoading && !streamedText) ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.5,
                ease: appleEasing
              }}
              className="flex justify-center py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </motion.div>
          ) : (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.7, 
                ease: appleEasing,
                delay: 0.1
              }}
              className="bg-accent rounded-xl p-6 shadow-md"
            >
              {streamedText ? (
                <div className="leading-normal whitespace-pre-wrap prose max-w-none font-mono">
                <MarkdownRenderer content={streamedText}/>
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}
              
              {isLoading && streamedText && (
                <div className="flex items-center mt-4 text-slate-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Claude is thinking...
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { toast } from "sonner";

const MarkdownRenderer = ({ content }) => {
  return (
    <ReactMarkdown 
      rehypePlugins={[rehypeRaw]} 
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
};
