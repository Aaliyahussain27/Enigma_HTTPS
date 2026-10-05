import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  localStorage.setItem('jwt', data.jwt);
  return data.jwt;
};

const authorizedChatFetch = async (url: string, init: RequestInit = {}) => {
  const request = (accessToken: string | null) => fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${accessToken || localStorage.getItem('jwt') || ''}`,
    },
  });

  let response = await request(localStorage.getItem('jwt'));
  if (response.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) response = await request(refreshedToken);
  }
  return response;
};

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={index} style={{ background: '#e2e8f0', borderRadius: 4, padding: '1px 4px' }}>
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
};

const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} style={{ margin: '6px 0', paddingLeft: 20 }}>
        {listItems.map((item, index) => <li key={index}>{renderInlineMarkdown(item)}</li>)}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const listMatch = trimmed.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList();
    if (!trimmed) return;

    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push(
        <strong key={`heading-${index}`} style={{ display: 'block', marginTop: index ? 10 : 0, marginBottom: 4 }}>
          {renderInlineMarkdown(heading[1])}
        </strong>
      );
      return;
    }

    blocks.push(
      <p key={`paragraph-${index}`} style={{ margin: '5px 0' }}>
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList();
  return <div>{blocks}</div>;
};

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const estateId = localStorage.getItem('current_estate_id');
  const token = localStorage.getItem('jwt');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && estateId && messages.length === 0) {
      authorizedChatFetch(`${API_BASE_URL}/estates/${estateId}/chat`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error(err));
    }
  }, [isOpen, estateId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !estateId) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await authorizedChatFetch(`${API_BASE_URL}/estates/${estateId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let assistantMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') break;
              try {
                const data = JSON.parse(dataStr);
                if (data.chunk) {
                  assistantMessage.content += data.chunk;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...assistantMessage };
                    return newMsgs;
                  });
                }
              } catch (e) {
                console.error('Error parsing SSE data', e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!estateId) return null;

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
          {isOpen ? 'close' : 'chat'}
        </span>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 96,
          right: 24,
          width: 360,
          height: 500,
          background: 'var(--color-surface-lowest)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9998,
          overflow: 'hidden',
          border: '1px solid #dde3ea'
        }}>
          {/* Header */}
          <div style={{
            padding: 16,
            background: 'var(--color-primary)',
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600
          }}>
            EstateClear Assistant
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6e7977', marginTop: 20 }}>
                Hi! Ask me anything about this estate.
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--color-primary)' : '#f1f3f4',
                color: msg.role === 'user' ? '#fff' : '#1f2023',
                padding: '8px 12px',
                borderRadius: 16,
                maxWidth: '85%',
                lineHeight: 1.4,
                fontFamily: 'var(--font-body)',
                fontSize: 14
              }}>
                {msg.role === 'assistant' ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#6e7977', fontSize: 12 }}>
                Assistant is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: 12,
            borderTop: '1px solid #dde3ea',
            display: 'flex',
            gap: 8,
            background: 'var(--color-surface-low)'
          }}>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 20,
                border: '1px solid #dde3ea',
                outline: 'none',
                fontFamily: 'var(--font-body)'
              }}
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                padding: '0 16px',
                cursor: 'pointer',
                opacity: (isLoading || !input.trim()) ? 0.6 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};
