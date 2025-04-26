from flask import Flask,Blueprint, render_template, request, redirect, flash, jsonify, send_from_directory, send_file, url_for
import os
import mimetypes  # Add mimetype support for proper content type headers

# Try to import TensorFlow-dependent modules but handle the case when they're not available
try:
    from main import model_prediction, TENSORFLOW_AVAILABLE  # Image-based disease detection function
except ImportError:
    # Define fallbacks when TensorFlow is not available
    def model_prediction(filepath):
        return -1  # Return error code
    TENSORFLOW_AVAILABLE = False
    print("TensorFlow not available - running in limited mode")

from llm import detect_disease, client  # Import client from llm.py for chatbot
import json
import requests
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_required, current_user
from models import db, User, Field, Sensor, SensorReading, DiseaseDetection
from sensor_utils import get_weather_data, get_location_name, process_sensor_data, get_field_health_status, generate_alert
from config import Config
from google import genai
from werkzeug.utils import secure_filename
import traceback
from datetime import datetime, timedelta
from dashboard import dashboard  # Import the dashboard Blueprint
import math
import random
from geopy.geocoders import Nominatim

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'home'  # Redirect to home page which has Firebase auth
login_manager.login_message = "Please log in to access this page. For now, you can continue without logging in."
login_manager.login_message_category = "info"

# Register blueprints
app.register_blueprint(dashboard)  # Register the dashboard Blueprint

# Create database tables
with app.app_context():
    try:
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        traceback.print_exc()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Global class names list for disease prediction
class_names = [
        'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
        'Blueberry___healthy', 'Cherry_(including_sour)___Powdery_mildew', 'Cherry_(including_sour)___healthy',
        'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_',
        'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy', 'Grape___Black_rot',
        'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape___healthy',
        'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot', 'Peach___healthy',
        'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy', 'Potato___Early_blight', 'Potato___Late_blight',
        'Potato___healthy', 'Raspberry___healthy', 'Soybean___healthy', 'Squash___Powdery_mildew',
        'Strawberry___Leaf_scorch', 'Strawberry___healthy', 'Tomato___Bacterial_spot', 'Tomato___Early_blight',
        'Tomato___Late_blight', 'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
        'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
        'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
]

# Create mapping dictionary for disease name normalization
disease_name_map = {
    # Model format to display format
    'Apple___Apple_scab': 'Apple Scab',
    'Apple___Black_rot': 'Apple Black Rot',
    'Apple___Cedar_apple_rust': 'Apple Cedar Rust',
    'Apple___healthy': 'Healthy Apple',
    'Blueberry___healthy': 'Healthy Blueberry',
    'Cherry_(including_sour)___Powdery_mildew': 'Cherry Powdery Mildew',
    'Cherry_(including_sour)___healthy': 'Healthy Cherry',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': 'Corn Gray Leaf Spot',
    'Corn_(maize)___Common_rust_': 'Corn Common Rust',
    'Corn_(maize)___Northern_Leaf_Blight': 'Corn Northern Leaf Blight',
    'Corn_(maize)___healthy': 'Healthy Corn',
    'Grape___Black_rot': 'Grape Black Rot',
    'Grape___Esca_(Black_Measles)': 'Grape Black Measles',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': 'Grape Leaf Blight',
    'Grape___healthy': 'Healthy Grape',
    'Orange___Haunglongbing_(Citrus_greening)': 'Citrus Greening',
    'Peach___Bacterial_spot': 'Peach Bacterial Spot',
    'Peach___healthy': 'Healthy Peach',
    'Pepper,_bell___Bacterial_spot': 'Bell Pepper Bacterial Spot',
    'Pepper,_bell___healthy': 'Healthy Bell Pepper',
    'Potato___Early_blight': 'Potato Early Blight',
    'Potato___Late_blight': 'Potato Late Blight',
    'Potato___healthy': 'Healthy Potato',
    'Raspberry___healthy': 'Healthy Raspberry',
    'Soybean___healthy': 'Healthy Soybean',
    'Squash___Powdery_mildew': 'Squash Powdery Mildew',
    'Strawberry___Leaf_scorch': 'Strawberry Leaf Scorch',
    'Strawberry___healthy': 'Healthy Strawberry',
    'Tomato___Bacterial_spot': 'Tomato Bacterial Spot',
    'Tomato___Early_blight': 'Tomato Early Blight',
    'Tomato___Late_blight': 'Tomato Late Blight',
    'Tomato___Leaf_Mold': 'Tomato Leaf Mold',
    'Tomato___Septoria_leaf_spot': 'Tomato Septoria Leaf Spot',
    'Tomato___Spider_mites Two-spotted_spider_mite': 'Tomato Spider Mites',
    'Tomato___Target_Spot': 'Tomato Target Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus': 'Tomato Yellow Leaf Curl Virus',
    'Tomato___Tomato_mosaic_virus': 'Tomato Mosaic Virus',
    'Tomato___healthy': 'Healthy Tomato'
}

# Reverse mapping (from display format to model format)
reverse_disease_map = {v.lower(): k for k, v in disease_name_map.items()}
# Add additional common variations
reverse_disease_map.update({
    'apple scab': 'Apple___Apple_scab',
    'black rot': 'Apple___Black_rot',
    'cedar apple rust': 'Apple___Cedar_apple_rust',
    'powdery mildew': 'Cherry_(including_sour)___Powdery_mildew',
    'gray leaf spot': 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    'common rust': 'Corn_(maize)___Common_rust_',
    'northern leaf blight': 'Corn_(maize)___Northern_Leaf_Blight',
    'black measles': 'Grape___Esca_(Black_Measles)',
    'leaf blight': 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'citrus greening': 'Orange___Haunglongbing_(Citrus_greening)',
    'bacterial spot': 'Peach___Bacterial_spot',
    'early blight': 'Potato___Early_blight',
    'late blight': 'Potato___Late_blight',
    'leaf scorch': 'Strawberry___Leaf_scorch',
    'leaf mold': 'Tomato___Leaf_Mold',
    'septoria leaf spot': 'Tomato___Septoria_leaf_spot',
    'spider mites': 'Tomato___Spider_mites Two-spotted_spider_mite',
    'target spot': 'Tomato___Target_Spot',
    'yellow leaf curl virus': 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'mosaic virus': 'Tomato___Tomato_mosaic_virus'
})

def normalize_disease_name(name, to_model_format=True):
    """
    Convert between user-friendly disease names and model format names
    
    Args:
        name (str): The disease name to normalize
        to_model_format (bool): If True, convert to model format. If False, convert to display format.
        
    Returns:
        str: Normalized disease name
    """
    if to_model_format:
        # Convert user-friendly name to model format
        return reverse_disease_map.get(name.lower(), name)
    else:
        # Convert model format to user-friendly name
        return disease_name_map.get(name, name.replace('___', ' ').replace('_', ' '))

