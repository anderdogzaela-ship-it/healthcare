'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Heart, Send, Plus, Clock, LayoutDashboard, MessageCircle,
  Activity, Settings, ChevronRight, Menu, User
} from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'ai';
  content: string;
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Health Log', icon: Heart, path: '/health' },
  { label: 'AI Assistant', icon: MessageCircle, path: '/chat' },
  { label: 'Activity', icon: Activity, path: '/activity' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const pastChats = [
  { id: 1, title: 'Sleep quality analysis', time: '2 days ago' },
  { id: 2, title: 'Heart rate concerns', time: '5 days ago' },
  { id: 3, title: 'Weekly health summary', time: '1 week ago' },
];

const mockResponses = [
  "Based on your recent health logs, your cardiovascular metrics look excellent! Your resting heart rate of 72 bpm and blood pressure of 118/76 are both within optimal ranges. Keep up the great work with your activity levels.",
  "Your sleep patterns have been improving steadily. The 7 hours 20 minutes you logged last night is close to the recommended 7-9 hours. To further improve, try to maintain a consistent bedtime and limit screen time 30 minutes before sleep.",
  "I notice your step count has been around 6,800 steps daily, which is approaching your 7,500 goal. Consider taking short 10-minute walks during breaks to reach that target. Even small increases in daily movement can have significant health benefits.",
  "Your hydration levels have been slightly below your daily target. Proper hydration supports all your vital functions including heart health, sleep quality, and energy levels. Try setting reminders to drink water throughout the day.",
];

const initialMessages: Message[] = [
  { id: 1, role: 'user', content: 'What does my health data show this week?' },
  {
    id: 2, role: 'ai', content: "Based on your logged data this week, I can see some positive trends! Your sleep quality has improved by 12%, and your average daily steps (6,840) are approaching your 7,500 goal. Your resting heart rate of 72 bpm is excellent. One area to watch: your hydration logs have been lower than your target for the past 3 days."
  },
  { id: 3, role: 'user', content: 'Should I be worried about my heart rate?' },
  {
    id: 4, role: 'ai', content: "Not at all! Your resting heart rate of 72 bpm falls well within the healthy range of 60-100 bpm for adults. It's actually on the lower end, which often indicates good cardiovascular fitness. I'll continue monitoring your trends and alert you if anything changes significantly."
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const aiMsg: Message = {
        id: messages.length + 2,
        role: 'ai',
        content: mockResponses[responseIndex % mockResponses.length],
      };
      setMessages((prev) => [...prev, aiMsg]);
      setResponseIndex((prev) => (prev + 1) % mockResponses.length);
    }, 1500);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { window.location.href = item.path; }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SJ</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Sarah Johnson</p>
              <p className="text-xs text-gray-400 truncate">Premium member</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top nav */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>AI Assistant</span>
          <button onClick={() => setSidebarOpen(false)} className="p-2">
            <div className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Conversations panel - hidden on mobile */}
          <div className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Conversations</h2>
              <button className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {/* Current conversation */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer">
                <p className="text-sm font-semibold text-emerald-700 truncate">Current session</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-400">Just now</p>
                </div>
              </div>
              {pastChats.map((chat) => (
                <div key={chat.id} className="p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium text-gray-700 truncate">{chat.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-400">{chat.time}</p>
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
                  <span className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI Assistant</span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs text-emerald-600 font-medium">Online</span>
                </div>
                <p className="text-xs text-gray-400">AI-powered health companion</p>
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
                    {msg.content}
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
                    placeholder="Ask about your health..."
                    className="w-full bg-transparent px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
              <p className="text-xs text-gray-400 text-center mt-2">HealthAI provides general health information, not medical advice.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
