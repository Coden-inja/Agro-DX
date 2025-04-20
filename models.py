from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, timezone

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    firebase_uid = db.Column(db.String(128), unique=True, nullable=True)  # Firebase User ID
    role = db.Column(db.String(20), default='user')  # user, admin, researcher
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Field(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    area = db.Column(db.Float)  # in acres
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Sensor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50))  # temperature, humidity, soil_moisture
    field_id = db.Column(db.Integer, db.ForeignKey('field.id'), nullable=False)
    last_reading = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='active')  # active, inactive, maintenance

class SensorReading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensor.id'), nullable=False)
    value = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class DiseaseDetection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    field_id = db.Column(db.Integer, db.ForeignKey('field.id'), nullable=False)
    disease_name = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    image_path = db.Column(db.String(200))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    detected_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), default='active')  # active, resolved, false_positive
    treatment_notes = db.Column(db.Text)
    weather_conditions = db.Column(db.Text)  # JSON stored as text for SQLite compatibility 