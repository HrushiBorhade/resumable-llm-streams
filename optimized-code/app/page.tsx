"use client";

import Link from "next/link";
import ThemeModeToggle from "@/components/theme/theme-toggle";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import useSession from "@/hooks/use-session";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  MessageType,
  validateMessage,
  type ChunkMessage,
  type MetadataMessage,
  StreamStatus,
} from "@/lib/message-schema";
import { useMutation, useQuery } from "@tanstack/react-query";

class PreconditionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreconditionFailedError";
  }
}
export default function Home() {
  const { sessionId, regenerateSessionId, clearSessionId } = useSession();

  const [prompt, setPrompt] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "streaming" | "completed" | "error"
  >("idle");
  const [response, setResponse] = useState<string>("");
  const [chunkCount, setChunkCount] = useState<number>(0);

  const controller = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement | null>(null);
  const isInitialRequest = useRef(true);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current?.scrollHeight;
    }
  }, [response]);

  // start stream generator
  const { mutate, error } = useMutation({
    mutationFn: async (newSessionId: string) => {
      controller.current?.abort();
      isInitialRequest.current = false;

      await fetch("/api/llm-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, sessionId: newSessionId }),
      });
    },
    onSuccess: () => {
      setStatus("streaming");
      refetch();
    },
  });

  const { refetch } = useQuery({
    queryKey: ["stream", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      setResponse("");
      setChunkCount(0);

      const abortController = new AbortController();
      controller.current = abortController;

      const res = await fetch(`/api/check-stream?sessionId=${sessionId}`, {
        headers: {
          "Content-Type": "text/event-stream",
        },
        signal: controller.current.signal,
      });

      if (res.status === 412) {
        throw new PreconditionFailedError("Stream not ready yet");
      }
      if (!res.body) return null;

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

      let streamContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          const messages = value.split("\n\n").filter(Boolean)
          for (const message of messages) {
            if (message.startsWith("data: ")) {
              const data = message.slice(6);
              try {
                const parsedData = JSON.parse(data);
                const validatedMessage = validateMessage(parsedData);

                if (!validatedMessage) continue;

                switch (validatedMessage.type) {
                  case MessageType.CHUNK:
                    const chunkMessage = validatedMessage as ChunkMessage;
                    streamContent += chunkMessage.content;
                    setResponse((prev) => prev + chunkMessage.content);
                    setChunkCount((prev) => prev + 1);
                    break;

                  case MessageType.METADATA:
                    const metadataMessage = validatedMessage as MetadataMessage;

                    if (metadataMessage.status === StreamStatus.COMPLETED) {
                      setStatus("completed");
                    }
                    break;

                  case MessageType.ERROR:
                    setStatus("error");
                    break;
                }
              } catch (e) {
                console.error("Failed to parse message:", e);
              }
            }
          }
        }
      }
      return streamContent;
    },
  });

  const handleReset = () => {
    setPrompt("");
    setResponse("");
    setChunkCount(0);
    clearSessionId();
    controller.current?.abort();
    setStatus("idle");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    setStatus("loading");
    const newSessionId = regenerateSessionId();
    mutate(newSessionId);
  };

  return (
    <div className="bg-background w-full h-screen flex items-center justify-center">
      <div className="container w-full flex flex-col justify-center items-center gap-3 mx-auto p-4">
        <AnimatedShinyText className="text-4xl font-medium  -tracking-[1px] leading-[1.2] overflow-hidden font-serif">
          {"Resilient llm streams .".split("").map((letter, index) => {
            return (
              <span
                key={index}
                className={`animate-letter ${index >= 14 && "italic"}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {letter}
              </span>
            );
          })}
        </AnimatedShinyText>
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm flex flex-col gap-3 "
        >
          <Textarea
            autoFocus
            maxLength={800}
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="rounded-lg w-full max-h-[200px]"
            placeholder="Ask the AI something..."
            disabled={status === "loading" || status === "streaming"}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={status === "loading" || status === "streaming"}
              className="flex-1"
            >
              {status === "loading"
                ? "Starting..."
                : status === "streaming"
                ? "Streaming..."
                : "Generate Response"}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              type="button"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </form>
        <div className="mt-8 w-full">
          <h2 className="text-xl tracking-tight font-semibold mb-2">
            Response:
          </h2>
          {status === "error" ? (
            <div className="p-4 bg-red-100 border border-red-300 rounded-md text-red-800">
              <p className="font-bold">Error:</p>
              <p>{error?.message}</p>
            </div>
          ) : status === "idle" && !response ? (
            <p className="text-gray-500">
              {`Enter a prompt and click "Generate Response" to see the AI's
              response.`}
            </p>
          ) : (
            <div
              ref={responseRef}
              className="flex flex-col h-40 overflow-y-auto p-4 bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-md whitespace-pre-wrap [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-zinc-800"
            >
              <div>{response || "Loading..."}</div>
            </div>
          )}

          {(status === "streaming" || status === "completed") && (
            <div className="mt-2 text-sm text-gray-500">
              <p>Session ID: {sessionId}</p>
              <p>Status: {status}</p>
              <p>Chunks received: {chunkCount}</p>
              <p>
                Connection: {status === "streaming" ? "Active SSE" : "Closed"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* theme mode toggle */}
      <div className="absolute bottom-3 right-3">
        <ThemeModeToggle />
      </div>

      {/* builder info */}
      <div className="absolute left-1/2 bottom-2 -translate-x-1/2">
        <div className="flex items-center justify-center gap-0.5">
          <Link
            href="https://x.com/BorhadeHrushi"
            target="_blank"
            className="group relative"
          >
            <p className="font-kalam text-sm font-light italic">~ऋषी</p>
            <span className="absolute inset-x-0 bottom-[2px] h-px bg-gradient-to-b from-[#d1d5db] via-[#6b7280] to-[#374151] opacity-0 transition group-hover:opacity-100"></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
