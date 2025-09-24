# AI Doctor Web Application

A comprehensive AI-powered medical consultation platform featuring real-time avatar interactions, machine learning models, and a full-stack web application.

## 🏗️ Project Structure

```
ai-doctor-web/
├── client/                 # React frontend application
├── server/                 # Node.js backend server
├── ml-training/           # Python ML training and inference
└── did-streaming/         # D-ID avatar streaming integration
```

## 🎥 Demo Video

https://github.com/lakshmeeshman/MediMitra---AI-Powered-Multilingual-Medical-Chatbot/assets/demo-video.mp4

*Replace the above URL with your actual demo video URL after uploading*

## 🚀 Features

### Frontend (React)
- **Modern UI**: Clean, responsive design with React 19
- **Authentication**: Firebase-based user authentication
- **Chat Interface**: Text and voice chat capabilities
- **Avatar Integration**: Real-time AI avatar interactions
- **Dashboard**: User dashboard with appointment management
- **Medical Shops**: Integration with medical shop locator

### Backend (Node.js)
- **Express Server**: RESTful API endpoints
- **Firebase Integration**: Real-time database and authentication
- **AI Integration**: Google Generative AI and OpenAI integration
- **Email Services**: Nodemailer for notifications
- **File Upload**: Multer for handling file uploads

### Machine Learning
- **Intent Classification**: NLP model for medical queries
- **Response Generation**: AI-powered medical responses
- **Model Training**: Automated training pipeline
- **Performance Metrics**: Research-grade evaluation metrics

### D-ID Streaming
- **Real-time Avatar**: Live AI avatar streaming
- **Voice Synthesis**: Text-to-speech integration
- **Interactive Chat**: Real-time conversation capabilities

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- Git

### Frontend Setup
```bash
cd ai-doctor-web/client
npm install
npm start
```

### Backend Setup
```bash
cd ai-doctor-web/server
npm install
npm start
```

### ML Training Setup
```bash
cd ai-doctor-web/ml-training
pip install -r requirements.txt
python train.py
```

### D-ID Streaming Setup
```bash
cd ai-doctor-web/did-streaming
npm install
# Configure api.json with your API keys
node app.js
```

## 🔧 Configuration

### Environment Variables
Create `.env` files in respective directories:

**Server (.env)**
```
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=your_domain
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_ai_key
```

**D-ID Streaming (api.json)**
```json
{
  "d_id_api_key": "your_d_id_key",
  "openai_api_key": "your_openai_key"
}
```

## 📊 Daily Development Workflow

### 1. Daily Code Updates
```bash
# Check current status
git status

# Add your changes
git add .

# Commit with descriptive message
git commit -m "Daily update: [describe your changes]"

# Push to development branch
git push origin development
```

### 2. Weekly Integration
```bash
# Switch to main branch
git checkout main

# Merge development changes
git merge development

# Push to main
git push origin main
```

### 3. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add: [feature description]"

# Push feature branch
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## 🧪 Testing

### Frontend Tests
```bash
cd client
npm test
```

### Backend Tests
```bash
cd server
npm test
```

### ML Model Tests
```bash
cd ml-training
python quick_inference.py
```

### D-ID Integration Tests
```bash
cd did-streaming
node test_d-id.js
node test_openai.js
```

## 📈 Performance Monitoring

The ML training module includes comprehensive performance metrics:
- Accuracy scores
- Precision/Recall metrics
- F1-scores
- Confusion matrices
- Research-grade evaluation reports

## 🔒 Security Considerations

- API keys are stored in environment variables
- Firebase security rules implemented
- Input validation on all endpoints
- CORS configuration for cross-origin requests

## 📱 Deployment

### Frontend (Netlify/Vercel)
```bash
cd client
npm run build
# Deploy build folder
```

### Backend (Heroku/Railway)
```bash
cd server
# Configure Procfile and deploy
```

### ML Models (Cloud)
- AWS SageMaker
- Google Cloud AI Platform
- Azure Machine Learning

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed description
4. Contact the development team

## 📅 Daily Update Checklist

- [ ] Review and commit code changes
- [ ] Update documentation if needed
- [ ] Test all components
- [ ] Push to development branch
- [ ] Update project status
- [ ] Review and merge pull requests (weekly)

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Maintainer**: [Your Name]
