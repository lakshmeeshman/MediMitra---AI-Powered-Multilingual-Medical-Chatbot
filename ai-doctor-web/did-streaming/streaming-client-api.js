// streaming-client-api.js
'use strict';

class VideoAgent {
  constructor() {
    this.peerConnection = null;
    this.streamId = null;
    this.sessionId = null;
    this.statsIntervalId = null;
    this.API_CONFIG = null;
    this.DID_API_URL = 'https://api.d-id.com';
    this.lastBytesReceived = 0;
    this.videoIsPlaying = false;
    this.isConnected = false;
    this.currentAIMessage = '';

    this.idleVideo = document.getElementById('idle-video');
    this.talkVideo = document.getElementById('talk-video');

    this.init();
  }

  async init() {
    try {
      const response = await fetch('./api.json');
      this.API_CONFIG = await response.json();

      if (!this.API_CONFIG?.key) throw new Error('Missing D-ID API key in api.json');
      if (!this.API_CONFIG?.openai_key) throw new Error('Missing OpenAI API key in api.json');
      if (this.API_CONFIG.url) this.DID_API_URL = this.API_CONFIG.url;

      this.talkVideo.setAttribute('playsinline', '');
      this.setupEventListeners();

      console.log('Initialized successfully');
    } catch (error) {
      this.showError(`Initialization failed: ${error.message}`);
    }
  }

