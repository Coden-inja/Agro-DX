import os
import requests
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
import json
from models import db, Sensor, SensorReading, DiseaseDetection, Field, User
from config import Config
from flask import current_app
import pandas as pd
import random

def get_weather_data(latitude, longitude):
    """Fetch weather data from Open-Meteo for the given coordinates"""
    
    # Default to Kolkata if no coordinates provided
    if not latitude or not longitude:
        # Kolkata coordinates
        latitude = 22.5726
        longitude = 88.3639
    
    # Open-Meteo API URL
    url = "https://api.open-meteo.com/v1/forecast"
    
    # Parameters for the API request
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation_probability", "weathercode", "windspeed_10m"],
        "current": ["temperature_2m", "relative_humidity_2m", "weathercode", "windspeed_10m"],
        "timezone": "auto"
    }
    
    try:
        # Make request to Open-Meteo API
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            # Get current weather
            current = data.get('current', {})
            
            # Get hourly forecast for the weather description and icon
            hourly = data.get('hourly', {})
            weathercode = current.get('weathercode', 0)
            
            # Map WMO weather codes to OpenWeather-like descriptions and icons
            # See: https://open-meteo.com/en/docs/weather-codes
            weather_descriptions = {
                0: {"description": "clear sky", "icon": "01d"},
                1: {"description": "mainly clear", "icon": "02d"},
                2: {"description": "partly cloudy", "icon": "03d"},
                3: {"description": "overcast", "icon": "04d"},
                45: {"description": "fog", "icon": "50d"},
                48: {"description": "depositing rime fog", "icon": "50d"},
                51: {"description": "light drizzle", "icon": "09d"},
                53: {"description": "moderate drizzle", "icon": "09d"},
                55: {"description": "dense drizzle", "icon": "09d"},
                56: {"description": "light freezing drizzle", "icon": "09d"},
                57: {"description": "dense freezing drizzle", "icon": "09d"},
                61: {"description": "slight rain", "icon": "10d"},
                63: {"description": "moderate rain", "icon": "10d"},
                65: {"description": "heavy rain", "icon": "10d"},
                66: {"description": "light freezing rain", "icon": "13d"},
                67: {"description": "heavy freezing rain", "icon": "13d"},
                71: {"description": "slight snow fall", "icon": "13d"},
                73: {"description": "moderate snow fall", "icon": "13d"},
                75: {"description": "heavy snow fall", "icon": "13d"},
                77: {"description": "snow grains", "icon": "13d"},
                80: {"description": "slight rain showers", "icon": "09d"},
                81: {"description": "moderate rain showers", "icon": "09d"},
                82: {"description": "violent rain showers", "icon": "09d"},
                85: {"description": "slight snow showers", "icon": "13d"},
                86: {"description": "heavy snow showers", "icon": "13d"},
                95: {"description": "thunderstorm", "icon": "11d"},
                96: {"description": "thunderstorm with slight hail", "icon": "11d"},
                99: {"description": "thunderstorm with heavy hail", "icon": "11d"}
            }
            
            weather_info = weather_descriptions.get(weathercode, {"description": "unknown", "icon": "01d"})
            
            # Calculate precipitation from probability (for simplicity)
            precipitation = 0
            if 'precipitation_probability' in hourly and len(hourly['precipitation_probability']) > 0:
                precip_prob = hourly['precipitation_probability'][0]
                precipitation = precip_prob / 100.0 if precip_prob else 0
            
            # Format the data like we'd expect from OpenWeather for compatibility
            weather_data = {
                'temp': current.get('temperature_2m', 0),
                'humidity': current.get('relative_humidity_2m', 0),
                'wind_speed': current.get('windspeed_10m', 0),
                'description': weather_info['description'],
                'icon': weather_info['icon'],
                'precipitation': precipitation,
                'forecast': prepare_forecast_data(hourly)
            }
            
            return weather_data
        else:
            print(f"Error fetching weather data: {response.status_code}")
            return default_weather_data()
    except Exception as e:
        print(f"Exception fetching weather data: {e}")
        return default_weather_data()

