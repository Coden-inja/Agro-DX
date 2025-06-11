# AgroDX - Plant Disease Detection System

AgroDX is a plant disease detection application that helps farmers identify and manage plant diseases through image analysis. The system now features a robust offline mode and supports both image and text-based disease detection.

## Features

- **Image-based Disease Detection**: Uses deep learning to identify plant diseases from uploaded photos
- **Offline Detection**: The offline feature is turned off due to poor perfomance after model conversion
- **Text-based Disease Detection**: Analyze disease symptoms using natural language processing
- **User-friendly Interface**: Intuitive design for seamless experience
- **Responsive Design**: Works on desktop and mobile devices
- **Disease Information**: Provides detailed information about detected diseases
- **Firebase Authentication**: Optional user account creation for saving detection history
- **Speech to text**: For farmers to interact without the hassle of typing

## Technical Capabilities

- Supports 38 different plant/disease combinations
- Pre-trained model using TensorFlow
- Client-side inference with TensorFlow.js
- Automatic model download for offline use
- High-resolution image processing
- Confidence display for predictions

## Prerequisites

- Python 3.8 or higher
- SQLite database (default) or PostgreSQL (optional)
- API key for Google Gemini Pro (text-based detection)
- Firebase setup (optional, for authentication)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Coden-inja/Agro-DX
cd agrodx
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
- Copy `.env.example` to `.env`
- Update with your API keys and configuration

5. Run the application:
```bash
flask run
```

6. Open your browser and navigate to `http://localhost:5000`

## Environment Configuration

The `.env` file is not included in the repository due to security reasons. You'll need to create your own `.env` file in the project root with the following variables:

```
# Google Gemini API (for text-based disease detection)
GOOGLE_API_KEY=your_google_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///instance/agrodx.db  # Default SQLite database
# Optionally use PostgreSQL:
# DATABASE_URL=postgresql://username:password@localhost/agrodx

# Secret Key (used by Flask for sessions)
SECRET_KEY=your_random_secret_key_here

# Firebase Configuration (optional, for authentication)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Model Configuration
MODEL_CONFIDENCE_THRESHOLD=0.4  # Minimum confidence for a valid prediction
```

To obtain these API keys:

1. **Google Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/)
   - Create or select a project
   - Generate an API key from the API section

2. **Firebase Configuration**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Navigate to Project Settings
   - Find the Firebase SDK configuration section
   - Copy the values into your .env file

Make sure to add the `.env` file to your `.gitignore` to prevent accidentally committing your secret keys to version control.

## Project Structure

```
agrodx/
├── app.py              # Main Flask application
├── main.py             # Model prediction functions
├── llm.py              # Text-based detection using Gemini Pro
├── simple_convert.py   # Model conversion for TensorFlow.js
├── models.py           # Database models
├── config.py           # Configuration settings
├── dashboard.py        # Dashboard functionality
├── sensor_utils.py     # Sensor and weather utilities
├── static/
│   ├── css/
│   ├── js/
│   ├── model/          # TensorFlow.js model files
│   └── uploads/        # Image upload directory
├── templates/          # HTML templates
├── input_folder/       # Test image directory
└── requirements.txt    # Python dependencies
```

## Dependencies

- **Backend**:
  - Flask (Web framework)
  - TensorFlow/TensorFlow.js (Model inference)
  - Google Generative AI (Text-based detection)
  - SQLAlchemy (Database ORM)

- **Frontend**:
  - TensorFlow.js (Client-side inference)
  - Firebase (Authentication)
  - Bootstrap 5 (Styling)

## Offline Functionality

The application provides complete offline functionality:
1. The TensorFlow.js model is automatically downloaded on first visit
2. All disease detection can be performed entirely client-side
3. No internet connection required after initial setup

## Development

1. Install development dependencies:
```bash
pip install pytest black
```

2. Format code:
```bash
black .
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Augmented Plant Village dataset for disease images
- TensorFlow.js for client-side model inference
- All contributors and maintainers 
