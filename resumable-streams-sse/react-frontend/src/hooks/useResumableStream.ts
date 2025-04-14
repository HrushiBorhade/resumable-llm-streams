// src/hooks/useResumableStream.ts
import { useState, useEffect, useRef } from 'react';

interface UseResumableStreamOptions {
  onMessage?: (message: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

interface UseResumableStreamResult {
  message: string;
  isLoading: boolean;
  error: string | null;
  connect: (messages: any[]) => Promise<void>;
  disconnect: () => void;
}

export function useResumableStream({
  onMessage,
  onComplete,
  onError,
  autoConnect = false,
}: UseResumableStreamOptions = {}): UseResumableStreamResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<number>(0);

  // Store session in localStorage for persistence
  useEffect(() => {
    // Load existing session if available
    const savedSession = localStorage.getItem('resumable_session');
    if (savedSession && autoConnect) {
      try {
        const { sessionId, lastEventId } = JSON.parse(savedSession);
        setSessionId(sessionId);
        lastEventIdRef.current = lastEventId || 0;
        // Reconnect using the stored session
        connectToEventSource(sessionId);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('resumable_session');
      }
    }
  }, [autoConnect]);

  // Save session to localStorage when updated
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(
        'resumable_session',
        JSON.stringify({
          sessionId,
          lastEventId: lastEventIdRef.current,
        })
      );
    }
  }, [sessionId, lastEventIdRef.current]);

  // Clean up event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        // Note: We don't call disconnect() here because we want the stream to continue
        // even when the component unmounts
      }
    };
  }, []);

  const connectToEventSource = (sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    setError(null);

    const url = new URL(`/api/chat/stream/${sessionId}`, window.location.origin);
    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    // Handle different event types
    eventSource.addEventListener('content', (event) => {
      const { content } = JSON.parse(event.data);
      setMessage((prev) => prev + content);
      
      if (onMessage) {
        onMessage(content);
      }
      
      if (event.lastEventId) {
        lastEventIdRef.current = parseInt(event.lastEventId, 10);
      }
    });

    eventSource.addEventListener('status', (event) => {
      const { status } = JSON.parse(event.data);
      console.log('Stream status:', status);
    });

    eventSource.addEventListener('done', () => {
      setIsLoading(false);
      eventSource.close();
      
      if (onComplete) {
        onComplete();
      }
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse((event as any).data || '{"error": "Connection error"}');
      setError(data.error);
      setIsLoading(false);
      
      if (onError) {
        onError(data.error);
      }
      
      // Don't close on error - allow reconnection attempts
      // The browser will automatically try to reconnect
    });

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      // Don't set error or close here - let the browser handle reconnection
    };
  };

  const connect = async (messages: any[]) => {
    try {
      // Create a new session
      const response = await fetch('/api/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat session');
      }

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);
      setMessage('');
      lastEventIdRef.current = 0;

      // Connect to the event source
      connectToEventSource(newSessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Note: We don't clear the sessionId or localStorage here
    // This allows reconnecting later
    setIsLoading(false);
  };

  return {
    message,
    isLoading,
    error,
    connect,
    disconnect,
  };
}