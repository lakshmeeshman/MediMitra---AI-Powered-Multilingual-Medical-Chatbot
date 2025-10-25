import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './AvatarChat.css';

const VoiceChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // EXACT TTS functionality from medical-voice-assistant
  const TTSPlayer = ({ text, lang = "en" }) => {
    const [ttsLoading, setTtsLoading] = useState(false);

    async function handleSpeak() {
      if (!text) return;
      
      setTtsLoading(true);
      try {
        const res = await fetch('http://localhost:5051/tts', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: lang })
        });
        const data = await res.json();
        if (data.audioContent) {
          const audio = new Audio("data:audio/mp3;base64," + data.audioContent);
          audio.play();
        } else {
          console.error("TTS Error:", data.error || "No audio returned");
        }
      } catch (err) {
        console.error("TTS Request failed:", err.message);
      } finally {
        setTtsLoading(false);
      }
    }

    return (
      <div style={{ marginTop: "8px" }}>
        <button 
          onClick={handleSpeak} 
          disabled={ttsLoading || !text}
          className="tts-button"
        >
          {ttsLoading ? "🔊 Speaking..." : "🔊 Listen"}
        </button>
      </div>
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { text: inputMessage, isBot: false, lang: language };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5051/chat', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputMessage, lang: language })
      });

      const data = await response.json();
      if (data.reply || data.response) {
        setMessages(prev => [...prev, { text: data.reply || data.response, isBot: true, lang: language }]);
      } else {
        setMessages(prev => [...prev, { text: "Sorry, I couldn't process your request.", isBot: true, lang: language }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: "Error: Could not connect to the assistant.", isBot: true, lang: language }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Set language based on selection
    const langMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN'
    };
    
    recognition.lang = langMap[language] || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      alert('Speech recognition error: ' + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const translations = {
    en: {
      title: "🩺 Medimitra AI Medical Assistant",
      subtitle: "Advanced AI-powered medical consultation with voice interaction",
      languageSelect: "Select Language:",
      inputPlaceholder: "Describe your symptoms or ask a medical question...",
      tip: "💡 Tip: You can speak in any language and the AI will understand!",
      speak: "🎤 Speak",
      stop: "🛑 Stop",
      send: "Send",
      sending: "Sending...",
      thinking: "🤖 AI is analyzing your symptoms...",
      disclaimer: "⚠️ This AI provides general medical information only. Always consult a qualified doctor for medical advice.",
      logout: "Logout"
    },
    hi: {
      title: "🩺 मेडिमित्रा AI चिकित्सा सहायक",
      subtitle: "आवाज संवाद के साथ उन्नत AI-संचालित चिकित्सा परामर्श",
      languageSelect: "भाषा चुनें:",
      inputPlaceholder: "अपने लक्षणों का वर्णन करें या चिकित्सा प्रश्न पूछें...",
      tip: "💡 सुझाव: आप किसी भी भाषा में बोल सकते हैं और AI समझ जाएगा!",
      speak: "🎤 बोलें",
      stop: "🛑 रोकें",
      send: "भेजें",
      sending: "भेज रहे हैं...",
      thinking: "🤖 AI आपके लक्षणों का विश्लेषण कर रहा है...",
      disclaimer: "⚠️ यह AI केवल सामान्य चिकित्सा जानकारी प्रदान करता है। चिकित्सा सलाह के लिए हमेशा योग्य डॉक्टर से परामर्श लें।",
      logout: "लॉगआउट"
    },
    mr: {
      title: "🩺 मेडिमित्रा AI वैद्यकीय सहायक",
      subtitle: "आवाज संवादासह उन्नत AI-चालित वैद्यकीय सल्लामसलत",
      languageSelect: "भाषा निवडा:",
      inputPlaceholder: "आपल्या लक्षणांचे वर्णन करा किंवा वैद्यकीय प्रश्न विचारा...",
      tip: "💡 टिप: तुम्ही कोणत्याही भाषेत बोलू शकता आणि AI समजेल!",
      speak: "🎤 बोला",
      stop: "🛑 थांबवा",
      send: "पाठवा",
      sending: "पाठवत आहे...",
      thinking: "🤖 AI तुमच्या लक्षणांचे विश्लेषण करत आहे...",
      disclaimer: "⚠️ हा AI फक्त सामान्य वैद्यकीय माहिती देतो. वैद्यकीय सल्ल्यासाठी नेहमी पात्र डॉक्टरांशी सल्लामसलत करा.",
      logout: "लॉगआउट"
    }
  };

  const t = translations[language] || translations.en;

  return (
    <div className="futuristic-voice-chat">
      {/* Futuristic Header */}
      <div className="futuristic-header">
        <div className="header-content">
          <h1 className="futuristic-title">{t.title}</h1>
          <p className="futuristic-subtitle">{t.subtitle}</p>
          
          {/* Language Selection */}
          <div className="language-selector">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="futuristic-select"
            >
              <option value="en">🌐 English</option>
              <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
              <option value="mr">🇮🇳 मराठी (Marathi)</option>
            </select>
        </div>
      </div>

        <button onClick={handleLogout} className="logout-btn-futuristic">
          {t.logout}
        </button>
      </div>

      {/* Futuristic Chat Container */}
      <div className="futuristic-chat-container">
        <div className="messages-container-futuristic">
          {messages.map((message, index) => (
            <div key={index} className={`futuristic-message ${message.isBot ? 'bot-message' : 'user-message'}`}>
              <div className="message-content-futuristic">
                {message.text}
                {message.isBot && (
                  <TTSPlayer text={message.text} lang={message.lang} />
                )}
                  </div>
                </div>
              ))}
          {loading && (
            <div className="loading-message-futuristic">
              <div className="loading-animation">
                <div className="pulse-dot"></div>
                <div className="pulse-dot"></div>
                <div className="pulse-dot"></div>
            </div>
              <span>{t.thinking}</span>
            </div>
          )}
        </div>

        {/* Futuristic Input Area */}
        <div className="futuristic-input-container">
          <div className="input-wrapper-futuristic">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t.inputPlaceholder}
              className="futuristic-textarea"
            />
            <div className="input-tip-futuristic">
              {t.tip}
              </div>
          </div>

          <div className="futuristic-controls">
            {/* Interactive Mic Button */}
            <button 
              onClick={isListening ? stopListening : startListening}
              disabled={loading}
              className={`mic-button-futuristic ${isListening ? 'listening' : ''}`}
            >
              <div className="mic-icon">
                {isListening ? '🛑' : '🎤'}
              </div>
              <div className="mic-ripple"></div>
            </button>
            
              <button 
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
              className="send-button-futuristic"
            >
              <span className="send-text">{loading ? t.sending : t.send}</span>
              <div className="send-arrow">→</div>
              </button>
            </div>
          </div>
              </div>

      <div className="disclaimer-futuristic">
        {t.disclaimer}
              </div>

      <style jsx>{`
        .futuristic-voice-chat {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .futuristic-voice-chat::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
          pointer-events: none;
        }

        .futuristic-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-content {
          flex: 1;
        }

        .futuristic-title {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
        }

        .futuristic-subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 1rem 0;
        }

        .language-selector {
          display: inline-block;
        }

        .futuristic-select {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 1rem;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .futuristic-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }

        .logout-btn-futuristic {
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          border: none;
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }

        .logout-btn-futuristic:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        }

        .futuristic-chat-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          height: calc(100vh - 200px);
          display: flex;
          flex-direction: column;
        }

        .messages-container-futuristic {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          margin-bottom: 2rem;
        }

        .futuristic-message {
          margin-bottom: 1.5rem;
          animation: slideIn 0.3s ease;
        }

        .user-message {
          text-align: right;
        }

        .bot-message {
          text-align: left;
        }

        .message-content-futuristic {
          display: inline-block;
          max-width: 70%;
          padding: 1rem 1.5rem;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border: 1px solid rgba(102, 126, 234, 0.2);
          backdrop-filter: blur(10px);
          word-wrap: break-word;
          position: relative;
        }

        .user-message .message-content-futuristic {
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(238, 90, 36, 0.1));
          border-color: rgba(255, 107, 107, 0.2);
        }

        .loading-message-futuristic {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: rgba(255, 255, 255, 0.8);
          font-style: italic;
        }

        .loading-animation {
          display: flex;
          gap: 0.5rem;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        .pulse-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .pulse-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        .futuristic-input-container {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .input-wrapper-futuristic {
          margin-bottom: 1rem;
        }

        .futuristic-textarea {
          width: 100%;
          min-height: 80px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          padding: 1rem;
          color: white;
          font-size: 1rem;
          resize: vertical;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .futuristic-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }

        .futuristic-textarea::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .input-tip-futuristic {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .futuristic-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .mic-button-futuristic {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .mic-button-futuristic:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .mic-button-futuristic.listening {
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          animation: pulse 1s infinite;
        }

        .mic-ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%) scale(0);
          animation: ripple 2s infinite;
        }

        .send-button-futuristic {
          flex: 1;
          height: 60px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 15px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .send-button-futuristic:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .send-button-futuristic:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .send-arrow {
          font-size: 1.2rem;
          transition: transform 0.3s ease;
        }

        .send-button-futuristic:hover .send-arrow {
          transform: translateX(3px);
        }

        .tts-button {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          color: white;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 0.5rem;
        }

        .tts-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
        }

        .disclaimer-futuristic {
          text-align: center;
          padding: 1rem 2rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          margin: 1rem 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        /* Scrollbar Styling */
        .messages-container-futuristic::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container-futuristic::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .messages-container-futuristic::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
        }

        .messages-container-futuristic::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #5a6fd8, #6a4190);
        }
      `}</style>
    </div>
  );
};

export default VoiceChat;