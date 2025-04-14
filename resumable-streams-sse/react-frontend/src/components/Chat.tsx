// src/components/Chat.tsx
import React, { useState, useRef } from 'react';
import { useResumableStream } from '../hooks/useResumableStream';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, XCircle } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    message: assistantMessage, 
    isLoading, 
    error, 
    connect, 
    disconnect 
  } = useResumableStream({
    onComplete: () => {
      // Add the full assistant message to the conversation
      if (assistantMessage) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: assistantMessage }
        ]);
      }
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll down when messages update
  React.useEffect(() => {
    scrollToBottom();
  }, [messages, assistantMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message to the conversation
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Format messages for Anthropic API
    const formattedMessages = messages.concat(userMessage).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Start streaming response
    await connect(formattedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat with Claude</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-3/4 p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {/* Stream in progress */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3/4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                {assistantMessage || <Loader2 className="animate-spin" />}
              </div>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="flex items-center text-red-500">
                <XCircle className="mr-2" />
                <span>Error: {error}</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none"
            placeholder="Type your message..."
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}