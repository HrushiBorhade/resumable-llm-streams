import Link from "next/link";
import ModeToggle from "@/components/theme/theme-toggle";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";

export default function Home() {
  return (
    <div className="bg-background w-full h-screen flex items-center justify-center">
      <div className="container w-full flex flex-col justify-center items-center gap-3 mx-auto p-4">
        <AnimatedShinyText className="text-4xl font-bold font-mono"> resilient-llm-streams</AnimatedShinyText>
      </div>

      <div className="absolute bottom-3 right-3">
        <ModeToggle />
      </div>
      <div className="absolute left-1/2 bottom-2 -translate-x-1/2">
        <div className="flex items-center justify-center gap-0.5">
          <Link
            href="https://x.com/BorhadeHrushi"
            target="_blank"
            className="group relative"
          >
            <p className="font-kalam text-lg font-light">~ ऋषी</p>
            <span className="absolute inset-x-0 bottom-[2px] h-px bg-gradient-to-b from-[#d1d5db] via-[#6b7280] to-[#374151] opacity-0 transition group-hover:opacity-100"></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
