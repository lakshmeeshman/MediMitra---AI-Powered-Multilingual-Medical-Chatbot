// pages/VoiceChat.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc, query, orderBy, where, getDocs, serverTimestamp } from "firebase/firestore";
import "../index.css";

function VoiceChat() {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speakQueue, setSpeakQueue] = useState([]);
  const [chunkDurations, setChunkDurations] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const chatRef = useRef();
  const synthRef = useRef(window.speechSynthesis);
  const [availableVoices, setAvailableVoices] = useState([]);
  const recognitionRef = useRef(null);
  const progressTimerRef = useRef(null);
  const [audioContextInitialized, setAudioContextInitialized] = useState(false);
  const navigate = useNavigate();

  // Initialize audio context on first user interaction
  const initializeAudioContext = () => {
    if (!audioContextInitialized) {
      console.log('🎵 Initializing audio context for first time');
      setAudioContextInitialized(true);
    }
  };

  // Translation dictionary for UI elements
  const translations = {
    en: {
      placeholder: "Or type your message here...",
      send: "Send",
      newChat: "New Chat",
      chatHistory: "Chat History",
      clearChat: "Clear Chat",
      logout: "Logout",
      loading: "AI Doctor is thinking...",
      error: "Error connecting to AI Doctor. Please try again.",
      welcomeTitle: "Hello! I'm your AI Doctor",
      welcomeSubtitle: "I'm here to help you with your health concerns. Click the microphone button and speak your symptoms or questions.",
      suggestion1: "I have a headache",
      suggestion2: "What are the symptoms of fever?",
      suggestion3: "How to treat a cold?",
      quickQuestion1: "⏰ Medication Duration",
      quickQuestion2: "🏥 When to See Doctor",
      quickQuestion3: "⚠️ Side Effects",
      quickQuestion4: "ℹ️ More Info",
      typingIndicator: "AI Doctor is processing...",
      switchToText: "💬 Switch to Text",
      pause: "Pause",
      resume: "Resume",
      mic: "🎤",
      listening: "Listening..."
    },
    hi: {
      placeholder: "या यहां अपना संदेश टाइप करें...",
      send: "भेजें",
      newChat: "नई चैट",
      chatHistory: "चैट इतिहास",
      clearChat: "चैट साफ़ करें",
      logout: "लॉगआउट",
      loading: "AI डॉक्टर सोच रहे हैं...",
      error: "AI डॉक्टर से कनेक्ट करने में त्रुटि। कृपया पुनः प्रयास करें।",
      welcomeTitle: "नमस्ते! मैं आपका AI डॉक्टर हूं",
      welcomeSubtitle: "मैं आपकी स्वास्थ्य संबंधी चिंताओं में मदद करने के लिए यहां हूं। माइक्रोफोन बटन पर क्लिक करें और अपने लक्षण या प्रश्न बोलें।",
      suggestion1: "मुझे सिरदर्द है",
      suggestion2: "बुखार के लक्षण क्या हैं?",
      suggestion3: "सर्दी का इलाज कैसे करें?",
      quickQuestion1: "⏰ दवा की अवधि",
      quickQuestion2: "🏥 डॉक्टर से कब मिलें",
      quickQuestion3: "⚠️ साइड इफेक्ट्स",
      quickQuestion4: "ℹ️ अधिक जानकारी",
      typingIndicator: "AI डॉक्टर प्रोसेस कर रहे हैं...",
      switchToText: "💬 टेक्स्ट पर स्विच करें",
      pause: "रोकें",
      resume: "जारी रखें",
      mic: "🎤",
      listening: "सुन रहे हैं..."
    },
    mr: {
      placeholder: "किंवा येथे तुमचा संदेश टाइप करा...",
      send: "पाठवा",
      newChat: "नवीन चॅट",
      chatHistory: "चॅट इतिहास",
      clearChat: "चॅट साफ करा",
      logout: "लॉगआउट",
      loading: "AI डॉक्टर विचार करत आहेत...",
      error: "AI डॉक्टरशी कनेक्ट करताना त्रुटी। कृपया पुन्हा प्रयत्न करा।",
      welcomeTitle: "नमस्कार! मी तुमचा AI डॉक्टर आहे",
      welcomeSubtitle: "मी तुमच्या आरोग्य संबंधी काळजीत मदत करण्यासाठी येथे आहे. मायक्रोफोन बटणावर क्लिक करा आणि तुमचे लक्षण किंवा प्रश्न बोला.",
      suggestion1: "मला डोकेदुखी आहे",
      suggestion2: "तापाचे लक्षण काय आहेत?",
      suggestion3: "सर्दीचा उपचार कसा करावा?",
      quickQuestion1: "⏰ औषधाचा कालावधी",
      quickQuestion2: "🏥 डॉक्टरांना कधी भेटावे",
      quickQuestion3: "⚠️ दुष्परिणाम",
      quickQuestion4: "ℹ️ अधिक माहिती",
      typingIndicator: "AI डॉक्टर प्रक्रिया करत आहेत...",
      switchToText: "💬 मजकूरावर स्विच करा",
      pause: "थांबवा",
      resume: "पुन्हा सुरू करा",
      mic: "🎤",
      listening: "ऐकत आहेत..."
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Ensure we start with current chat view
  useEffect(() => {
    setShowHistory(false);
    setCurrentSessionId(Date.now()); // Create a new session ID for current chat
  }, []);

  // Scroll chat into view
  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [chat]);

  // Load and cache voices (voices may arrive asynchronously)
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      if (voices && voices.length) setAvailableVoices(voices);
    };
    loadVoices();
    if (typeof window !== "undefined") {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const selectBestVoice = (targetLang, preferredGender) => {
    if (!availableVoices || availableVoices.length === 0) return null;

    const langMap = {
      en: ["en-IN", "en-US", "en-GB"],
      hi: ["hi-IN"],
      mr: ["mr-IN", "hi-IN"],
    };
    const preferredLangs = langMap[targetLang] || langMap.en;

  // Enhanced voice selection for Indian languages
  const scored = availableVoices.map(v => {
    const langScore = preferredLangs.findIndex(code => (v.lang || "").toLowerCase().startsWith(code.toLowerCase()));
    const genderHint = (v.name || "").toLowerCase();
    const genderScore = preferredGender === "female"
      ? (genderHint.includes("female") || genderHint.includes("woman") ? 0 : 1)
      : (genderHint.includes("male") || genderHint.includes("man") ? 0 : 1);
    
    // Enhanced quality scoring for Indian languages
    let qualityScore = 1;
    if (genderHint.includes("neural") || genderHint.includes("google") || genderHint.includes("natural")) {
      qualityScore = 0;
    } else if (genderHint.includes("india") || genderHint.includes("indian")) {
      qualityScore = 0.5; // Prefer Indian voices
    } else if (genderHint.includes("hindi") || genderHint.includes("marathi")) {
      qualityScore = 0.3; // Prefer language-specific voices
    }
    
    return { v, score: [langScore === -1 ? 99 : langScore, genderScore, qualityScore] };
  });

    scored.sort((a, b) => {
      for (let i = 0; i < a.score.length; i++) {
        if (a.score[i] !== b.score[i]) return a.score[i] - b.score[i];
      }
      return 0;
    });

    return (scored[0] && scored[0].score[0] !== 99) ? scored[0].v : availableVoices[0];
  };

  const speak = async (text, lang = language) => {
    // Initialize audio context on first interaction
    initializeAudioContext();
    
    // Stop mic while speaking to avoid feedback, ignore errors
    if (listening) {
      try { recognitionRef.current?.stop(); } catch (_) {}
      setListening(false);
    }

    stopSpeaking(); // clear previous speech

    // Normalize text: strip markdown and unsupported symbols
    const cleaned = (text || "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/[`_~]/g, "")
      .replace(/[^\p{L}\p{N}\s.,!?%:;()-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return;

    try {
      setSpeaking(true);
      setPaused(false);

      // Use server Google Cloud TTS for all languages
      console.log(`🎤 Using Server Google Cloud TTS for ${lang} - professional pronunciation`);
      
      try {
        const response = await fetch('http://localhost:5051/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: cleaned,
            language: lang,
            gender: 'male'
          })
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          console.log('🎵 Audio blob received, size:', audioBlob.size, 'bytes');
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log('🎵 Audio URL created:', audioUrl);
          const audio = new Audio(audioUrl);
          console.log('🎵 Audio object created');
          
          audio.onended = () => {
            console.log('✅ Audio playback completed');
            setSpeaking(false);
            setPaused(false);
            URL.revokeObjectURL(audioUrl);
          };
          
          audio.onerror = (error) => {
            console.error('❌ Audio playback error:', error);
            setSpeaking(false);
            setPaused(false);
            URL.revokeObjectURL(audioUrl);
            console.log('❌ Server TTS audio playback failed, but NOT falling back to browser TTS');
          };
          
          console.log('🎵 Starting audio playback...');
          
          // Simple, direct audio playback
          try {
            await audio.play();
            console.log('✅ Audio started playing successfully');
          } catch (playError) {
            console.error('❌ Audio play failed:', playError);
            setSpeaking(false);
            setPaused(false);
            URL.revokeObjectURL(audioUrl);
          }
        } else {
          console.log('❌ Server TTS failed, but NOT falling back to browser TTS');
          setSpeaking(false);
          setPaused(false);
        }
      } catch (error) {
        console.error('❌ TTS request failed:', error);
        console.log('❌ Server TTS request failed, but NOT falling back to browser TTS');
        setSpeaking(false);
        setPaused(false);
      }
      return;


    } catch (error) {
      console.error('TTS Error:', error);
      setSpeaking(false);
      setPaused(false);
      console.log('❌ TTS Error occurred, but NOT falling back to browser TTS');
    }
  };

  // Enhanced Browser TTS for regional languages with proper voice selection
  const fallbackSpeak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
    
    // Set language codes for better regional pronunciation
    if (language === "hi") {
      utterance.lang = "hi-IN"; // Hindi (India)
      // Try to find Hindi voice
      const hindiVoice = voices.find(v => 
        v.lang.startsWith('hi') || 
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('india')
      );
      if (hindiVoice) {
        utterance.voice = hindiVoice;
        console.log('Using Hindi voice:', hindiVoice.name);
      }
    } else if (language === "mr") {
      utterance.lang = "mr-IN"; // Marathi (India)
      // Try to find Marathi voice
      const marathiVoice = voices.find(v => 
        v.lang.startsWith('mr') || 
        v.name.toLowerCase().includes('marathi') ||
        v.name.toLowerCase().includes('india')
      );
      if (marathiVoice) {
        utterance.voice = marathiVoice;
        console.log('Using Marathi voice:', marathiVoice.name);
      }
    } else {
      utterance.lang = "en-IN"; // English (India)
    }
    
    // Optimized settings for regional languages
    utterance.pitch = language === "hi" || language === "mr" ? 0.9 : 1.0; // Slightly lower pitch
    utterance.rate = language === "hi" || language === "mr" ? 0.8 : 0.9; // Slower rate for better pronunciation
    utterance.volume = 1.0;

    // If no specific voice found, use the best available
    if (!utterance.voice) {
      const chosen = selectBestVoice(language, "male");
      if (chosen) utterance.voice = chosen;
    }

    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };

    synthRef.current.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  };

  const seekToMs = (targetMs) => {
    if (currentAudio && totalMs > 0) {
      const clamped = Math.max(0, Math.min(totalMs, targetMs));
      currentAudio.currentTime = clamped / 1000;
      setElapsedMs(clamped);
    } else if (!speakQueue.length || totalMs <= 0) return;
    else {
      // Fallback for browser TTS
      const clamped = Math.max(0, Math.min(totalMs, targetMs));
      let acc = 0;
      let targetIndex = 0;
      for (let i = 0; i < chunkDurations.length; i++) {
        if (acc + chunkDurations[i] >= clamped) { targetIndex = i; break; }
        acc += chunkDurations[i];
      }
      const remaining = speakQueue.slice(targetIndex).join(" ");
      stopSpeaking();
      setTimeout(() => speak(remaining), 50);
    }
  };

  const replay3s = () => seekToMs(elapsedMs - 3000);
  const skip5s = () => seekToMs(elapsedMs + 5000);

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    synthRef.current.cancel();
    setSpeaking(false);
    setPaused(false);
    setSpeakQueue([]);
    setChunkDurations([]);
    setCurrentChunkIndex(0);
    setElapsedMs(0);
    setTotalMs(0);
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const pauseSpeaking = () => {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      setPaused(true);
    } else if (speaking && !paused) {
      synthRef.current.pause();
      setPaused(true);
    }
  };

  const resumeSpeaking = () => {
    if (currentAudio && currentAudio.paused) {
      currentAudio.play();
      setPaused(false);
    } else if (speaking && paused) {
      synthRef.current.resume();
      setPaused(false);
    }
  };

  const handleLogout = async () => {
    stopSpeaking();
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleMicInput = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  };


  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Save user message immediately
      await saveMessageToFirebase("user", userMessage);
      
      // Get AI response with translation
      const res = await fetch(`http://localhost:5051/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, language }),
      });

      if (res.ok) {
        const data = await res.json();
        await saveMessageToFirebase("ai", data.reply);
        speak(data.reply, language); // Speak the AI response
      } else {
        const errorMsg = translations[language]?.error || translations.en.error;
        await saveMessageToFirebase("ai", errorMsg);
        speak(errorMsg, language);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg = translations[language]?.error || translations.en.error;
      await saveMessageToFirebase("ai", errorMsg);
      speak(errorMsg, language);
    } finally {
      setLoading(false);
    }
  };

  const saveMessageToFirebase = async (role, text) => {
    // Always render locally so the user sees both text and voice instantly
    const newMessage = {
      id: Date.now(),
      role,
      text,
      time: new Date().toLocaleTimeString()
    };
    setChat(prev => [...prev, newMessage]);

    if (!auth.currentUser) return; // Optional persistence only when logged in

    try {
      await addDoc(collection(db, "chatMessages"), {
        userId: auth.currentUser.uid,
        role,
        text,
        timestamp: serverTimestamp(),
        chatSession: currentSessionId,
        language
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatReply = (text) =>
    text
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");

  const clearChat = () => {
    stopSpeaking();
    setChat([]);
    setCurrentSessionId(Date.now());
  };

  const loadChatHistory = async () => {
    if (!auth.currentUser) return;
    
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, "chatMessages"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const sessions = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const sessionId = data.chatSession;
        
        if (!sessions[sessionId]) {
          sessions[sessionId] = {
            id: sessionId,
            messages: [],
            lastMessage: data.timestamp,
            createdAt: data.timestamp
          };
        }
        sessions[sessionId].messages.push({
          id: doc.id,
          role: data.role,
          text: data.text,
          time: data.timestamp?.toDate?.()?.toLocaleTimeString() || new Date().toLocaleTimeString(),
          timestamp: data.timestamp
        });
      });
      
      // Sort messages within each session by timestamp (oldest first)
      Object.values(sessions).forEach(session => {
        session.messages.sort((a, b) => {
          const timeA = a.timestamp?.toDate?.() || new Date(0);
          const timeB = b.timestamp?.toDate?.() || new Date(0);
          return timeA - timeB;
        });
      });
      
      // Sort sessions by most recent first
      const sortedSessions = Object.values(sessions).sort((a, b) => {
        const timeA = a.lastMessage?.toDate?.() || new Date(0);
        const timeB = b.lastMessage?.toDate?.() || new Date(0);
        return timeB - timeA;
      });
      
      setChatHistory(sortedSessions);
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };


  const t = translations[language] || translations.en;

  return (
    <div className="chat-container voice-chat" onClick={initializeAudioContext}>
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            ← Back to Dashboard
          </button>
          <h2>🎤 Voice Chat with AI Doctor</h2>
        </div>
        <div className="header-right">
          <div className="language-select">
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">🇺🇸 English</option>
              <option value="hi">🇮🇳 Hindi</option>
              <option value="mr">🇮🇳 Marathi</option>
            </select>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            🚪 {t.logout}
          </button>
        </div>
      </div>

      {/* Audio Test Button */}
      <div className="audio-test-controls">
        <button 
          onClick={() => speak("Hello, this is a test of the audio system", language)} 
          className="test-audio-btn"
          style={{margin: '10px', padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px'}}
        >
          🎵 Test Audio
        </button>
      </div>

      {/* Chat History Button */}
      <div className="chat-history-controls">
        <button 
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) {
              loadChatHistory();
            }
          }} 
          className="history-btn"
        >
          {showHistory ? "📝 Current Chat" : "📚 Chat History"}
        </button>
        {/* {!showHistory && ( // Removed
          <button onClick={startNewChat} className="new-chat-btn"> // Removed
            🆕 {t.newChat} // Removed
          </button> // Removed
        )} */}
      </div>

      {showHistory ? (
        /* Chat History View */
        <div className="chat-history-container">
          <div className="history-header">
            <h3>📚 Voice Chat History</h3>
            <p>Select a conversation to view or delete unwanted ones</p>
          </div>
          
          {historyLoading ? (
            <div className="loading-spinner"></div>
          ) : chatHistory.length > 0 ? (
            <div className="history-list">
              {chatHistory.map((session, index) => (
                <div key={session.id} className="history-item">
                  <div className="session-info">
                    <h4>Session {index + 1}</h4>
                    <p>{session.messages.length} messages</p>
                    <small>{session.lastMessage?.toDate?.()?.toLocaleString() || 'Unknown date'}</small>
                  </div>
                  <div className="session-actions">
                    <button 
                      onClick={() => {
                        setChat(session.messages);
                        setShowHistory(false);
                      }}
                      className="view-btn"
                    >
                      👁️ View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-history">
              <div className="no-history-icon">📚</div>
              <h3>No voice chat history yet</h3>
              <p>Start a voice conversation to see your history here</p>
            </div>
          )}
        </div>
      ) : (
        /* Current Chat View - Default */
        <>
          {/* Chat Window */}
          <div className="chat-window" ref={chatRef}>
            {chat.length === 0 && (
              <div className="welcome-message">
                <div className="ai-avatar">👨‍⚕️</div>
                <h3>{t.welcomeTitle}</h3>
                <p>{t.welcomeSubtitle}</p>
                <div className="suggestions">
                  <button onClick={() => setInput(t.suggestion1)}>{t.suggestion1}</button>
                  <button onClick={() => setInput(t.suggestion2)}>{t.suggestion2}</button>
                  <button onClick={() => setInput(t.suggestion3)}>{t.suggestion3}</button>
                </div>
              </div>
            )}
            
            {chat.map((msg, i) => (
              <div key={msg.id || i} className={`chat-bubble ${msg.role}`}>
                <div className="message-content">
                  <div className="message-avatar">
                    {msg.role === "user" ? "👤" : "👨‍⚕️"}
                  </div>
                  <div className="message-text">
                    <div dangerouslySetInnerHTML={{ __html: formatReply(msg.text) }}></div>
                    <span className="timestamp">{msg.time}</span>
                  </div>
                </div>
                {msg.role === "ai" && (
                  <div className="quick-questions">
                    <button onClick={() => setInput("How long should I take this medication?")} className="quick-btn">
                      {t.quickQuestion1}
                    </button>
                    <button onClick={() => setInput("When should I see a doctor?")} className="quick-btn">
                      {t.quickQuestion2}
                    </button>
                    <button onClick={() => setInput("Are there any side effects?")} className="quick-btn">
                      {t.quickQuestion3}
                    </button>
                    <button onClick={() => setInput("What else should I know?")} className="quick-btn">
                      {t.quickQuestion4}
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>{t.typingIndicator}</p>
              </div>
            )}
          </div>

          {/* Voice Controls */}
          <div className="voice-controls">
            <button 
              onClick={handleMicInput} 
              className={`mic-btn ${listening ? 'listening' : ''}`}
              disabled={speaking}
            >
              {listening ? t.listening : t.mic}
            </button>
            
            {speaking && (
              <button onClick={pauseSpeaking} className="pause-btn">
                {paused ? "▶️" : "⏸️"} {paused ? t.resume : t.pause}
              </button>
            )}
            {speaking && (
              <div className="tts-progress" style={{display:'flex',alignItems:'center',gap:'8px',width:'100%',maxWidth:'520px',marginTop:'8px'}}>
                <button onClick={replay3s} className="small-btn">⏪ 3s</button>
                <div 
                  className="progress-bar" 
                  onClick={(e)=>{
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    seekToMs(ratio * (totalMs || 0));
                  }}
                  style={{flex:1,height:'8px',background:'#e5e7eb',borderRadius:'999px',cursor:'pointer',position:'relative'}}
                >
                  <div 
                    style={{position:'absolute',left:0,top:0,bottom:0,width: totalMs? `${Math.min(100, (elapsedMs/totalMs)*100)}%`:'0%',background:'#4A90E2',borderRadius:'999px'}}
                  />
                </div>
                <button onClick={skip5s} className="small-btn">5s ⏩</button>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="input-container">
              <textarea
                rows="2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                className="chat-input"
              />
              <button 
                onClick={sendMessage} 
                disabled={loading || !input.trim()}
                className="send-btn"
              >
                {loading ? "⏳" : "📤"}
              </button>
            </div>
            
            <div className="chat-controls">
              <button onClick={clearChat} className="clear-btn">
                🗑️ {t.clearChat}
              </button>
              <button onClick={() => navigate("/text-chat")} className="text-btn">
                {t.switchToText}
              </button>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

export default VoiceChat;
