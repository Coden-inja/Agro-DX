import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration for the application."""
    
    # Flask configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = False
    TESTING = False
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    
    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
    
    # Firebase configuration
    FIREBASE_API_KEY = os.getenv('FIREBASE_API_KEY')
    FIREBASE_AUTH_DOMAIN = os.getenv('FIREBASE_AUTH_DOMAIN')
    FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID')
    FIREBASE_STORAGE_BUCKET = os.getenv('FIREBASE_STORAGE_BUCKET')
    FIREBASE_MESSAGING_SENDER_ID = os.getenv('FIREBASE_MESSAGING_SENDER_ID')
    FIREBASE_APP_ID = os.getenv('FIREBASE_APP_ID')
    FIREBASE_DATABASE_URL = os.getenv('FIREBASE_DATABASE_URL')
    FIREBASE_MEASUREMENT_ID = os.getenv('FIREBASE_MEASUREMENT_ID')
    
    # API Keys
    GEOAPIFY_API_KEY = os.getenv('GEOAPIFY_API_KEY')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    OPENWEATHERMAP_API_KEY = os.getenv('OPENWEATHERMAP_API_KEY')

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test.db'

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False

# Dictionary of configurations
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Set the active configuration
def get_config():
    """Return the active configuration."""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default']) 