from flask import Blueprint, render_template, jsonify, request
from flask_login import current_user
from models import db, Field, Sensor, DiseaseDetection, SensorReading
from sensor_utils import get_field_health_status
from config import Config
import plotly.graph_objects as go
import json
import os

dashboard = Blueprint('dashboard', __name__)

# Firebase Config - Get from config
FIREBASE_CONFIG = {
    "apiKey": Config.FIREBASE_API_KEY,
    "authDomain": Config.FIREBASE_AUTH_DOMAIN,
    "projectId": Config.FIREBASE_PROJECT_ID,
    "storageBucket": Config.FIREBASE_STORAGE_BUCKET,
    "messagingSenderId": Config.FIREBASE_MESSAGING_SENDER_ID,
    "appId": Config.FIREBASE_APP_ID,
    "databaseURL": Config.FIREBASE_DATABASE_URL
}

@dashboard.route('/dashboard')
def index():
    """Main dashboard view"""
    # Use Firebase configuration from Config
    firebase_config = {
        'api_key': FIREBASE_CONFIG['apiKey'],
        'auth_domain': FIREBASE_CONFIG['authDomain'],
        'project_id': FIREBASE_CONFIG['projectId'],
        'storage_bucket': FIREBASE_CONFIG['storageBucket'],
        'messaging_sender_id': FIREBASE_CONFIG['messagingSenderId'],
        'app_id': FIREBASE_CONFIG['appId'],
        'database_url': FIREBASE_CONFIG['databaseURL']
    }
    
    return render_template('dashboard.html', firebase_config=firebase_config)

@dashboard.route('/dashboard/fields')
def fields():
    """Field management view"""
    return render_template('fields.html')

@dashboard.route('/dashboard/sensors')
def sensors():
    """Sensor management view"""
    return render_template('sensors.html')

@dashboard.route('/dashboard/disease-map')
def disease_map():
    """Disease map visualization"""
    return render_template('disease_map.html')

@dashboard.route('/dashboard/analytics')
def analytics():
    """Analytics and reporting dashboard"""
    return render_template('analytics.html')

@dashboard.route('/api/dashboard/summary')
def dashboard_summary():
    """API endpoint for dashboard summary data"""
    # This would normally query the database for summary information
    return jsonify({
        'fields_count': 0,
        'sensors_count': 0,
        'recent_detections': 0,
        'disease_alerts': 0
    })

@dashboard.route('/api/dashboard/disease-trends')
def disease_trends():
    """API endpoint for disease trend data"""
    # This would normally query the database for trend information
    return jsonify({
        'labels': ['January', 'February', 'March', 'April', 'May'],
        'datasets': [
            {
                'label': 'Disease Detections',
                'data': [5, 8, 3, 10, 7]
            }
        ]
    })

@dashboard.route('/api/field/<int:field_id>/health')
def field_health(field_id):
    field = Field.query.get_or_404(field_id)
    if field.user_id != current_user.id and current_user.is_authenticated:
        return jsonify({'error': 'Unauthorized'}), 403
    
    health_data = get_field_health_status(field_id)
    if not health_data:
        return jsonify({'error': 'Failed to fetch health data'}), 500
    
    return jsonify(health_data)

@dashboard.route('/api/field/<int:field_id>/sensor_data')
def sensor_data(field_id):
    field = Field.query.get_or_404(field_id)
    if field.user_id != current_user.id and current_user.is_authenticated:
        return jsonify({'error': 'Unauthorized'}), 403
    
    sensors = Sensor.query.filter_by(field_id=field_id).all()
    data = []
    for sensor in sensors:
        readings = SensorReading.query.filter_by(
            sensor_id=sensor.id
        ).order_by(SensorReading.timestamp.desc()).limit(24).all()
        
        data.append({
            'sensor_id': sensor.id,
            'type': sensor.type,
            'readings': [{
                'value': r.value,
                'timestamp': r.timestamp.isoformat()
            } for r in readings]
        })
    
    return jsonify(data)

@dashboard.route('/api/field/<int:field_id>/disease_trend')
def disease_trend(field_id):
    field = Field.query.get_or_404(field_id)
    if field.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    detections = DiseaseDetection.query.filter_by(
        field_id=field_id
    ).order_by(DiseaseDetection.detected_at.desc()).limit(30).all()
    
    # Create time series plot
    fig = go.Figure()
    
    # Group by disease
    diseases = {}
    for detection in detections:
        if detection.disease_name not in diseases:
            diseases[detection.disease_name] = {
                'dates': [],
                'counts': []
            }
        diseases[detection.disease_name]['dates'].append(detection.detected_at)
        diseases[detection.disease_name]['counts'].append(1)
    
    # Add traces for each disease
    for disease, data in diseases.items():
        fig.add_trace(go.Scatter(
            x=data['dates'],
            y=data['counts'],
            name=disease,
            mode='lines+markers'
        ))
    
    fig.update_layout(
        title='Disease Detection Trends',
        xaxis_title='Date',
        yaxis_title='Number of Detections',
        template='plotly_white'
    )
    
    return jsonify(json.loads(fig.to_json()))

@dashboard.route('/api/field/<int:field_id>/heatmap')
def disease_heatmap(field_id):
    field = Field.query.get_or_404(field_id)
    if field.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    detections = DiseaseDetection.query.filter_by(
        field_id=field_id,
        status='active'
    ).all()
    
    # Create heatmap data
    heatmap_data = []
    for detection in detections:
        heatmap_data.append({
            'lat': detection.latitude,
            'lon': detection.longitude,
            'disease': detection.disease_name,
            'confidence': detection.confidence
        })
    
    return jsonify(heatmap_data) 