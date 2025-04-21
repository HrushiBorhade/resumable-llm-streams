"use client";

import Link from "next/link";
import ThemeModeToggle from "@/components/theme/theme-toggle";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import useSession from "@/hooks/use-session";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const { session, regenerateSessionId, clearSessionId } = useSession();

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
