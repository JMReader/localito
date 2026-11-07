"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, Mic, Terminal } from "lucide-react";
import { OrbMode } from "./AsciiSphereOrb";
import gsap from "gsap";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  time: string;
}

interface AgentChatPanelProps {
  onModeChange: (mode: OrbMode) => void;
}

export function AgentChatPanel({ onModeChange }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "user",
      text: "Crear contrato CriteriaLock para bloquear 50,000 ARGt con entrega de desarrollo y auditoría.",
      time: "19:42",
    },
    {
      id: "2",
      sender: "agent",
      text: "Contrato #TW-8841 desplegado en Avalanche C-Chain. Fondos bloqueados en pool de custodia. Verificando oráculos de cobertura cambiaria y tests de GitHub...",
      time: "19:43",
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    setInputVal("");

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    onModeChange("thinking");

    setTimeout(() => {
      onModeChange("speaking");
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        text: `Instrucción "${userText}" recibida. Verificación de hitos sincronizada en oráculo Twin. Estado de custodia actualizado en tiempo real.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, agentMsg]);

      setTimeout(() => {
        onModeChange("idle");
      }, 2800);
    }, 1400);
  };

  return (
    <div className="w-full flex flex-col h-[520px] rounded-xl bg-[#09090b] border border-[#27272a] shadow-xl overflow-hidden select-none">
      
      {/* Header inspired by Pinterest Pin 4 "Agent mode" */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f1f23] bg-[#0c0c0e]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-tight text-white font-sans">
                Agent mode
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              Twin Autonomous Financial Agent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
          <Terminal className="w-3 h-3 text-zinc-500" />
          <span>v1.0.4</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-sans text-xs">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex flex-col gap-1 max-w-[85%] ${
                isUser ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-500 font-mono">
                {isUser ? (
                  <>
                    <span>Tú</span>
                    <span>•</span>
                    <span>{m.time}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-400 font-medium">TwinAgent</span>
                    <span>•</span>
                    <span>{m.time}</span>
                  </>
                )}
              </div>

              <div
                className={`p-3 rounded-lg leading-relaxed ${
                  isUser
                    ? "bg-[#0066FF] text-white shadow-sm"
                    : "bg-[#121216] border border-[#27272a] text-zinc-200 shadow-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#1f1f23] bg-[#0c0c0e]">
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#09090b] border border-[#27272a] focus-within:border-blue-500/60 transition-colors">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Pregúntale al agente o instruye un bloqueo de fondos..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none font-sans"
          />
          <button
            type="button"
            onClick={() => onModeChange("voice")}
            title="Activar voz"
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-1.5 rounded-md bg-[#0066FF] hover:bg-[#0055DD] disabled:opacity-30 disabled:hover:bg-[#0066FF] text-white transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

    </div>
  );
}