# Firebase Config - Get from environment variables via config.py
FIREBASE_CONFIG = {
    "apiKey": Config.FIREBASE_API_KEY,
    "authDomain": Config.FIREBASE_AUTH_DOMAIN,
    "projectId": Config.FIREBASE_PROJECT_ID,
    "storageBucket": Config.FIREBASE_STORAGE_BUCKET,
    "messagingSenderId": Config.FIREBASE_MESSAGING_SENDER_ID,
    "appId": Config.FIREBASE_APP_ID,
    "databaseURL": Config.FIREBASE_DATABASE_URL
}

# Firebase Helper Functions
def verify_firebase_token(id_token):
    """Verify Firebase ID token and return user info if valid"""
    try:
        # Firebase Auth REST API endpoint for token verification
        auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={Config.FIREBASE_API_KEY}"
        
        # Send POST request to Firebase Auth
        response = requests.post(auth_url, json={'idToken': id_token})
        
        # Parse response
        if response.status_code == 200:
            user_data = response.json()
            if 'users' in user_data and len(user_data['users']) > 0:
                return user_data['users'][0]
        
        return None
    except Exception as e:
        print(f"Error verifying Firebase token: {e}")
        return None

# Home Route (Renders the main page)
@app.route('/')
def home():
    # Use hardcoded Firebase configuration directly
    firebase_config = {
        'api_key': FIREBASE_CONFIG['apiKey'],
        'auth_domain': FIREBASE_CONFIG['authDomain'],
        'project_id': FIREBASE_CONFIG['projectId'],
        'storage_bucket': FIREBASE_CONFIG['storageBucket'],
        'messaging_sender_id': FIREBASE_CONFIG['messagingSenderId'],
        'app_id': FIREBASE_CONFIG['appId'],
        'database_url': FIREBASE_CONFIG['databaseURL']
    }
    
    return render_template('index.html', firebase_config=firebase_config)

# About Page Route
@app.route('/about')
def about():
    return render_template('about.html')

# Route to handle image-based disease detection
@app.route('/upload', methods=['POST'])
def upload_image():
    # Check if file is in the request
    if 'file' not in request.files:
        flash('No file part', 'danger')
        return redirect(request.referrer or url_for('home'))
    
    file = request.files['file']
    
    if file.filename == '':
        flash('No selected file', 'danger')
        return redirect(request.referrer or url_for('home'))
    
    # Make sure the uploads directory exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    if file and allowed_file(file.filename):
        # Create a safe filename
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Check if TensorFlow is available
            if not TENSORFLOW_AVAILABLE:
                flash('TensorFlow is not available on the server. Disease detection cannot be performed.', 'danger')
                return render_template('result.html', 
                                      prediction="Error: TensorFlow not available", 
                                      confidence=None,
                                      image_path=filename)
            
            # Get prediction from the model
            print("Using TensorFlow model for prediction")
            result_index = model_prediction(filepath)
            
            if result_index == -1:
                # Model has low confidence
                flash('The model could not make a confident prediction for this image.', 'warning')
                return render_template('result.html', 
                                      prediction="Uncertain: Model has low confidence", 
                                      confidence=None,
                                      image_path=filename)
            
            # Valid prediction
            disease_name = class_names[result_index]
            
            # Don't provide a confidence value since the model doesn't return one
            confidence = None
            
            print(f"Prediction: {disease_name}, No exact confidence available")
            
            # Try to get additional info from LLM API for a richer response
            detailed_result = None
            try:
                # Use the LLM-based detection to get more detailed information
                detailed_prompt = f"Provide information about the plant disease: {disease_name}"
                detailed_result = detect_disease(detailed_prompt)
                print(f"Got detailed information for {disease_name}")
            except Exception as e:
                print(f"Could not get detailed disease information: {e}")
                traceback.print_exc()
            
            # Store the field_id if provided (for logged in users)
            field_id = request.form.get('field_id')
            
            # If user is logged in and a field_id is provided, create a record
            if current_user.is_authenticated and field_id:
                try:
                    field = Field.query.get(field_id)
                    if field and field.user_id == current_user.id:
                        detection = DiseaseDetection(
                            field_id=field_id,
                            disease_name=disease_name,
                            confidence=0.5,  # Use a neutral value for database
                            image_path=filename,
                            latitude=request.form.get('latitude'),
                            longitude=request.form.get('longitude')
                        )
                        db.session.add(detection)
                        db.session.commit()
                        
                        # Generate alert
                        generate_alert(field_id, detection)
                except Exception as e:
                    print(f"Error saving detection record: {e}")
                    flash(f"Note: Your prediction was generated but couldn't be saved to your field history.", 'warning')
            
            # Render the result template with prediction
            return render_template('result.html', 
                                  prediction=disease_name,
                                  confidence=confidence,
                                  image_path=filename,
                                  result=detailed_result)  # Pass the detailed results from LLM
                                  
        except Exception as e:
            print(f"Error processing image: {e}")
            traceback.print_exc()
            flash(f'Error processing image: {str(e)}', 'danger')
            return render_template('result.html', 
                                  prediction=f"Error: {str(e)}", 
                                  confidence=None,
                                  image_path=filename)
    
    # If file type is not allowed
    flash('Invalid file type. Please upload an image.', 'danger')
    return redirect(request.referrer or url_for('home'))

# API endpoint for image-based disease detection (returns JSON)
@app.route('/api/predict', methods=['POST'])
def api_predict():
    if not TENSORFLOW_AVAILABLE:
        return jsonify({
            'success': False,
            'message': 'TensorFlow is not available on the server. Please use offline mode.'
        }), 503
        
    if 'file' not in request.files or request.files['file'].filename == '':
        return jsonify({'error': 'No file selected'}), 400

    file = request.files['file']
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    # Run the image through the model
    result_index = model_prediction(filepath)

    if result_index == -1:
        return jsonify({
            'success': False,
            'message': 'Model is not confident about the prediction'
        })
    else:
        return jsonify({
            'success': True, 
            'disease': class_names[result_index]
        })

