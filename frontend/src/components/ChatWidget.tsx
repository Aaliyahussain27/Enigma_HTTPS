import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface ChatWidgetProps {
  estateId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ estateId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "What documents do I still need?",
    "What should I do first?",
    "How does the AssetMap work?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);
    
    // We will build the assistant message progressively
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`http://localhost:8000/estates/${estateId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_id: convId })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("You've asked a lot of questions — try again in a bit");
        }
        throw new Error("Sorry, I couldn't answer that right now, please try again.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') {
              setLoading(false);
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.conversation_id && !convId) {
                setConvId(data.conversation_id);
              }
              if (data.token) {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMsgId ? { ...msg, content: msg.content + data.token } : msg
                ));
              }
              if (data.error) {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMsgId ? { ...msg, content: msg.content + "\n[Error: " + data.error + "]" } : msg
                ));
              }
            } catch (e) {
              // Ignore parse errors from partial chunks
            }
          }
        }
      }
    } catch (error: any) {
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMsgId ? { ...msg, content: error.message } : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-teal-700 text-white rounded-full shadow-lg hover:bg-teal-800 transition-colors z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] flex flex-col shadow-2xl z-50 overflow-hidden bg-white">
          <div className="bg-teal-700 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">EstateClear Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-teal-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-sm text-slate-500 mb-2">Suggested questions:</p>
                {suggestedQuestions.map((q, idx) => (
                  <button 
                    key={idx}
                    onClick={() => sendMessage(q)}
                    className="block w-full text-left p-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-teal-50 hover:border-teal-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-teal-700 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-500 rounded-xl rounded-bl-none p-3">
                  <p className="text-sm animate-pulse">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="Ask about your estate..."
                className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
              />
              <Button onClick={() => sendMessage(input)} className="p-2" disabled={loading || !input.trim()}>
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
