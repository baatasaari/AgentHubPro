import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User } from "lucide-react";
import { INDUSTRIES } from "@shared/schema";
import type { Agent } from "@shared/schema";

interface ChatWidgetProps {
  agent: Partial<Agent>;
}

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export default function ChatWidget({ agent }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hi! I'm here to help you with any questions about our services. How can I assist you today?`,
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const industry = INDUSTRIES.find(i => i.value === agent.industry);
  const businessName = agent.businessName || "Business Assistant";

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    const botResponse: Message = {
      id: messages.length + 2,
      text: getBotResponse(inputValue, agent),
      isBot: true,
      timestamp: new Date(Date.now() + 1000),
    };

    setMessages(prev => [...prev, userMessage, botResponse]);
    setInputValue("");
  };

  const getBotResponse = (userInput: string, agentData: Partial<Agent>): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes("hours") || input.includes("open")) {
      return "We're open Monday to Friday, 9 AM to 6 PM. Our online services are available 24/7. Is there anything specific you'd like to know about our offerings?";
    }
    
    if (input.includes("price") || input.includes("cost")) {
      return "I'd be happy to help you with pricing information. Could you please let me know which specific service or product you're interested in?";
    }
    
    if (input.includes("contact") || input.includes("phone")) {
      return "You can reach us through this chat, or visit our website for additional contact options. How else can I help you today?";
    }
    
    // Industry-specific responses
    switch (agentData.industry) {
      case "healthcare":
        return "I can help you with appointment scheduling, general health information, and questions about our medical services. What would you like to know?";
      case "retail":
        return "I can assist you with product information, order tracking, returns, and general shopping questions. What can I help you find today?";
      case "realestate":
        return "I can help you with property information, scheduling viewings, market insights, and answering questions about buying or selling. What interests you?";
      default:
        return "Thank you for your message! I'm here to help with any questions about our services. Could you please provide more details about what you're looking for?";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-medium">{businessName}</h4>
            <p className="text-xs text-primary-foreground/80">Online • Powered by AI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-64 bg-muted/30 p-4 overflow-y-auto">
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 ${
                message.isBot ? "" : "justify-end"
              }`}
            >
              {message.isBot && (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              
              <div
                className={`rounded-lg p-3 max-w-xs shadow-sm ${
                  message.isBot
                    ? "chat-message-bot rounded-tl-none"
                    : "chat-message-user rounded-tr-none text-primary-foreground"
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>

              {!message.isBot && (
                <div className="w-6 h-6 bg-muted-foreground rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-background" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 text-sm"
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
