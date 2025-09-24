// pages/LoginPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import "../index.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const navigate = useNavigate();

  // Translation dictionary for login page
  const translations = {
    en: {
      title: "Welcome to MediMitra",
      subtitle: "Your AI Health Assistant",
      email: "Email Address",
      password: "Password",
      login: "Sign In",
      signup: "Sign Up",
      switchToSignup: "Don't have an account? Sign Up",
      switchToLogin: "Already have an account? Sign In",
      error: "An error occurred. Please try again.",
      loading: "Signing In...",
      emailPlaceholder: "Enter your email",
      passwordPlaceholder: "Enter your password",
      brandTitle: "🩺 MediMitra",
      brandSubtitle: "Your AI Health Companion",
      connectTitle: "Connect with AI Doctor",
      connectSubtitle: "Your Personal Health Assistant",
      feature1: "✅ 24/7 AI Consultation",
      feature2: "✅ Voice & Text Support",
      feature3: "✅ Multi-language Support"
    },
    hi: {
      title: "MediMitra में आपका स्वागत है",
      subtitle: "आपका AI स्वास्थ्य सहायक",
      email: "ईमेल पता",
      password: "पासवर्ड",
      login: "साइन इन करें",
      signup: "साइन अप करें",
      switchToSignup: "खाता नहीं है? साइन अप करें",
      switchToLogin: "पहले से खाता है? साइन इन करें",
      error: "एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
      loading: "साइन इन हो रहा है...",
      emailPlaceholder: "अपना ईमेल दर्ज करें",
      passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
      brandTitle: "🩺 MediMitra",
      brandSubtitle: "आपका AI स्वास्थ्य साथी",
      connectTitle: "AI डॉक्टर से जुड़ें",
      connectSubtitle: "आपका व्यक्तिगत स्वास्थ्य सहायक",
      feature1: "✅ 24/7 AI परामर्श",
      feature2: "✅ आवाज और टेक्स्ट सहायता",
      feature3: "✅ बहुभाषी सहायता"
    },
    mr: {
      title: "MediMitra मध्ये आपले स्वागत आहे",
      subtitle: "तुमचा AI आरोग्य सहाय्यक",
      email: "ईमेल पत्ता",
      password: "पासवर्ड",
      login: "साइन इन करा",
      signup: "साइन अप करा",
      switchToSignup: "खाते नाही? साइन अप करा",
      switchToLogin: "आधीपासून खाते आहे? साइन इन करा",
      error: "एक त्रुटी आली। कृपया पुन्हा प्रयत्न करा।",
      loading: "साइन इन होत आहे...",
      emailPlaceholder: "तुमचा ईमेल टाका",
      passwordPlaceholder: "तुमचा पासवर्ड टाका",
      brandTitle: "🩺 MediMitra",
      brandSubtitle: "तुमचा AI आरोग्य साथी",
      connectTitle: "AI डॉक्टराशी जोडा",
      connectSubtitle: "तुमचा वैयक्तिक आरोग्य सहाय्यक",
      feature1: "✅ 24/7 AI सल्लागार",
      feature2: "✅ आवाज आणि मजकूर सहायता",
      feature3: "✅ बहुभाषी सहायता"
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/dashboard");
    } catch (error) {
      console.error("Auth error:", error);
      setError(translations[language]?.error || translations.en.error);
    } finally {
      setLoading(false);
    }
  };

  const t = translations[language] || translations.en;

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="brand-section">
          <h1 className="brand-title">{t.brandTitle}</h1>
          <p className="brand-subtitle">{t.brandSubtitle}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>{t.email}</label>
            <input
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label>{t.password}</label>
            <input
              type="password"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? t.loading : (isSignUp ? t.signup : t.login)}
          </button>
          
          <p className="switch-auth">
            {isSignUp ? t.switchToLogin : t.switchToSignup}{" "}
            <span onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? t.login : t.signup}
            </span>
          </p>
        </form>
      </div>

      <div className="login-right">
        <div className="language-dropdown">
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">🇺🇸 English</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="mr">🇮🇳 Marathi</option>
          </select>
        </div>
        
        <div className="avatar-container">
          <div className="d-id-avatar">
            <div className="avatar-placeholder">
              <div className="avatar-icon">👨‍⚕️</div>
              <div className="avatar-pulse"></div>
              <div className="avatar-status">Online</div>
              <div className="avatar-waves">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
            <p className="avatar-text">AI Doctor Ready</p>
            <p className="avatar-subtitle">Click to interact</p>
          </div>
        </div>
        
        <div className="login-tagline">
          <h3>{t.connectTitle}</h3>
          <p>{t.connectSubtitle}</p>
          <div className="features-list">
            <div className="feature-item">{t.feature1}</div>
            <div className="feature-item">{t.feature2}</div>
            <div className="feature-item">{t.feature3}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