# API endpoint for offline mode image detection (no redirection, no Gemini)
@app.route('/api/offline-predict', methods=['POST'])
def api_offline_predict():
    if not TENSORFLOW_AVAILABLE:
        return jsonify({
            'success': False,
            'message': 'TensorFlow is not available on the server.'
        }), 503
        
    if 'file' not in request.files or request.files['file'].filename == '':
        return jsonify({'error': 'No file selected'}), 400

    file = request.files['file']
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    # Run the image through the model directly as in main.py
    result_index = model_prediction(filepath)

    if result_index == -1:
        return jsonify({
            'success': False,
            'message': 'Model is not confident about the prediction'
        })
    else:
        return jsonify({
            'success': True, 
            'disease': class_names[result_index],
            'offline_mode': True
        })

# Route to handle symptoms-based text detection using LLM API
@app.route('/text-detection', methods=['POST'])
def text_detection():
    if 'text_input' not in request.form or not request.form['text_input']:
        flash('Please enter symptoms for analysis', 'warning')
        return redirect(url_for('home'))
    
    user_input = request.form['text_input']
    
    try:
        result = detect_disease(user_input)
        
        # Try to extract disease name from result for normalization
        disease_name = None
        if "Disease:" in result:
            disease_lines = [line for line in result.split('\n') if "Disease:" in line]
            if disease_lines:
                disease_name = disease_lines[0].replace("Disease:", "").strip()
                
                # Convert to model format for consistency with detection models
                model_disease_name = normalize_disease_name(disease_name, to_model_format=True)
                
                # Check if the normalized name is in our class list
                if model_disease_name not in class_names:
                    print(f"Warning: Disease not found in model classes: {disease_name} -> {model_disease_name}")
                    # We'll still return results, just with a note about the disease not being in our model
                else:
                    # Update the result to use the normalized disease name for consistent display
                    clean_name = normalize_disease_name(model_disease_name, to_model_format=False)
                    result = result.replace(disease_lines[0], f"Disease: {clean_name}")
        
        return render_template('result.html', result=result, uploaded_text=user_input)
    except requests.exceptions.RequestException as e:
        # Handle connection errors
        print(f"Network error during text detection: {e}")
        traceback.print_exc()
        flash('Network error: Could not connect to the disease detection service. Please check your internet connection and try again.', 'danger')
        return render_template('result.html', 
                              result="Error: Network connection failed. The API service may be unavailable.", 
                              uploaded_text=user_input)
    except Exception as e:
        # Handle all other errors
        print(f"Error in text detection: {e}")
        traceback.print_exc()
        flash(f'Error in text detection: {str(e)}', 'danger')
        return render_template('result.html', 
                              result=f"Error: {str(e)}", 
                              uploaded_text=user_input)

