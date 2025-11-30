import { useState, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Chatbot({ selectedLayer, selectedDate, layerConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm LankaSat AI - I can analyze the satellite imagery you're seeing!\n\n🔍 Try asking me:\n• \"What do the brown areas mean?\"\n• \"Is this flooding?\"\n• \"Which areas look affected?\"\n\nOr tap '📊 Live Analysis' for real-time flood assessment!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            layer: selectedLayer,
            layerDescription: layerConfig?.description || '',
            date: selectedDate instanceof Date 
              ? selectedDate.toISOString().split('T')[0] 
              : selectedDate,
            center: 'Sri Lanka',
            zoom: 7
          },
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I'm having trouble connecting right now. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Fetch live satellite stats
  const fetchLiveAnalysis = async () => {
    setIsLoading(true);
    try {
      const dateStr = selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0] 
        : selectedDate;
      
      const response = await fetch(`${API_BASE_URL}/satellite/stats?date=${dateStr}`);
      const data = await response.json();
      
      if (data.statistics?.status === 'success') {
        const stats = data.statistics;
        const analysisMessage = `📊 **LIVE SATELLITE ANALYSIS** (${stats.date})

🌊 **Flood Status:** ${stats.flood_severity?.toUpperCase() || 'Unknown'}
💧 **Water Index:** ${stats.water_index_mean} ${stats.water_index_mean > 0 ? '(water detected)' : '(normal)'}
🟤 **Turbidity:** ${stats.turbidity_mean} ${stats.turbidity_mean > 1.2 ? '(MUDDY - active flooding!)' : '(clear)'}
🌿 **Vegetation:** ${stats.vegetation_mean > 0.3 ? 'Healthy' : 'Stressed/Flooded'}

${stats.interpretation}

What would you like to know more about?`;
        
        setMessages(prev => [...prev, { role: 'assistant', content: analysisMessage }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Could not fetch live data: ${data.statistics?.message || 'No recent imagery available'}. Try asking me about flood conditions instead!` 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Couldn't fetch live satellite data. Ask me anything about the imagery you're seeing!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: '📊 Live Analysis', action: fetchLiveAnalysis },
    { label: '🌊 Flood Status', message: 'Analyze the current flooding situation based on what you can see in the satellite data' },
    { label: '🟤 Muddy Water?', message: 'I see brown/muddy areas - is this flooding? What does it mean?' },
    { label: '📡 This Layer', message: `What am I looking at in the ${layerConfig?.name || 'current'} layer? How do I read it?` },
  ];

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-[1001] 
          flex items-center justify-center transition-all duration-300 
          ${isOpen 
            ? 'bg-red-500 hover:bg-red-600 rotate-0' 
            : 'bg-gradient-to-br from-primary to-secondary hover:shadow-xl hover:scale-105'
          }`}
        title={isOpen ? 'Close chat' : 'Open AI Assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">🤖</span>
        )}
      </button>

      {/* Chat window */}
      <div
        className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-dark border border-gray-700 
          rounded-2xl shadow-2xl z-[1001] flex flex-col overflow-hidden transition-all duration-300
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        style={{ height: '500px', maxHeight: 'calc(100vh - 150px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-xl">🛰️</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">LankaSat AI</h3>
            <p className="text-xs text-white/70">Satellite Data Assistant</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs text-white/70">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs text-gray-400">Analyzing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions */}
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  if (action.action) {
                    action.action();
                  } else {
                    setInputValue(action.message);
                    inputRef.current?.focus();
                  }
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap
                  ${action.action 
                    ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about floods, layers, or imagery..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2.5 
                text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary
                transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="w-10 h-10 bg-primary hover:bg-primary/80 disabled:bg-gray-700 
                disabled:cursor-not-allowed rounded-full flex items-center justify-center 
                transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Chatbot;
