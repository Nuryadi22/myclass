'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { storeDiscussionAction } from '@/app/actions/discussion';
import { Send, CornerDownRight, X, Reply } from 'lucide-react';

interface User {
  id: number;
  name: string;
  role: string;
  className?: string | null;
}

interface Discussion {
  id: number;
  message: string;
  userId: number;
  replyToId: number | null;
  createdAt: Date;
  user: User;
  replyTo?: {
    id: number;
    message: string;
    user: {
      name: string;
    };
  } | null;
}

interface DiscussionBoardProps {
  initialDiscussions: Discussion[];
  currentUser: {
    userId: number;
    name: string;
    username: string;
    role: string;
  };
}

export default function DiscussionBoard({ initialDiscussions, currentUser }: DiscussionBoardProps) {
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Discussion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const prevDiscussionsLength = useRef(initialDiscussions.length);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDiscussions = async () => {
    try {
      const res = await fetch('/api/discussions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDiscussions(data);
        }
      }
    } catch (err) {
      console.error('Error fetching discussions:', err);
    }
  };

  // Sync state if initialDiscussions changes from server
  useEffect(() => {
    setDiscussions(initialDiscussions);
    prevDiscussionsLength.current = initialDiscussions.length;
  }, [initialDiscussions]);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Scroll to bottom when new messages arrive (size grew)
  useEffect(() => {
    if (discussions.length > prevDiscussionsLength.current) {
      scrollToBottom();
    }
    prevDiscussionsLength.current = discussions.length;
  }, [discussions]);

  // Poll discussions every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchDiscussions, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleReplyClick = (disc: Discussion) => {
    setReplyTo(disc);
    setError(null);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const renderMessageWithLinks = (text: string, isMe: boolean) => {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const hrefUrl = part.toLowerCase().startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={index}
            href={hrefUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline font-extrabold break-all ${
              isMe 
                ? 'text-indigo-200 hover:text-indigo-100 transition-colors' 
                : 'text-indigo-650 hover:text-indigo-850 transition-colors'
            }`}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setError(null);
    const formData = new FormData();
    formData.append('message', messageText);
    if (replyTo) {
      formData.append('reply_to_id', replyTo.id.toString());
    }

    startTransition(async () => {
      const result = await storeDiscussionAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setMessageText('');
        setReplyTo(null);
        if (formRef.current) formRef.current.reset();
        await fetchDiscussions();
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-slate-800 text-base">Forum Diskusi Kelas</h3>
          <p className="text-xs text-slate-400 font-semibold">Berbagi informasi perkembangan kelas secara global.</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/10">
        {discussions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-150 flex items-center justify-center text-3xl mb-4 shadow-inner">
              💬
            </div>
            <p className="text-slate-455 font-bold text-sm">Belum ada diskusi.</p>
            <p className="text-xs text-slate-400 font-semibold max-w-xs mt-1">
              Mulai percakapan dengan menuliskan pesan Anda di kolom bawah.
            </p>
          </div>
        ) : (
          discussions.map((disc) => {
            const isMe = disc.userId === currentUser.userId;
            const isTeacher = disc.user.role === 'teacher';

            // Initials
            const initials = disc.user.name.substring(0, 2).toUpperCase();

            // Format date
            const timeStr = new Date(disc.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={disc.id}
                className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs ${
                    isMe
                      ? 'bg-slate-150 text-slate-700'
                      : isTeacher
                      ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100'
                      : 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100'
                  }`}
                  title={`${disc.user.name} (${disc.user.role === 'teacher' ? 'Guru' : 'Wali Murid'})`}
                >
                  {initials}
                </div>

                {/* Message Body */}
                <div className="space-y-1">
                  {/* Sender Meta */}
                  <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 font-bold ${isMe ? 'justify-end' : ''}`}>
                    <span className="text-slate-700">{disc.user.name}</span>
                    <span>•</span>
                    <span className="capitalize">
                      {isTeacher ? `Guru ${disc.user.className || ''}` : 'Orang Tua'}
                    </span>
                    <span>•</span>
                    <span>{timeStr}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-sm relative group shadow-2xs ${
                      isMe
                        ? 'bg-slate-800 text-white rounded-tr-none'
                        : isTeacher
                        ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tl-none'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {/* Reply Quoted Preview */}
                    {disc.replyTo && (
                      <div
                        className={`mb-2 p-2 rounded-xl text-xs flex items-start gap-1.5 ${
                          isMe
                            ? 'bg-slate-700/60 text-slate-200 border-l-2 border-slate-350'
                            : 'bg-slate-100/80 text-slate-600 border-l-2 border-slate-300'
                        }`}
                      >
                        <CornerDownRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <div className="truncate">
                          <span className="font-extrabold block text-[10px] uppercase leading-tight">
                            {disc.replyTo.user.name}
                          </span>
                          <span className="italic">{renderMessageWithLinks(disc.replyTo.message, isMe)}</span>
                        </div>
                      </div>
                    )}

                    {/* Actual Message */}
                    <p className="leading-relaxed whitespace-pre-wrap select-text">{renderMessageWithLinks(disc.message, isMe)}</p>

                    {/* Reply Button (Hover overlay or simple trigger) */}
                    <button
                      onClick={() => handleReplyClick(disc)}
                      className={`absolute bottom-2 -right-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:text-indigo-600 hover:bg-indigo-50 text-slate-400 cursor-pointer`}
                      title="Balas pesan ini"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-4 border-t border-slate-100 bg-white">
        {error && (
          <div className="mb-2 text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg flex items-center gap-1.5 animate-shake">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Reply Indicator banner */}
        {replyTo && (
          <div className="mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs animate-slide-in">
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div className="truncate">
                <span className="font-extrabold text-indigo-900 block text-[10px] uppercase leading-none">
                  Membalas ke {replyTo.user.name}
                </span>
                <span className="text-slate-600 italic truncate block mt-0.5">{replyTo.message}</span>
              </div>
            </div>
            <button
              onClick={handleCancelReply}
              className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-100 rounded-lg cursor-pointer"
              title="Batal balas"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isPending}
            placeholder={
              replyTo
                ? `Tulis balasan untuk ${replyTo.user.name}...`
                : "Tulis pesan Anda untuk guru & orang tua lainnya..."
            }
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white text-sm font-semibold transition-all"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={isPending || !messageText.trim()}
            className="px-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer"
            title="Kirim pesan"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
