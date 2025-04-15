import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/theme/index.ts";
import { DotPattern } from "./components/magicui/dot-pattern.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <DotPattern className="-z-100"/>
    </ThemeProvider>
  </StrictMode>
);
