'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Send, Plus, Clock, User, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { deleteConversation } from '@/app/actions/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ChatView({
  conversations,
  activeId,
  initialMessages,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  initialMessages: ChatMessage[];
}) {
  const { m, formatDate } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(activeId);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [errorKey, setErrorKey] = useState<'error' | 'rateLimited' | 'notConfigured' | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || streaming) return;

    setErrorKey(null);
    setInput('');
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', content: question }]);
    setStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, conversationId }),
      });

      if (response.status === 429) {
        setErrorKey('rateLimited');
        return;
      }
      // The deployment has no Anthropic key: say so instead of "try again".
      if (response.status === 503) {
        setErrorKey('notConfigured');
        return;
      }
      if (!response.ok || !response.body) {
        setErrorKey('error');
        return;
      }

      const newId = response.headers.get('X-Conversation-Id');

      const replyId = `reply-${Date.now()}`;
      setMessages((prev) => [...prev, { id: replyId, role: 'ai', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';

      // Append each chunk as it arrives so the answer types itself out.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.includes('__error__')) {
          setErrorKey('error');
          continue;
        }
        reply += chunk;
        setMessages((prev) => prev.map((msg) => (msg.id === replyId ? { ...msg, content: reply } : msg)));
      }

      if (!reply) {
        // The server discards a conversation that got no answer, so this one
        // is not adopted: the next attempt starts cleanly.
        setErrorKey('error');
        setMessages((prev) => prev.filter((msg) => msg.id !== replyId));
        return;
      }
      if (newId && newId !== conversationId) setConversationId(newId);
      // Refresh the conversation list in the sidebar.
      router.refresh();
    } catch {
      setErrorKey('error');
    } finally {
      setStreaming(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setErrorKey(null);
  };

  const removeConversation = async (id: string) => {
    if (!window.confirm(m.chat.deleteConfirm)) return;
    const result = await deleteConversation(id);
    if (result.status !== 'ok') {
      setErrorKey('error');
      return;
    }
    if (id === conversationId) {
      startNewConversation();
      router.push('/chat');
    }
    router.refresh();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Conversations panel */}
      <div className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.chat.conversations}</h2>
          <button
            onClick={startNewConversation}
            aria-label={m.chat.newConversation}
            className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversationId === null && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-sm font-semibold text-emerald-700 truncate">{m.chat.currentSession}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400">{m.chat.justNow}</p>
              </div>
            </div>
          )}

          {conversations.length === 0 && conversationId !== null && (
            <p className="p-3 text-sm text-gray-400">{m.chat.noConversations}</p>
          )}

          {conversations.map((conversation) => {
            const active = conversation.id === conversationId;
            return (
              <div
                key={conversation.id}
                className={`group relative rounded-xl transition-colors ${active ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50'}`}
              >
                <button
                  onClick={() => router.push(`/chat?c=${conversation.id}`)}
                  className="w-full text-left p-3 pr-10"
                >
                  <p className={`text-sm truncate ${active ? 'font-semibold text-emerald-700' : 'font-medium text-gray-700'}`}>
                    {conversation.title || m.chat.currentSession}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-400">
                      {formatDate(new Date(conversation.updatedAt), { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => void removeConversation(conversation.id)}
                  aria-label={m.chat.deleteConversation}
                  title={m.chat.deleteConversation}
                  className="absolute top-3 right-2 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
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

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.chat.emptyTitle}</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">{m.chat.emptyBody}</p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {m.chat.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="px-3.5 py-2 rounded-full text-sm text-gray-600 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex animate-slide-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
                  <span className="text-white text-xs font-bold">H</span>
                </div>
              )}
              <div
                className={`max-w-[80%] lg:max-w-[65%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-md shadow-md shadow-emerald-100'
                    : 'bg-white text-gray-700 rounded-bl-md shadow-sm border border-gray-100'
                }`}
              >
                {message.content || (
                  <span className="flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full dot-1" />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full dot-2" />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full dot-3" />
                  </span>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center flex-shrink-0 ml-2 mt-1 shadow-sm">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {errorKey && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 max-w-md">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{m.chat[errorKey]}</p>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="flex gap-3 items-end"
          >
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={m.chat.inputPlaceholder}
                maxLength={4000}
                className="w-full bg-transparent px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              aria-label={m.chat.send}
              disabled={!input.trim() || streaming}
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