def prepare_forecast_data(hourly_data):
    """Prepare forecast data from hourly data"""
    forecast = []
    
    if not hourly_data or not all(key in hourly_data for key in ['time', 'temperature_2m', 'weathercode']):
        return forecast
    
    # Get data for the next 24 hours at 3-hour intervals
    for i in range(0, 24, 3):
        if i < len(hourly_data['time']):
            time_str = hourly_data['time'][i]
            temp = hourly_data['temperature_2m'][i] if 'temperature_2m' in hourly_data and i < len(hourly_data['temperature_2m']) else 0
            weathercode = hourly_data['weathercode'][i] if 'weathercode' in hourly_data and i < len(hourly_data['weathercode']) else 0
            
            # Map WMO weather code to icon
            icon = "01d"  # Default
            if weathercode in [0]:
                icon = "01d"
            elif weathercode in [1]:
                icon = "02d"
            elif weathercode in [2]:
                icon = "03d"
            elif weathercode in [3]:
                icon = "04d"
            elif weathercode in [45, 48]:
                icon = "50d"
            elif weathercode in [51, 53, 55, 56, 57]:
                icon = "09d"
            elif weathercode in [61, 63, 65, 66, 67]:
                icon = "10d"
            elif weathercode in [71, 73, 75, 77, 85, 86]:
                icon = "13d"
            elif weathercode in [95, 96, 99]:
                icon = "11d"
            
            forecast.append({
                'time': time_str,
                'temp': temp,
                'icon': icon
            })
    
    return forecast

def default_weather_data():
    """Return default weather data if the API request fails"""
    return {
        'temp': 25,
        'humidity': 60,
        'wind_speed': 5,
        'description': 'sunny',
        'icon': '01d',
        'precipitation': 0,
        'forecast': []
    }

def get_location_name(latitude, longitude):
    """Get the location name from coordinates using Geoapify"""
    
    # Default to Kolkata if no coordinates provided
    if not latitude or not longitude:
        return "Kolkata, India"
    
    api_key = Config.GEOAPIFY_API_KEY
    
    url = f"https://api.geoapify.com/v1/geocode/reverse?lat={latitude}&lon={longitude}&apiKey={api_key}"
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            features = data.get('features', [])
            
            if features and len(features) > 0:
                properties = features[0].get('properties', {})
                city = properties.get('city', '')
                state = properties.get('state', '')
                country = properties.get('country', '')
                
                if city:
                    if state:
                        return f"{city}, {state}"
                    else:
                        return f"{city}, {country}"
                elif state:
                    return f"{state}, {country}"
                else:
                    return country
            
            return "Unknown Location"
        else:
            print(f"Error fetching location name: {response.status_code}")
            return "Unknown Location"
    except Exception as e:
        print(f"Exception fetching location name: {e}")
        return "Unknown Location"

def get_field_health_status(field_id):
    """Get the health status of a field based on sensor data"""
    # This would normally query the database for sensor readings
    # For now, returning mock data
    
    # Random status for demo purposes
    statuses = [
        {'label': 'Excellent', 'color': 'success', 'icon': 'check-circle-fill'},
        {'label': 'Good', 'color': 'info', 'icon': 'info-circle-fill'},
        {'label': 'Fair', 'color': 'warning', 'icon': 'exclamation-triangle-fill'},
        {'label': 'Poor', 'color': 'danger', 'icon': 'exclamation-circle-fill'}
    ]
    
    # For demo, mostly return good statuses
    weights = [0.3, 0.4, 0.2, 0.1]
    return random.choices(statuses, weights=weights)[0]

def process_sensor_data(sensor_data):
    """Process sensor data for visualization and analysis"""
    # This would process raw sensor data into a format suitable for visualization
    # For now, it's a placeholder
    return sensor_data

def generate_alert(field_id, detection):
    """Generate an alert for a disease detection"""
    # This would normally create an alert in the database
    # For now, it's a placeholder
    print(f"Alert generated for field {field_id}: {detection.disease_name}")
    return True 