'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, Send, Plus, Clock, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { Messages } from '@/lib/i18n/messages';

interface Message {
  id: number;
  role: 'user' | 'ai';
  // Typed-in messages carry their own text; canned demo messages point into
  // the translations so they follow the active language.
  text?: string;
  canned?: { list: 'initialMessages' | 'responses'; index: number };
}

const pastChats: { id: number; key: keyof Messages['chat']['pastChats']; ago: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { id: 1, key: 'sleep', ago: 2, unit: 'day' },
  { id: 2, key: 'heartRate', ago: 5, unit: 'day' },
  { id: 3, key: 'weeklySummary', ago: 1, unit: 'week' },
];

const initialMessages: Message[] = [
  { id: 1, role: 'user', canned: { list: 'initialMessages', index: 0 } },
  { id: 2, role: 'ai', canned: { list: 'initialMessages', index: 1 } },
  { id: 3, role: 'user', canned: { list: 'initialMessages', index: 2 } },
  { id: 4, role: 'ai', canned: { list: 'initialMessages', index: 3 } },
];

export default function ChatPage() {
  const { m, formatRelativeTime } = useI18n();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const messageText = (msg: Message) =>
    msg.text ?? (msg.canned ? m.chat[msg.canned.list][msg.canned.index] : '');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: messages.length + 1,
      role: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const aiMsg: Message = {
        id: messages.length + 2,
        role: 'ai',
        canned: { list: 'responses', index: responseIndex % m.chat.responses.length },
      };
      setMessages((prev) => [...prev, aiMsg]);
      setResponseIndex((prev) => (prev + 1) % m.chat.responses.length);
    }, 1500);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Conversations panel - hidden on mobile */}
      <div className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.chat.conversations}</h2>
          <button aria-label={m.chat.newConversation} className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Current conversation */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer">
            <p className="text-sm font-semibold text-emerald-700 truncate">{m.chat.currentSession}</p>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-400">{m.chat.justNow}</p>
            </div>
          </div>
          {pastChats.map((chat) => (
            <div key={chat.id} className="p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
              <p className="text-sm font-medium text-gray-700 truncate">{m.chat.pastChats[chat.key]}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400">{formatRelativeTime(-chat.ago, chat.unit)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.chat.assistantName}</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs text-emerald-600 font-medium">{m.chat.online}</span>
            </div>
            <p className="text-xs text-gray-400">{m.chat.assistantSubtitle}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
                  <span className="text-white text-xs font-bold">H</span>
                </div>
              )}
              <div
                className={`max-w-[80%] lg:max-w-[65%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-md shadow-md shadow-emerald-100'
                    : 'bg-white text-gray-700 rounded-bl-md shadow-sm border border-gray-100'
                }`}
              >
                {messageText(msg)}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center flex-shrink-0 ml-2 mt-1 shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="flex justify-start animate-slide-up">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
                <span className="text-white text-xs font-bold">H</span>
              </div>
              <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full dot-1" />
                <div className="w-2 h-2 bg-emerald-400 rounded-full dot-2" />
                <div className="w-2 h-2 bg-emerald-400 rounded-full dot-3" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSend} className="flex gap-3 items-end">
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={m.chat.inputPlaceholder}
                className="w-full bg-transparent px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              aria-label={m.chat.send}
              disabled={!input.trim() || typing}
              className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-2">{m.chat.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
