import { ModeToggle } from "@/components/theme/theme-toggle";

export default function Home() {
  return (
    <div className="bg-background w-full h-screen flex items-center justify-center">
      <p className="text-primary">Resilient LLM Streams</p>
      <div className="absolute bottom-3 right-3">
        <ModeToggle />
      </div>
    </div>
  );
}
