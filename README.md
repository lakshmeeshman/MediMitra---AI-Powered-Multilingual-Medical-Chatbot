# AI Doctor - Medical Chatbot Web Application

A comprehensive medical chatbot application with AI-powered diagnosis, avatar interaction, and appointment booking system.

## 🏥 Features

- **AI-Powered Medical Chat**: Intelligent medical consultation using advanced NLP
- **Avatar Interaction**: Real-time avatar chat with D-ID streaming 
- **Voice Chat**: Speech-to-text and text-to-speech capabilities
- **Appointment Booking**: Schedule medical appointments
- **Medical Shop Locator**: Find nearby medical stores
- **Chat History**: Persistent chat history
- **User Authentication**: Secure login/signup system

## 🛠️ Technology Stack

### Frontend
- **React.js**: Modern UI framework
- **React Router**: Navigation
- **CSS3**: Styling and animations

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **MongoDB**: Database
- **Firebase**: Authentication and real-time features

### AI/ML
- **Python**: Machine learning models
- **Scikit-learn**: ML algorithms
- **NLTK**: Natural language processing
- **TF-IDF**: Text vectorization

### External Services
- **D-ID**: Avatar streaming
- **OpenAI**: AI responses
- **Firebase**: Authentication

## 📁 Project Structure

```
ai-doctor-web/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS files
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── index.js           # Main server file
│   └── config/            # Configuration files
├── ml-training/           # Python ML models
│   ├── model_training.py  # Training scripts
│   ├── model_inference.py # Inference scripts
│   └── trained_models/    # Saved models
└── did-streaming/         # D-ID avatar integration
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- MongoDB
- Firebase account
- D-ID API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-doctor-web
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../server
   npm install
   ```

4. **Setup Python Environment**
   ```bash
   cd ../ml-training
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables**
   - Copy `api.json.example` to `api.json` and fill in your API keys
   - Set up Firebase configuration
   - Configure MongoDB connection

6. **Start the Application**
   ```bash
   # Terminal 1: Start React frontend
   cd client
   npm start

   # Terminal 2: Start Node.js backend
   cd server
   npm start

   # Terminal 3: Start ML inference server
   cd ml-training
   python server.py
   ```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication
3. Add your domain to authorized domains
4. Update `firebase-config.js` with your config

### MongoDB Setup
1. Install MongoDB locally or use MongoDB Atlas
2. Update connection string in `mongodb-config.js`

### D-ID Setup
1. Get API key from D-ID
2. Update `api.json` with your credentials

## 📊 ML Model Training

The medical chatbot uses a trained ML model for intent classification:

```bash
cd ml-training
python model_training.py
```

This will:
- Preprocess medical data
- Train the classification model
- Save the trained model for inference

## 🧪 Testing

```bash
# Frontend tests
cd client
npm test

# Backend tests
cd server
npm test

# ML model tests
cd ml-training
python -m pytest
```

## 📱 Usage

1. **Login/Signup**: Create an account or login
2. **Dashboard**: Access main features
3. **Text Chat**: Type medical questions
4. **Voice Chat**: Speak your symptoms
5. **Avatar Chat**: Interact with AI avatar
6. **Appointments**: Book medical appointments
7. **Medical Shops**: Find nearby pharmacies

## 🔒 Security

- User authentication via Firebase
- Secure API endpoints
- Input validation and sanitization
- HTTPS for production deployment

## 📈 Performance

- Optimized React components
- Efficient ML model inference
- Caching for frequently accessed data
- Responsive design for all devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team: mankame.lucky510@gmail.com
- Check the documentation
- Search existing issues

## 🔄 Updates

- **v1.0.0**: Initial release with basic chat functionality
- **v1.1.0**: Added avatar integration
- **v1.2.0**: Implemented appointment booking
- **v1.3.0**: Added medical shop locator
- **v1.4.0**: Enhanced TTS pronunciation for Hindi/Marathi

---

**Note**: This is a medical chatbot for educational purposes. Always consult with healthcare professionals for medical advice.