# API endpoint for text-based disease detection (returns JSON)
@app.route('/api/text-detection', methods=['POST'])
def api_text_detection():
    data = request.get_json()
    if not data or 'symptoms' not in data:
        return jsonify({'error': 'No symptoms provided in request'}), 400
    
    symptoms = data['symptoms']
    try:
        result = detect_disease(symptoms)
        
        # Try to extract and normalize the disease name
        disease_name = None
        if "Disease:" in result:
            disease_lines = [line for line in result.split('\n') if "Disease:" in line]
            if disease_lines:
                disease_name = disease_lines[0].replace("Disease:", "").strip()
                
                # Convert to model format for consistency with detection models
                model_disease_name = normalize_disease_name(disease_name, to_model_format=True)
                
                # Check if the normalized name is in our class list
                if model_disease_name not in class_names:
                    print(f"Warning: Disease not found in model classes: {disease_name} -> {model_disease_name}")
                else:
                    # Update the result to use the normalized disease name for consistent display
                    clean_name = normalize_disease_name(model_disease_name, to_model_format=False)
                    result = result.replace(disease_lines[0], f"Disease: {clean_name}")
        
        return jsonify({
            'success': True,
            'result': result,
            'disease_name': disease_name,
            'in_model_classes': model_disease_name in class_names if disease_name else False
        })
    except Exception as e:
        print(f"Error in API text detection: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Route for downloading the model for offline use
@app.route('/download-model')
def download_model():
    """
    Download model endpoint that serves model.json and weight files directly 
    for client-side inference without creating a zip file
    """
    try:
        # Redirect to the model.json file
        return jsonify({
            "success": True,
            "message": "Model available for download",
            "files": {
                "model_json": "/static/model/model.json",
                "weights": [f"/static/model/{f}" for f in os.listdir('static/model') if f.endswith('.bin')],
                "metadata": "/static/model/metadata.json" if os.path.exists('static/model/metadata.json') else None
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def fix_model_json_format(model_json):
    """
    Fix any format issues in the model JSON, ensuring proper snake_case format
    for compatibility with TensorFlow.js
    """
    # Create a new dict to avoid modifying the original
    fixed_json = dict(model_json)
    
    # Fix model topology key names
    if 'modelTopology' in fixed_json:
        model_topology = fixed_json['modelTopology']
        
        # Fix main class_name
        if 'className' in model_topology:
            model_topology['class_name'] = model_topology.pop('className')
        
        # Fix keras_version
        if 'kerasVersion' in model_topology:
            model_topology['keras_version'] = model_topology.pop('kerasVersion')
        
        # Fix layers
        if 'config' in model_topology and 'layers' in model_topology['config']:
            for layer in model_topology['config']['layers']:
                # Fix class_name in layer
                if 'className' in layer:
                    layer['class_name'] = layer.pop('className')
                
                # Fix config properties
                if 'config' in layer:
                    layer_config = layer['config']
                    
                    # Fix batch_input_shape
                    if 'batchInputShape' in layer_config:
                        layer_config['batch_input_shape'] = layer_config.pop('batchInputShape')
                    
                    # Fix use_bias
                    if 'useBias' in layer_config:
                        layer_config['use_bias'] = layer_config.pop('useBias')
    
    return fixed_json

# Route to serve model files
@app.route('/static/model/<path:filename>')
def serve_model(filename):
    """Explicitly serve files from the model directory"""
    return send_from_directory(os.path.join(app.root_path, 'static', 'model'), filename)

# Route to serve binary model weight files
@app.route('/static/model/tfjs_model/weights/<path:filename>')
def serve_model_weights(filename):
    """Serve binary weight files with correct MIME type"""
    weights_path = os.path.join(app.root_path, 'static', 'model', 'tfjs_model', 'weights')
    # Use application/octet-stream for binary files
    return send_from_directory(weights_path, filename, mimetype='application/octet-stream')

# Special route for metadata.json with correct MIME type
@app.route('/static/model/metadata.json')
def serve_metadata():
    """Explicitly serve metadata.json with correct MIME type"""
    return send_from_directory(
        os.path.join(app.root_path, 'static', 'model'), 
        'metadata.json', 
        mimetype='application/json'
    )

# Special route for classes.json with correct MIME type
@app.route('/static/model/classes.json')
def serve_classes():
    """Explicitly serve classes.json with correct MIME type"""
    return send_from_directory(
        os.path.join(app.root_path, 'static', 'model'), 
        'classes.json', 
        mimetype='application/json'
    )

# Route to serve nested model files in tfjs_model directory
@app.route('/static/model/tfjs_model/<path:filename>')
def serve_tfjs_model(filename):
    """Explicitly serve files from the tfjs_model directory"""
    return send_from_directory(os.path.join(app.root_path, 'static', 'model', 'tfjs_model'), filename)

# Route to serve nested model files in saved_model directory
@app.route('/static/model/saved_model/<path:filename>')
def serve_saved_model(filename):
    """Explicitly serve files from the saved_model directory"""
    return send_from_directory(os.path.join(app.root_path, 'static', 'model', 'saved_model'), filename)

# Status route to check if TensorFlow is available
@app.route('/status')
def status():
    return jsonify({
        'tensorflow_available': TENSORFLOW_AVAILABLE,
        'offline_mode_recommended': not TENSORFLOW_AVAILABLE
    })

# API route for user verification and session management
@app.route('/api/auth/verify', methods=['POST'])
def verify_firebase_auth():
    """Verify Firebase token and create/update user in database"""
    data = request.get_json()
    if not data or 'token' not in data:
        return jsonify({'error': 'No token provided'}), 400
    
    # Verify the token
    user_info = verify_firebase_token(data['token'])
    if not user_info:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    
    firebase_uid = user_info.get('localId')
    email = user_info.get('email')
    display_name = user_info.get('displayName') or email.split('@')[0]
    
    # Find or create user in database
    user = User.query.filter_by(email=email).first()
    if not user:
        # Create new user
        user = User(
            username=display_name,
            email=email,
            password_hash='firebase_auth',
            firebase_uid=firebase_uid
        )
        db.session.add(user)
        db.session.commit()
    
    # Return user info
    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    })

# Helper function for file uploads
def allowed_file(filename):
    """Check if uploaded file has an allowed extension"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# API endpoint for weather data
@app.route('/api/weather/<field_id>')
def get_field_weather(field_id):
    field = Field.query.get_or_404(field_id)
    
    # Get field location
    lat = field.latitude or 20.5937  # Default to central India if not set
    lng = field.longitude or 78.9629
    
    # Get weather data from OpenWeather API
    weather_data = get_weather_data(lat, lng)
    
    return jsonify({
        'success': True,
        'field_name': field.name,
        'location': get_location_name(lat, lng) or field.location,
        'weather': weather_data
    })

def get_weather_data_api(field_id):
    """API endpoint to get weather data for a specific field"""
    try:
        # Get field data from database
        field = {"id": field_id, "name": "Field " + field_id}
        if field_id == "1":
            field["name"] = "Rice Field - North"
            latitude = 22.5726
            longitude = 88.3639
            location = "Kolkata, West Bengal"
        elif field_id == "2":
            field["name"] = "Wheat Field - East"
            latitude = 19.0760
            longitude = 72.8777
            location = "Mumbai, Maharashtra"
        elif field_id == "3":
            field["name"] = "Vegetable Garden"
            latitude = 28.7041
            longitude = 77.1025
            location = "Delhi, NCR"
        else:
            # Default to Kolkata
            latitude = 22.5726
            longitude = 88.3639
            location = "Unknown Location"

        # Import the weather data function
        from sensor_utils import get_weather_data
        
        # Get weather data
        weather_data = get_weather_data(latitude, longitude)
        
        return jsonify({
            'success': True,
            'field_id': field_id,
            'field_name': field["name"],
            'location': location,
            'weather': weather_data
        })
    except Exception as e:
        app.logger.error(f"Error getting weather data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve weather data',
            'details': str(e)
        }), 500

# API endpoint for field sensor data
@app.route('/api/sensors/<field_id>')
def get_field_sensors(field_id):
    field = Field.query.get_or_404(field_id)
    
    # Get latest sensor readings
    sensors = Sensor.query.filter_by(field_id=field_id).all()
    sensor_data = []
    
    for sensor in sensors:
        # Get the latest reading for each sensor
        latest_reading = SensorReading.query.filter_by(sensor_id=sensor.id).order_by(SensorReading.timestamp.desc()).first()
        
        if latest_reading:
            sensor_data.append({
                'id': sensor.id,
                'name': sensor.name,
                'type': sensor.sensor_type,
                'value': latest_reading.value,
                'unit': sensor.unit,
                'timestamp': latest_reading.timestamp.isoformat(),
                'status': latest_reading.status
            })
    
    # If no real sensors, create mock data for demonstration
    if not sensor_data:
        sensor_data = [
            {
                'id': 1,
                'name': 'Soil Moisture',
                'type': 'moisture',
                'value': 35,
                'unit': '%',
                'timestamp': datetime.now().isoformat(),
                'status': 'normal'
            },
            {
                'id': 2,
                'name': 'Soil Temperature',
                'type': 'temperature',
                'value': 22,
                'unit': '°C',
                'timestamp': datetime.now().isoformat(),
                'status': 'normal'
            },
            {
                'id': 3,
                'name': 'Soil pH',
                'type': 'ph',
                'value': 6.5,
                'unit': 'pH',
                'timestamp': datetime.now().isoformat(),
                'status': 'normal'
            },
            {
                'id': 4,
                'name': 'Humidity',
                'type': 'humidity',
                'value': 65,
                'unit': '%',
                'timestamp': datetime.now().isoformat(),
                'status': 'warning'
            }
        ]
    
    return jsonify({
        'success': True,
        'field_name': field.name,
        'sensors': sensor_data,
        'health_status': get_field_health_status(field_id)
    })

def get_sensor_data_api(field_id):
    """API endpoint to get sensor data for a specific field"""
    try:
        # In a real app, we would get actual sensor data from the database
        # For demo, generate mock sensor data
        from datetime import datetime, timedelta
        import random
        
        # Get field data
        field = {"id": field_id, "name": "Field " + field_id}
        if field_id == "1":
            field["name"] = "Rice Field - North"
        elif field_id == "2":
            field["name"] = "Wheat Field - East"
        elif field_id == "3":
            field["name"] = "Vegetable Garden"
        
        # Generate mock sensors based on field
        sensors = []
        sensor_types = [
            {"name": "Soil Moisture", "unit": "%", "status": "good"},
            {"name": "Temperature", "unit": "°C", "status": "warning"},
            {"name": "Humidity", "unit": "%", "status": "good"},
            {"name": "Soil pH", "unit": "pH", "status": "good"}
        ]
        
        for i, sensor_type in enumerate(sensor_types):
            # Generate realistic values for each sensor type
            value = None
            if sensor_type["name"] == "Soil Moisture":
                value = random.uniform(55, 75)  # 55-75% is good for most crops
            elif sensor_type["name"] == "Temperature":
                if field_id == "1":  # Rice field
                    value = random.uniform(24, 35)  # Higher for rice fields
                elif field_id == "2":  # Wheat field
                    value = random.uniform(18, 25)  # Lower for wheat
                else:
                    value = random.uniform(20, 30)  # Moderate for garden
            elif sensor_type["name"] == "Humidity":
                value = random.uniform(50, 90)
            elif sensor_type["name"] == "Soil pH":
                value = random.uniform(5.5, 7.5)
                
            # Determine status based on value
            status = "good"
            if sensor_type["name"] == "Temperature" and value > 32:
                status = "warning"
            elif sensor_type["name"] == "Soil Moisture" and value < 60:
                status = "warning"
            elif sensor_type["name"] == "Soil pH" and (value < 6.0 or value > 7.0):
                status = "warning"
                
            sensors.append({
                "id": f"{field_id}-{i+1}",
                "name": f"{sensor_type['name']} Sensor",
                "type": sensor_type["name"].lower().replace(" ", "_"),
                "value": round(value, 1),
                "unit": sensor_type["unit"],
                "status": status,
                "field_id": field_id,
                "timestamp": (datetime.now() - timedelta(minutes=random.randint(5, 60))).isoformat()
            })
            
        # Get field health status based on sensors
        health_status = {}
        warning_count = sum(1 for sensor in sensors if sensor["status"] == "warning")
        danger_count = sum(1 for sensor in sensors if sensor["status"] == "danger")
        
        if danger_count > 0:
            health_status = {"label": "Poor", "color": "danger", "icon": "exclamation-circle-fill"}
        elif warning_count > 1:
            health_status = {"label": "Fair", "color": "warning", "icon": "exclamation-triangle-fill"}
        elif warning_count == 1:
            health_status = {"label": "Good", "color": "info", "icon": "info-circle-fill"}
        else:
            health_status = {"label": "Excellent", "color": "success", "icon": "check-circle-fill"}
        
        return jsonify({
            'success': True,
            'field_id': field_id,
            'field_name': field["name"],
            'sensors': sensors,
            'health_status': health_status
        })
    except Exception as e:
        app.logger.error(f"Error getting sensor data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve sensor data',
            'details': str(e)
        }), 500

# API endpoint for disease tracking
@app.route('/api/diseases/<field_id>')
def get_field_diseases(field_id):
    field = Field.query.get_or_404(field_id)
    
    # Get disease detections for the field
    detections = DiseaseDetection.query.filter_by(field_id=field_id).order_by(DiseaseDetection.detected_at.desc()).all()
    disease_data = []
    
    for detection in detections:
        disease_data.append({
            'id': detection.id,
            'disease_name': detection.disease_name,
            'confidence': detection.confidence,
            'image_path': detection.image_path,
            'latitude': detection.latitude,
            'longitude': detection.longitude,
            'detected_at': detection.detected_at.isoformat(),
            'status': detection.status
        })
    
    # If no real data, create mock data for demonstration
    if not disease_data:
        # Mock disease detections with common diseases
        disease_data = [
            {
                'id': 1,
                'disease_name': 'Tomato_Late_blight',
                'confidence': 0.92,
                'image_path': 'tomato_blight.jpg',
                'latitude': field.latitude + 0.001 if field.latitude else 20.59,
                'longitude': field.longitude + 0.002 if field.longitude else 78.96,
                'detected_at': (datetime.now() - timedelta(days=2)).isoformat(),
                'status': 'treated'
            },
            {
                'id': 2,
                'disease_name': 'Potato_Early_blight',
                'confidence': 0.89,
                'image_path': 'potato_blight.jpg',
                'latitude': field.latitude - 0.001 if field.latitude else 20.59,
                'longitude': field.longitude - 0.001 if field.longitude else 78.97,
                'detected_at': (datetime.now() - timedelta(days=5)).isoformat(),
                'status': 'monitoring'
            }
        ]
    
    # Calculate disease stats
    total_detections = len(disease_data)
    active_cases = sum(1 for d in disease_data if d['status'] in ['detected', 'monitoring'])
    treated_cases = sum(1 for d in disease_data if d['status'] == 'treated')
    resolved_cases = sum(1 for d in disease_data if d['status'] == 'resolved')
    
    stats = {
        'total': total_detections,
        'active': active_cases,
        'treated': treated_cases,
        'resolved': resolved_cases
    }
    
    return jsonify({
        'success': True,
        'field_name': field.name,
        'detections': disease_data,
        'stats': stats
    })

def get_disease_data_api(field_id):
    """API endpoint to get disease detection data for a specific field"""
    try:
        # In a real app, we would get actual disease data from the database
        # For demo, generate mock disease data
        from datetime import datetime, timedelta
        import random
        
        # Get field data
        field = {"id": field_id, "name": "Field " + field_id}
        if field_id == "1":
            field["name"] = "Rice Field - North"
            latitude = 22.5726
            longitude = 88.3639
            diseases = ["Rice_brown_spot", "Rice_Leaf_blight"]
        elif field_id == "2":
            field["name"] = "Wheat Field - East"
            latitude = 19.0760
            longitude = 72.8777
            diseases = ["Wheat___Brown_Rust", "Wheat___Yellow_Rust", "Wheat___Healthy"]
        elif field_id == "3":
            field["name"] = "Vegetable Garden"
            latitude = 28.7041
            longitude = 77.1025
            diseases = ["Tomato___Late_blight", "Tomato___Healthy", "Potato___Late_blight"]
        else:
            latitude = 22.5726
            longitude = 88.3639
            diseases = ["Healthy", "Unknown"]
        
        # Generate mock detections with realistic variations
        detections = []
        total_count = random.randint(3, 8)  # Random number of detections
        
        for i in range(total_count):
            # Select a random disease
            disease = random.choice(diseases)
            
            # Determine status based on detection time
            days_ago = random.randint(1, 30)
            detection_time = datetime.now() - timedelta(days=days_ago)
            
            status = "detected"
            if days_ago < 5:
                status = "detected"
            elif days_ago < 15:
                status = "monitoring"
            elif days_ago < 25:
                status = "treated"
            else:
                status = "resolved"
                
            # Randomize coordinates within field boundary
            lat_offset = random.uniform(-0.01, 0.01)
            lng_offset = random.uniform(-0.01, 0.01)
            
            # Add detection
            detections.append({
                "id": f"{field_id}-disease-{i+1}",
                "field_id": field_id,
                "disease_name": disease,
                "confidence": random.uniform(0.75, 0.98),
                "status": status,
                "detected_at": detection_time.isoformat(),
                "latitude": latitude + lat_offset,
                "longitude": longitude + lng_offset
            })
        
        # Sort by detection time (newest first)
        detections.sort(key=lambda x: x["detected_at"], reverse=True)
        
        # Calculate statistics
        stats = {
            "total": len(detections),
            "active": sum(1 for d in detections if d["status"] in ["detected", "monitoring"]),
            "treated": sum(1 for d in detections if d["status"] == "treated"),
            "resolved": sum(1 for d in detections if d["status"] == "resolved")
        }
        
        return jsonify({
            'success': True,
            'field_id': field_id,
            'field_name': field["name"],
            'detections': detections,
            'stats': stats
        })
    except Exception as e:
        app.logger.error(f"Error getting disease data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve disease data',
            'details': str(e)
        }), 500
    

# Direct dashboard access for testing purposes
@app.route('/test-dashboard')
def test_dashboard():
    """Direct access to dashboard template for testing"""
    # Use hardcoded Firebase configuration directly
    firebase_config = {
        'api_key': FIREBASE_CONFIG['apiKey'],
        'auth_domain': FIREBASE_CONFIG['authDomain'],
        'project_id': FIREBASE_CONFIG['projectId'],
        'storage_bucket': FIREBASE_CONFIG['storageBucket'],
        'messaging_sender_id': FIREBASE_CONFIG['messagingSenderId'],
        'app_id': FIREBASE_CONFIG['appId'],
        'database_url': FIREBASE_CONFIG['databaseURL']
    }
    
    # Add a flag to indicate direct access (bypassing login)
    return render_template('dashboard.html', 
                          firebase_config=firebase_config,
                          direct_access=True)

# API endpoint for weather data fetching (add this after existing weather-related endpoints)
@app.route('/api/weather-data')
def location_weather_data_api():
    """API endpoint to get detailed weather data for disease analysis from Open-Meteo"""
    try:
        # Get coordinates from query parameters
        lat = request.args.get('lat', type=float)
        lon = request.args.get('lon', type=float)
        
        if not lat or not lon:
            return jsonify({
                'error': 'Missing latitude or longitude parameters'
            }), 400
        
        # Open-Meteo API URL
        url = "https://api.open-meteo.com/v1/forecast"
        
        # Parameters for the API request - get hourly and daily data for the last 7 days and forecast
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation", "soil_moisture_0_1cm", "soil_temperature_0cm"],
            "current": ["temperature_2m", "relative_humidity_2m", "weathercode", "windspeed_10m"],
            "timezone": "auto",
            "past_days": 7  # Get data for past 7 days
        }
        
        # Make request to Open-Meteo API
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            # Return the data as is for the frontend to process
            return jsonify(response.json())
        else:
            print(f"Error from Open-Meteo API: {response.status_code}")
            return jsonify({
                'error': f'Error fetching weather data: {response.status_code}'
            }), 500
    
    except Exception as e:
        print(f"Exception in weather data API: {e}")
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500

# API endpoint for analyzing disease factors
@app.route('/api/analyze-disease-factors', methods=['POST', 'OPTIONS'])
def analyze_disease_factors():
    """API to analyze disease factors based on weather, location, and user-provided data"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
        
    # Normal POST processing
    try:
        # Get JSON data from request
        data = request.json
        print(f"Received analysis request: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract data from request
        disease = data.get('disease', 'Unknown disease')
        location = data.get('location', {})
        weather = data.get('weather', {})
        fertilizer = data.get('fertilizer', '')
        soil_type = data.get('soil_type', '')
        pesticide = data.get('pesticide', '')
        watering = data.get('watering', '')
        
        # Get name of location from coordinates
        location_name = "Unknown location"
        if location and 'latitude' in location and 'longitude' in location:
            try:
                geolocator = Nominatim(user_agent="agrodx-app")
                location_obj = geolocator.reverse(f"{location['latitude']}, {location['longitude']}")
                if location_obj and location_obj.address:
                    location_name = location_obj.address
            except Exception as e:
                print(f"Error getting location name: {e}")
                # Still continue with unknown location
        
        # Clean up disease name for better analysis
        cleaned_disease = disease
        if "___" in disease:
            # Convert model format to readable format
            cleaned_disease = normalize_disease_name(disease, to_model_format=False)
            
        # Prepare prompt for Gemini
        prompt = f"""
        Analyze the potential causes of {cleaned_disease} in plants at {location_name}.
        
        Weather conditions:
        - Humidity: {weather.get('humidity', 'Unknown')}%
        - Rainfall (last 7 days): {weather.get('rainfall', 'Unknown')} mm
        - Temperature: {weather.get('temperature', 'Unknown')}°C
        
        User inputs:
        - Fertilizer used: {fertilizer}
        - Soil type: {soil_type}
        - Watering frequency: {watering}
        
        Based on this information, provide a comprehensive analysis on whether the disease is more likely caused by:
        1. Weather conditions
        2. Improper fertilizer use
        3. Soil conditions
        4. Watering issues
        5. Other factors
        
        The analysis should be VERY DETAILED and PRACTICAL for a farmer to understand and take action, including:
        
        1. PRIMARY CAUSE: Identify the primary factor contributing to {cleaned_disease} based on the given conditions.
        
        2. DETAILED EXPLANATION: Explain specifically HOW each factor might be contributing to the disease:
            - Weather factors: Explain how current humidity, rainfall, and temperature relate to disease development
            - Soil factors: How the soil type might affect disease spread
            - Fertilizer impact: How over or under-fertilization might influence the disease
            - Watering practices: How the watering frequency might be helping or hurting
        
        3. PREVENTION MEASURES: Provide at least 5 specific, actionable prevention measures a farmer can implement immediately, being very specific about:
            - Exact chemical applications (if appropriate)
            - Specific cultural practices with timing information
            - Proper fertilizer adjustments with quantities
            - Precise watering schedule modifications
            - Crop rotation recommendations
        
        Format your response using HTML for readability, with clear section headings, bullet points for key information, and a visually structured layout. Use farmer-friendly language while maintaining scientific accuracy.
        """
        
        print(f"Sending prompt to Gemini: {prompt[:100]}...")
        
        # Try to use LLM for analysis
        try:
            if client:  # Using the Gemini client
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[prompt]
                )
                
                if response and response.text:
                    result_text = response.text
                    print(f"Received response from Gemini: {result_text[:100]}...")
                    
                    # Parse the sections from the result
                    analysis_section = ""
                    prevention_section = ""
                    
                    # Try to extract specific sections if they exist
                    if "<analysis>" in result_text and "</analysis>" in result_text:
                        analysis_section = result_text.split("<analysis>")[1].split("</analysis>")[0].strip()
                    elif "<h2>Analysis</h2>" in result_text or "<h3>Analysis</h3>" in result_text:
                        # Try to extract from HTML headings
                        if "<h2>Analysis</h2>" in result_text:
                            parts = result_text.split("<h2>Analysis</h2>")
                            if len(parts) > 1:
                                if "<h2>" in parts[1]:
                                    analysis_section = parts[1].split("<h2>")[0].strip()
                                else:
                                    analysis_section = parts[1].strip()
                        elif "<h3>Analysis</h3>" in result_text:
                            parts = result_text.split("<h3>Analysis</h3>")
                            if len(parts) > 1:
                                if "<h3>" in parts[1]:
                                    analysis_section = parts[1].split("<h3>")[0].strip()
                                else:
                                    analysis_section = parts[1].strip()
                    else:
                        # If not properly formatted, take the first part of the response
                        sections = result_text.split("\n\n")
                        if len(sections) > 1:
                            analysis_section = sections[0]
                    
                    if "<prevention>" in result_text and "</prevention>" in result_text:
                        prevention_section = result_text.split("<prevention>")[1].split("</prevention>")[0].strip()
                    elif "<h2>Prevention</h2>" in result_text or "<h3>Prevention</h3>" in result_text:
                        # Try to extract from HTML headings
                        if "<h2>Prevention</h2>" in result_text:
                            parts = result_text.split("<h2>Prevention</h2>")
                            if len(parts) > 1:
                                prevention_section = parts[1].strip()
                        elif "<h3>Prevention</h3>" in result_text:
                            parts = result_text.split("<h3>Prevention</h3>")
                            if len(parts) > 1:
                                prevention_section = parts[1].strip()
                    else:
                        # If not properly formatted, take the latter part containing prevention
                        if "prevention" in result_text.lower():
                            prevention_parts = result_text.lower().split("prevention")
                            if len(prevention_parts) > 1:
                                prevention_section = "Prevention" + prevention_parts[1]
                    
                    # If we still don't have specific sections, use the whole text for analysis
                    if not analysis_section and not prevention_section:
                        analysis_section = result_text
                    
                    print(f"Extracted analysis and prevention sections successfully")
                    return jsonify({
                        'success': True,
                        'analysis': analysis_section or result_text,
                        'prevention': prevention_section or "No specific prevention measures provided."
                    })
            
            # Fallback if Gemini client is not available
            print("Gemini client not available, using fallback response")
            return jsonify({
                'success': False,
                'analysis': f"<p>Based on the information provided, it appears that the {cleaned_disease} might be caused by a combination of factors. The current weather conditions in your area don't strongly match the typical pattern for this disease, suggesting that other factors like your {soil_type} soil type or the fertilizer ({fertilizer}) you're using could be contributing factors.</p>",
                'prevention': f"<p>To prevent further spread of {cleaned_disease}, consider the following measures:</p><ul><li>Adjust your fertilizer application to ensure proper nutrient balance</li><li>Ensure proper drainage for your {soil_type} soil</li><li>Modify your {watering} watering schedule to avoid over-watering</li><li>Consult with a local agricultural extension office for specific advice tailored to your region</li></ul>"
            })
            
        except Exception as e:
            print(f"Error using LLM for analysis: {e}")
            traceback.print_exc()
            # Provide a simple fallback response with basic HTML formatting
            return jsonify({
                'success': False,
                'analysis': f"<p>We couldn't perform a detailed analysis due to a technical issue. Based on the information provided, {cleaned_disease} in your area might be influenced by your {soil_type} soil type, {fertilizer} fertilizer, and {watering} watering practices rather than just weather conditions.</p>",
                'prevention': f"<ul><li>Review your fertilizer application rates to avoid excess nitrogen</li><li>Ensure proper drainage for your {soil_type} soil</li><li>Adjust your watering schedule to avoid prolonged leaf wetness</li><li>Consider consulting with a local agricultural expert for personalized advice</li></ul>"
            })
        
    except Exception as e:
        print(f"Exception in disease factor analysis: {e}")
        traceback.print_exc()
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500

# Test route for location and weather functionality
@app.route('/test-location-weather')
def test_location_weather():
    """Test page for location and weather functionality"""
    return render_template('test-location-weather.html')

# Test route for disease name normalization
@app.route('/test-normalization')
def test_normalization():
    """Test page for disease name normalization"""
    return render_template('test-normalization.html')

# Mock weather API endpoint
@app.route('/api/weather/<int:field_id>')
def weather_api(field_id):
    """API endpoint for weather data"""
    try:
        # Create location-specific mock weather data based on field ID
        locations = {
            1: "Kolkata, West Bengal",
            2: "Mumbai, Maharashtra",
            3: "Delhi, NCR"
        }
        
        # Get current hour to determine temperature pattern
        current_hour = datetime.now().hour
        
        # Vary base temperature based on field ID
        base_temp = 24.5 + (field_id * 2)
        
        # Create a realistic 24-hour temperature forecast
        forecast = []
        for i in range(1, 25):  # Full 24 hours
            hour = (current_hour + i) % 24  # Hour of day (0-23)
            
            # Temperature variation follows a sine curve to simulate day/night cycle
            # Lowest at around 4am, highest at around 2pm
            temp_variation = 5 * math.sin(math.pi * ((hour - 4) % 24) / 12)
            
            # Add some randomness
            random_factor = random.uniform(-0.5, 0.5)
            
            # Calculate temperature for this hour
            temp = base_temp + temp_variation + random_factor
            
            # Determine icon based on time of day and field
            if 6 <= hour < 18:  # Daytime
                icons = ['01d', '02d', '03d', '04d', '10d']  # Day icons
            else:  # Nighttime
                icons = ['01n', '02n', '03n', '04n', '10n']  # Night icons
                
            # Select icon with some variation based on field_id
            icon_index = (field_id + i) % len(icons)
            
            forecast.append({
                'time': (datetime.now() + timedelta(hours=i)).isoformat(),
                'temp': round(temp, 1),
                'icon': icons[icon_index]
            })
        
        weather_data = {
            'success': True,
            'field_name': f'Field {field_id}',
            'location': locations.get(field_id, 'Sample Location'),
            'weather': {
                'temp': base_temp,
                'humidity': 55 + (field_id * 5),
                'wind_speed': 10 + (field_id * 2),
                'description': ['partly cloudy', 'sunny', 'light rain'][field_id % 3],
                'icon': ['02d', '01d', '10d'][field_id % 3],
                'forecast': forecast
            }
        }
        return jsonify(weather_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Mock sensors API endpoint
@app.route('/api/sensors/<int:field_id>')
def sensors_api(field_id):
    """API endpoint for sensor data"""
    try:
        # Create field-specific mock sensor data
        health_statuses = [
            {'label': 'Good', 'color': 'success', 'icon': 'check-circle-fill'},
            {'label': 'Warning', 'color': 'warning', 'icon': 'exclamation-triangle-fill'},
            {'label': 'Critical', 'color': 'danger', 'icon': 'x-circle-fill'}
        ]
        
        # Base values that change with field ID
        temp_base = 26 + (field_id * 1.5)
        humidity_base = 60 + (field_id * 2)
        soil_base = 35 - (field_id * 3)
        
        sensor_data = {
            'success': True,
            'health_status': health_statuses[field_id % 3],
            'sensors': [
                {
                    'id': 1,
                    'name': 'Temperature',
                    'value': temp_base,
                    'unit': '°C',
                    'status': ['good', 'good', 'warning'][field_id % 3],
                    'timestamp': datetime.now().isoformat()
                },
                {
                    'id': 2,
                    'name': 'Humidity',
                    'value': humidity_base,
                    'unit': '%',
                    'status': ['good', 'warning', 'good'][field_id % 3],
                    'timestamp': datetime.now().isoformat()
                },
                {
                    'id': 3,
                    'name': 'Soil Moisture',
                    'value': soil_base,
                    'unit': '%',
                    'status': ['warning', 'good', 'danger'][field_id % 3],
                    'timestamp': datetime.now().isoformat()
                },
                {
                    'id': 4,
                    'name': 'Light Level',
                    'value': 750 + (field_id * 100),
                    'unit': 'lux',
                    'status': ['good', 'good', 'good'][field_id % 3],
                    'timestamp': datetime.now().isoformat()
                }
            ]
        }
        return jsonify(sensor_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Mock diseases API endpoint
@app.route('/api/diseases/<int:field_id>')
def diseases_api(field_id):
    """API endpoint for disease detection data"""
    try:
        # Create field-specific mock disease data
        detection_time = datetime.now()
        
        # Different locations based on field ID
        base_coordinates = {
            1: (22.5726, 88.3639),  # Kolkata
            2: (19.0760, 72.8777),  # Mumbai
            3: (28.6139, 77.2090)   # Delhi
        }
        
        # Get base coordinates or default to Kolkata
        base_lat, base_lon = base_coordinates.get(field_id, (22.5726, 88.3639))
        
        # Disease types that vary by field
        diseases = [
            ['Leaf_Blight', 'Powdery_Mildew', 'Rust'],
            ['Bacterial_Leaf_Spot', 'Early_Blight', 'Late_Blight'],
            ['Yellow_Leaf_Curl', 'Black_Spot', 'Anthracnose']
        ]
        
        # Statuses that vary by field
        statuses = [
            ['detected', 'monitoring', 'treated'],
            ['monitoring', 'treated', 'resolved'],
            ['detected', 'detected', 'monitoring']
        ]
        
        field_diseases = diseases[field_id % 3]
        field_statuses = statuses[field_id % 3]
        
        disease_data = {
            'success': True,
            'stats': {
                'total': 3 + field_id,
                'active': 1 + (field_id % 3),
                'treated': 1,
                'resolved': field_id % 2
            },
            'detections': [
                {
                    'id': 1,
                    'disease_name': field_diseases[0],
                    'status': field_statuses[0],
                    'confidence': 0.92 - (field_id * 0.05),
                    'detected_at': detection_time.isoformat(),
                    'latitude': base_lat,
                    'longitude': base_lon
                },
                {
                    'id': 2,
                    'disease_name': field_diseases[1],
                    'status': field_statuses[1],
                    'confidence': 0.85 - (field_id * 0.03),
                    'detected_at': (detection_time - timedelta(days=2)).isoformat(),
                    'latitude': base_lat + 0.005,
                    'longitude': base_lon + 0.005
                },
                {
                    'id': 3,
                    'disease_name': field_diseases[2],
                    'status': field_statuses[2],
                    'confidence': 0.78 - (field_id * 0.02),
                    'detected_at': (detection_time - timedelta(days=5)).isoformat(),
                    'latitude': base_lat - 0.005,
                    'longitude': base_lon - 0.005
                }
            ]
        }
        return jsonify(disease_data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config/geoapify')
def get_geoapify_api_key():
    """Return the Geoapify API key for use in the frontend"""
    return jsonify({
        'apiKey': Config.GEOAPIFY_API_KEY
    })

# Initialize Gemini client
try:
    client = genai.Client(api_key=Config.GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

# Session-based chat objects
chat_sessions = {}

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    if not client:
        return jsonify({'success': False, 'response': 'Gemini API is not available. Check your setup.'})

    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        session_id = data.get('session_id', 'default')

        if not user_message:
            return jsonify({'success': False, 'response': 'Please enter a message.'})

        # Create a session if it doesn't exist
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                'messages': [],
                'system_instruction': (
                    "You are AgroDx, an AI assistant focused only on farming, plant diseases, fertilizers, and soil health. "
                    "Provide concise, polite, and informative responses. Don't use markdown or special symbols. "
                    "Only respond to farming-related topics."
                )
            }

        # Add user message to session history
        chat_sessions[session_id]['messages'].append({"role": "user", "content": user_message})

        # Prepare prompt including the system instruction and previous messages
        prompt = chat_sessions[session_id]['system_instruction']
        for message in chat_sessions[session_id]['messages']:
            prompt += f"\n{message['role'].capitalize()}: {message['content']}"

        # Send the message and get the response from Gemini
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt]
        )

        bot_message = response.text.strip() if response else "Sorry, I couldn't generate a reply right now."

        # Add the bot's response to session history
        chat_sessions[session_id]['messages'].append({"role": "model", "content": bot_message})

        return jsonify({'success': True, 'response': bot_message})

    except Exception as e:
        print(f"Error in chatbot route: {e}")
        return jsonify({'success': False, 'response': 'An error occurred while generating a response.'})



if __name__ == '__main__':
    # Create the model directory if it doesn't exist
    os.makedirs('static/model', exist_ok=True)
    
    # Create upload directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Print status information
    if not TENSORFLOW_AVAILABLE:
        print("WARNING: TensorFlow is not available. Online image detection will not work.")
        print("Please use the offline mode with TensorFlow.js in the browser.")
    
    # Run the app on the assigned port or default to 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
