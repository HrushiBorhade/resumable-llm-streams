"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { customAlphabet } from "nanoid";

const useSession = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const router = useRouter();
  const generateSessionId = customAlphabet("0123456789", 6);

  const updateURLWithSessionId = useCallback(
    (id: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("sessionId", id);
      router.replace(url.toString(), { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get("sessionId");
    const localStorageSessionId = localStorage.getItem(
      "resilient-llm-streams-session-id"
    );
    if (urlSessionId) {
      setSessionId(urlSessionId);
      localStorage.setItem("resilient-llm-streams-session-id", urlSessionId);
    } else if (localStorageSessionId) {
      setSessionId(localStorageSessionId);
      updateURLWithSessionId(localStorageSessionId);
    } else {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      localStorage.setItem("resilient-llm-streams-session-id", newSessionId);
      updateURLWithSessionId(newSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessionId,
    updateURLWithSessionId,
  };
};
export default useSession;
