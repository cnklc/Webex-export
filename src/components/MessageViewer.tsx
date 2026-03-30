import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, Calendar, User, Home } from 'lucide-react';
import type { WebexMessage } from '../services/webex';
import { ChatBubble } from './ChatBubble';

interface MessageViewerProps {
  messages: WebexMessage[];
  onBack: () => void;
  title: string;
  initialEmail?: string;
}

export const MessageViewer: React.FC<MessageViewerProps> = ({ messages, onBack, title, initialEmail = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [myEmail, setMyEmail] = useState(initialEmail);

  const filteredMessages = useMemo(() => {
    const list = [...messages]; // Webex returns newest first
    if (!searchTerm.trim()) return list;
    return list.filter(msg => 
      msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.personEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: WebexMessage[] } = {};
    filteredMessages.forEach(msg => {
      const date = new Date(msg.created).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  }, [filteredMessages]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-panel viewer-container overflow-hidden"
    >
      <div className="search-container flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 rounded-full hover-bg-white-5 transition-all border border-white-5"
              title="Geri Dön"
            >
              <ChevronLeft size={20} className="text-text-secondary" />
            </button>
            <button 
              onClick={() => window.location.reload()} // Quick way to reset full state or we could pass a prop
              className="p-2 rounded-full hover-bg-white-5 transition-all border border-white-5"
              title="Ana Sayfaya Dön"
            >
              <Home size={20} className="text-text-secondary" />
            </button>
            <div>
              <h2 className="text-white text-lg font-bold">{title || 'Message Archive'}</h2>
              <p className="text-text-secondary text-xs">{messages.length} messages loaded</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input 
                type="text" 
                placeholder="Your email (for highlighting)" 
                className="input-field"
                style={{ height: '36px', padding: '0 12px 0 36px', fontSize: '12px', width: '200px' }}
                value={myEmail}
                onChange={(e) => setMyEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search messages or senders..." 
            className="input-field"
            style={{ paddingLeft: '48px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="messages-area custom-scrollbar">
        {Object.keys(groupedMessages).length > 0 ? (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="flex flex-col gap-4">
              <div className="flex items-center justify-center my-4">
                <div className="px-3 py-1 rounded-full border border-white-5 text-xs text-text-secondary flex items-center gap-2 bg-black-20">
                  <Calendar size={12} />
                  {date}
                </div>
              </div>
              {msgs.map(msg => (
                <ChatBubble 
                  key={msg.id} 
                  message={msg} 
                  isMe={myEmail ? msg.personEmail.toLowerCase() === myEmail.toLowerCase() : false} 
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary">
            <Search size={48} className="opacity-20" />
            <p>No messages found matching your criteria</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
