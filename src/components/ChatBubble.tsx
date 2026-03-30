import React from 'react';
import { FileIcon, User } from 'lucide-react';
import type { WebexMessage } from '../services/webex';

interface ChatBubbleProps {
  message: WebexMessage;
  isMe: boolean;
  searchTerm: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isMe, searchTerm }) => {
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <span key={i} className="search-highlight">{part}</span> 
            : part
        )}
      </>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message-bubble ${isMe ? 'me' : ''} fade-in`}>
      <div className="message-header">
        {!isMe && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-glow flex items-center justify-center">
              <User size={12} className="text-primary-color" />
            </div>
            <span className="message-sender">{message.personEmail.split('@')[0]}</span>
          </div>
        )}
        <span className="message-time">{formatDate(message.created)}</span>
      </div>
      
      <div className="message-text">
        {message.text ? highlightText(message.text, searchTerm) : <span className="italic opacity-50">No text content</span>}
      </div>

      {message.files && message.files.length > 0 && (
        <div className="message-files">
          {message.files.map((file, idx) => {
            const fileName = file.split('/').pop() || `Attachment ${idx + 1}`;
            return (
              <div key={idx} className="file-link">
                <FileIcon size={14} />
                <span>{fileName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
