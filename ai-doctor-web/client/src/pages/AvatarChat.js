import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "./AvatarChat.css";

function AvatarChat() {
  const [language, setLanguage] = useState("en");
  const [isConnected, setIsConnected] = useState(false);

  // Translation dictionary for avatar chat content
  const translations = {
    en: {
      title: "AI Avatar Consultation",
      subtitle: "Experience interactive consultation with our AI doctor avatar",
      backToDashboard: "Back to Dashboard",
      connectButton: "Connect to Avatar",
      disconnectButton: "Disconnect",
      statusConnected: "Connected",
      statusDisconnected: "Disconnected",
      aiStatusReady: "Ready",
      aiStatusSpeaking: "Speaking",
      placeholder: "Type your message here...",
      welcomeMessage: "Hello! I'm your AI doctor avatar. Connect to start our conversation!",
      connectedMessage: "Connected! I'm ready to chat with you. What would you like to know?",
      disconnectedMessage: "Disconnected. Click Connect to start a new conversation.",
      errorMessage: "Sorry, I encountered an error. Please try again."
    },
    hi: {
      title: "AI अवतार परामर्श",
      subtitle: "हमारे AI डॉक्टर अवतार के साथ इंटरैक्टिव परामर्श का अनुभव करें",
      backToDashboard: "डैशबोर्ड पर वापस जाएं",
      connectButton: "अवतार से कनेक्ट करें",
      disconnectButton: "डिस्कनेक्ट करें",
      statusConnected: "कनेक्टेड",
      statusDisconnected: "डिस्कनेक्टेड",
      aiStatusReady: "तैयार",
      aiStatusSpeaking: "बोल रहे हैं",
      placeholder: "यहां अपना संदेश टाइप करें...",
      welcomeMessage: "नमस्ते! मैं आपका AI डॉक्टर अवतार हूं। बातचीत शुरू करने के लिए कनेक्ट करें!",
      connectedMessage: "कनेक्टेड! मैं आपसे बात करने के लिए तैयार हूं। आप क्या जानना चाहते हैं?",
      disconnectedMessage: "डिस्कनेक्टेड। नई बातचीत शुरू करने के लिए कनेक्ट पर क्लिक करें।",
      errorMessage: "क्षमा करें, मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुनः प्रयास करें।"
    },
    mr: {
      title: "AI अवतार सल्लागार",
      subtitle: "आमच्या AI डॉक्टर अवतार सोबत इंटरॅक्टिव सल्लागाराचा अनुभव घ्या",
      backToDashboard: "डॅशबोर्डवर परत जा",
      connectButton: "अवताराशी कनेक्ट करा",
      disconnectButton: "डिस्कनेक्ट करा",
      statusConnected: "कनेक्टेड",
      statusDisconnected: "डिस्कनेक्टेड",
      aiStatusReady: "तयार",
      aiStatusSpeaking: "बोलत आहे",
      placeholder: "येथे तुमचा संदेश टाइप करा...",
      welcomeMessage: "नमस्कार! मी तुमचा AI डॉक्टर अवतार आहे। संभाषण सुरू करण्यासाठी कनेक्ट करा!",
      connectedMessage: "कनेक्टेड! मी तुमच्याशी बोलण्यासाठी तयार आहे। तुम्ही काय जाणून घ्यायचे आहे?",
      disconnectedMessage: "डिस्कनेक्टेड। नवीन संभाषण सुरू करण्यासाठी कनेक्ट वर क्लिक करा।",
      errorMessage: "माफ करा, मला एक त्रुटी आली। कृपया पुन्हा प्रयत्न करा।"
    }
  };

  const t = translations[language] || translations.en;

  useEffect(() => {
    // Load D-ID scripts with proper error handling
    const loadDIDScripts = () => {
      try {
        // Load the main index script as a module (this will handle the imports)
        const mainScript = document.createElement('script');
        mainScript.type = 'module';
        mainScript.src = 'http://localhost:8081/index.js';
        mainScript.crossOrigin = 'anonymous';
        mainScript.onerror = (error) => {
          console.warn('D-ID main script failed to load:', error);
        };
        document.head.appendChild(mainScript);

        return () => {
          if (document.head.contains(mainScript)) {
            document.head.removeChild(mainScript);
          }
        };
      } catch (error) {
        console.warn('Error loading D-ID scripts:', error);
      }
    };

    loadDIDScripts();
  }, []);

  return (
    <div className="avatar-chat-container">
      {/* Header */}
      <div className="avatar-chat-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-button">
            ← {t.backToDashboard}
          </Link>
          <h1>🩺 {t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="header-right">
          <div className="language-selector">
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>
        </div>
      </div>

      {/* D-ID Streaming Interface */}
      <div className="did-interface-wrapper">
        <iframe
          src="http://localhost:8081/index.html"
          title="D-ID Avatar Chat"
          className="did-iframe"
          allow="camera; microphone; autoplay"
          onError={(e) => {
            console.warn('D-ID iframe failed to load:', e);
            // Show fallback message
            const wrapper = document.querySelector('.did-interface-wrapper');
            if (wrapper) {
              wrapper.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center; background: #f8f9fa;">
                  <h3 style="color: #6c757d; margin-bottom: 20px;">🎭 D-ID Avatar Service</h3>
                  <p style="color: #6c757d; margin-bottom: 20px;">The avatar service is currently unavailable.</p>
                  <p style="color: #6c757d; font-size: 14px;">Please ensure the D-ID streaming service is running on port 8081.</p>
                </div>
              `;
            }
          }}
        />
      </div>
    </div>
  );
}

export default AvatarChat;