  setupEventListeners() {
    document.getElementById('connect-button').addEventListener('click', () => this.handleConnect());
    document.getElementById('destroy-button').addEventListener('click', () => this.handleDestroy());
    document.getElementById('send-button').addEventListener('click', () => this.handleTalk());
    document.getElementById('user-input-field').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleTalk();
    });
  }

  async handleConnect() {
    const connectButton = document.getElementById('connect-button');
    const sendButton = document.getElementById('send-button');
    const inputField = document.getElementById('user-input-field');
    
    connectButton.innerHTML = '<div class="loading-spinner"></div>';
    connectButton.disabled = true;

    try {
      if (this.peerConnection?.connectionState === 'connected') return;

      this.cleanup();

      const response = await this.createStream();
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('D-ID API Error:', errorText);
        throw new Error(`D-ID API Error: ${response.status} - ${errorText}`);
      }
      
      const { id, offer, ice_servers, session_id } = await response.json();
      this.streamId = id;
      this.sessionId = session_id;

      const answer = await this.createPeerConnection(offer, ice_servers);
      await this.sendSDPAnswer(answer);

      this.isConnected = true;
      this.updateConnectionStatus(true);
      this.updateUI(true);
      
      inputField.disabled = false;
      sendButton.disabled = false;
      inputField.focus();
      
      this.addMessage('ai', 'Connected! I\'m ready to chat with you. What would you like to know?');
    } catch (error) {
      this.showError(`Connection failed: ${error.message}`);
      this.updateConnectionStatus(false);
      this.cleanup();
    } finally {
      connectButton.innerHTML = '<i class="fas fa-play"></i> Connect';
      connectButton.disabled = false;
    }
  }

  async handleTalk() {
    try {
      const userMessage = document.getElementById('user-input-field').value.trim();
      if (!userMessage) return;

      // Add user message to chat
      this.addMessage('user', userMessage);
      
      // Show typing indicator
      this.showTypingIndicator();
      
      // Disable input while processing
      const inputField = document.getElementById('user-input-field');
      const sendButton = document.getElementById('send-button');
      inputField.disabled = true;
      sendButton.disabled = true;

      const { fetchOpenAIResponse } = await import('./openai.js');
      const rawAIResponse = await fetchOpenAIResponse(this.API_CONFIG.openai_key, userMessage);
      
      if (!rawAIResponse || rawAIResponse.trim() === '') {
        throw new Error('No response from AI service');
      }
      
      // Clean and format the AI response
      const aiResponse = this.cleanAIResponse(rawAIResponse);
      
      // Store the AI response for display
      this.currentAIMessage = aiResponse;

      const talkResponse = await fetch(`${this.DID_API_URL}/talks/streams/${this.streamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(this.API_CONFIG.key + ':')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          script: {
            type: 'text',
            input: aiResponse,
            provider: {
              type: 'microsoft',
              voice_id: this.API_CONFIG.voice_id
            }
          },
          config: { fluent: true, stitch: true },
          driver_url: 'bank://lively/',
          session_id: this.sessionId
        })
      });

      if (!talkResponse.ok) {
        const errorData = await talkResponse.json();
        if (errorData.kind === 'InsufficientCreditsError') {
          // Handle insufficient credits - show AI response without avatar video
          console.warn('D-ID credits insufficient, showing text response only');
          this.hideTypingIndicator();
          this.addMessage('ai', aiResponse);
          this.addMessage('system', 'Note: Avatar video is temporarily unavailable due to insufficient credits. AI responses are working normally.');
          this.updateAIStatus('ready');
          
          const inputField = document.getElementById('user-input-field');
          const sendButton = document.getElementById('send-button');
          inputField.value = '';
          inputField.disabled = false;
          sendButton.disabled = false;
          inputField.focus();
          return;
        }
        throw new Error(`D-ID API Error: ${talkResponse.status} - ${errorData.description || 'Unknown error'}`);
      }

      // Hide typing indicator and show AI message
      this.hideTypingIndicator();
      this.addMessage('ai', aiResponse);
      
      // Update AI status to speaking
      this.updateAIStatus('speaking');

      inputField.value = '';
      inputField.disabled = false;
      sendButton.disabled = false;
      inputField.focus();
    } catch (error) {
      console.error('Talk Error:', error);
      console.error('Error details:', error.message, error.stack);
      this.hideTypingIndicator();
      
      // Provide more specific error messages
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error.message.includes('No response from AI service')) {
        errorMessage = 'I had trouble processing your request. Please try rephrasing your question.';
      } else if (error.message.includes('D-ID API Error')) {
        errorMessage = 'There was an issue with the avatar service. Please try again in a moment.';
      } else if (error.message.includes('Failed to send to D-ID')) {
        errorMessage = 'Avatar service connection issue. Please try again.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      this.addMessage('ai', errorMessage);
      this.updateAIStatus('ready');
      
      const inputField = document.getElementById('user-input-field');
      const sendButton = document.getElementById('send-button');
      inputField.disabled = false;
      sendButton.disabled = false;
    }
  }

  async handleDestroy() {
    const connectButton = document.getElementById('connect-button');
    const sendButton = document.getElementById('send-button');
    const inputField = document.getElementById('user-input-field');

    try {
      if (this.streamId) {
        await this.deleteStream();
      }
    } catch (error) {
      console.error('Destroy error:', error);
    } finally {
      this.cleanup();
      this.updateUI(false);
      this.updateConnectionStatus(false);
      this.updateAIStatus('ready');
      
      inputField.disabled = true;
      sendButton.disabled = true;
      
      this.addMessage('ai', 'Disconnected. Click Connect to start a new conversation.');
    }
  }

  async createStream() {
    return fetch(`${this.DID_API_URL}/talks/streams`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(this.API_CONFIG.key + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_url: "https://raw.githubusercontent.com/jjmlovesgit/D-id_Streaming_Chatgpt/main/oracle_pic.jpg",
        stream_warmup: true,
        config: {
          video_quality: "hd"
        }
      }),
    });
  }
  
  async createPeerConnection(offer, iceServers) {
    const RTCPeerConnection = (
      window.RTCPeerConnection ||
      window.webkitRTCPeerConnection ||
      window.mozRTCPeerConnection
    ).bind(window);

    this.peerConnection = new RTCPeerConnection({ iceServers });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        fetch(`${this.DID_API_URL}/talks/streams/${this.streamId}/ice`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(this.API_CONFIG.key + ':')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            session_id: this.sessionId,
          }),
        }).catch(console.error);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.track.kind === 'video') {
        this.statsIntervalId = setInterval(async () => {
          const stats = await this.peerConnection.getStats(event.track);
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              const isPlaying = report.bytesReceived > this.lastBytesReceived;
              if (isPlaying !== this.videoIsPlaying) {
                this.videoIsPlaying = isPlaying;
                this.updateStatus('streaming', isPlaying ? 'streaming' : 'idle');

                if (isPlaying) {
                  this.idleVideo.style.display = 'none';
                  this.talkVideo.style.display = 'block';
                  this.talkVideo.srcObject = event.streams[0];
                  this.talkVideo.play().catch(console.error);
                  
                  // Update AI status to speaking when video starts
                  this.updateAIStatus('speaking');
                } else {
                  this.talkVideo.pause();
                  this.talkVideo.srcObject = null;
                  this.talkVideo.style.display = 'none';
                  this.idleVideo.style.display = 'block';
                  
                  // Update AI status to ready when video stops
                  this.updateAIStatus('ready');
                }
              }
              this.lastBytesReceived = report.bytesReceived;
            }
          });
        }, 500);
      }
    };

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }
  
  async sendSDPAnswer(answer) {
    return fetch(`${this.DID_API_URL}/talks/streams/${this.streamId}/sdp`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(this.API_CONFIG.key + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        answer: answer,
        session_id: this.sessionId
      })
    });
  }

  async deleteStream() {
    return fetch(`${this.DID_API_URL}/talks/streams/${this.streamId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(this.API_CONFIG.key + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: this.sessionId })
    });
  }
  
  cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.talkVideo.pause();
    this.talkVideo.srcObject = null;
    this.talkVideo.style.display = 'none';
    this.idleVideo.style.display = 'block';

    const video = document.getElementById('talk-video');
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }

    if (this.statsIntervalId) {
      clearInterval(this.statsIntervalId);
      this.statsIntervalId = null;
    }

    this.isConnected = false;
    this.videoIsPlaying = false;
  }
  
  updateUI(connected) {
    const connectButton = document.getElementById('connect-button');
    const destroyButton = document.getElementById('destroy-button');
  
    destroyButton.disabled = !connected;
  
    if (connected) {
      connectButton.innerHTML = '<i class="fas fa-check"></i> Connected';
      connectButton.classList.add('connected');
    } else {
      connectButton.innerHTML = '<i class="fas fa-play"></i> Connect';
      connectButton.classList.remove('connected');
    }
  }

  updateConnectionStatus(connected) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    if (connected) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Disconnected';
    }
  }

  updateAIStatus(status) {
    const statusDot = document.getElementById('ai-status-dot');
    const statusText = document.getElementById('ai-status-text');
    
    statusDot.className = 'ai-status-dot';
    if (status === 'speaking') {
      statusDot.classList.add('speaking');
      statusText.textContent = 'Speaking';
    } else {
      statusText.textContent = 'Ready';
    }
  }

  addMessage(sender, content) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = new Date().toLocaleTimeString();
    
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
      </div>
      <div class="message-content">
        ${content}
        <div class="message-time">${time}</div>
      </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  showTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.classList.add('show');
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.classList.remove('show');
  }

  updateStatus(type, state) {
    // This method is kept for compatibility but not actively used in the new UI
    console.log(`${type} status: ${state}`);
  }
  
  cleanAIResponse(text) {
    if (!text) return '';
    
    // Remove asterisks and other markdown formatting
    let cleaned = text
      .replace(/\*+/g, '') // Remove asterisks
      .replace(/_+/g, '') // Remove underscores
      .replace(/`+/g, '') // Remove backticks
      .replace(/#+/g, '') // Remove hash symbols
      .replace(/\[|\]/g, '') // Remove square brackets
      .replace(/\(|\)/g, '') // Remove parentheses (sometimes used for emphasis)
      .replace(/\{|\}/g, '') // Remove curly braces
      .replace(/<|>/g, '') // Remove angle brackets
      .replace(/\|/g, '') // Remove pipe characters
      .replace(/~+/g, '') // Remove tildes
      .replace(/=+/g, '') // Remove equals signs
      .replace(/-{2,}/g, '') // Remove multiple dashes
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // Remove common AI response prefixes
    cleaned = cleaned
      .replace(/^(I'm|I am|I'll|I will|I can|I could|I would|I should|I might|I may|I must|I have|I had|I will have|I would have|I should have|I could have|I might have|I may have|I must have|I have been|I had been|I will have been|I would have been|I should have been|I could have been|I might have been|I may have been|I must have been)\s+/i, '')
      .replace(/^(Sure|Of course|Absolutely|Certainly|Definitely|Yes|No|Well|Actually|Basically|Essentially|Fundamentally|Primarily|Mainly|Mostly|Generally|Usually|Typically|Normally|Commonly|Frequently|Often|Sometimes|Occasionally|Rarely|Seldom|Hardly|Barely|Scarcely|Almost|Nearly|Quite|Rather|Pretty|Fairly|Somewhat|Slightly|Somewhat|Rather|Quite|Very|Extremely|Incredibly|Amazingly|Surprisingly|Unexpectedly|Interestingly|Curiously|Strangely|Oddly|Weirdly|Bizarrely|Unusually|Uncommonly|Rarely|Seldom|Hardly|Barely|Scarcely|Almost|Nearly|Quite|Rather|Pretty|Fairly|Somewhat|Slightly|Somewhat|Rather|Quite|Very|Extremely|Incredibly|Amazingly|Surprisingly|Unexpectedly|Interestingly|Curiously|Strangely|Oddly|Weirdly|Bizarrely|Unusually|Uncommonly)\s+/i, '');
    
    // Remove common AI response suffixes
    cleaned = cleaned
      .replace(/\s+(I hope|I hope that|I hope this|I hope you|I hope I|I hope we|I hope they|I hope it|I hope she|I hope he|I hope them|I hope us|I hope me|I hope my|I hope our|I hope their|I hope its|I hope her|I hope his|I hope them|I hope us|I hope me|I hope my|I hope our|I hope their|I hope its|I hope her|I hope his)$/i, '')
      .replace(/\s+(Let me know|Let me know if|Let me know when|Let me know how|Let me know what|Let me know where|Let me know why|Let me know who|Let me know which|Let me know whether|Let me know if you|Let me know if I|Let me know if we|Let me know if they|Let me know if it|Let me know if she|Let me know if he|Let me know if them|Let me know if us|Let me know if me|Let me know if my|Let me know if our|Let me know if their|Let me know if its|Let me know if her|Let me know if his)$/i, '');
    
    // Clean up any remaining formatting issues
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/^[.,!?;:\s]+|[.,!?;:\s]+$/g, '') // Remove leading/trailing punctuation
      .replace(/\s+[.,!?;:]/g, match => match.trim()) // Clean up spacing before punctuation
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper spacing after sentences
      .replace(/\s+/g, ' ') // Final space cleanup
      .trim();
    
    // If the response is too short or empty, provide a fallback
    if (cleaned.length < 10) {
      cleaned = "I understand your question. Let me provide you with a helpful response.";
    }
    
    // Ensure the response starts with a capital letter and ends with proper punctuation
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      if (!/[.!?]$/.test(cleaned)) {
        cleaned += '.';
      }
    }
    
    return cleaned;
  }

  showError(message) {
    this.addMessage('ai', `Error: ${message}`);
    console.error(message);
  }
}

document.addEventListener('DOMContentLoaded', () => new VideoAgent());