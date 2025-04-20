// Simple Dashboard JS - For AgroDX
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    initializeUI();
    
    // Check authentication
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is logged in
            document.getElementById('userDisplay').textContent = user.email || 'User';
            loadFields();
        } else {
            // User is not logged in, but we'll still load the dashboard
            document.getElementById('userDisplay').textContent = 'Guest User';
            loadFields();
        }
    });
    
    // Event listener for logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        firebase.auth().signOut().then(function() {
            // Redirect to home page
            window.location.href = '/';
        }).catch(function(error) {
            showAlert('danger', 'Error signing out: ' + error.message);
        });
    });
});

// Initialize UI elements
function initializeUI() {
    // Modal for adding fields
    const addFieldBtn = document.getElementById('addFieldBtn');
    const addFieldModal = new bootstrap.Modal(document.getElementById('addFieldModal'));
    const saveFieldBtn = document.getElementById('saveFieldBtn');
    
    // Add field button click
    addFieldBtn.addEventListener('click', function() {
        addFieldModal.show();
    });
    
    // Save field button click
    saveFieldBtn.addEventListener('click', function() {
        const fieldName = document.getElementById('fieldName').value;
        const fieldLocation = document.getElementById('fieldLocation').value;
        const fieldArea = document.getElementById('fieldArea').value;
        
        if (!fieldName || !fieldLocation || !fieldArea) {
            showAlert('warning', 'Please fill in all fields');
            return;
        }
        
        // Add the field
        addField(fieldName, fieldLocation, fieldArea);
        
        // Hide modal and reset form
        addFieldModal.hide();
        document.getElementById('addFieldForm').reset();
    });
}

// Load fields from mock data
function loadFields() {
    const fieldCards = document.getElementById('fieldCards');
    fieldCards.innerHTML = '';
    
    // Mock fields data (this would come from your backend in a real app)
    const fields = [
        { id: 1, name: 'Rice Field - North', location: 'Kolkata, West Bengal', area: 5.2 },
        { id: 2, name: 'Wheat Field - East', location: 'Mumbai, Maharashtra', area: 3.7 },
        { id: 3, name: 'Vegetable Garden', location: 'Delhi, NCR', area: 1.5 }
    ];
    
    if (fields.length === 0) {
        fieldCards.innerHTML = '<div class="col-12 text-center"><p>No fields added yet. Click "Add Field" to get started.</p></div>';
        return;
    }
    
    // Create a card for each field
    fields.forEach(field => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-3';
        card.innerHTML = `
            <div class="card h-100" data-field-id="${field.id}">
                <div class="card-body">
                    <h5 class="card-title">${field.name}</h5>
                    <p class="card-text">
                        <i class="bi bi-geo-alt"></i> ${field.location}<br>
                        <i class="bi bi-rulers"></i> ${field.area} hectares
                    </p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary btn-sm view-field-btn">View Details</button>
                </div>
            </div>
        `;
        
        fieldCards.appendChild(card);
        
        // Add click event to view field button
        card.querySelector('.view-field-btn').addEventListener('click', function() {
            loadFieldData(field.id, field.name);
        });
    });
    
    // Load the first field by default
    if (fields.length > 0) {
        loadFieldData(fields[0].id, fields[0].name);
    }
}

// Add a new field
function addField(name, location, area) {
    // Generate a random ID (in a real app, this would be handled by the server)
    const fieldId = Math.floor(Math.random() * 1000);
    
    // Create a new field card
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-3';
    card.innerHTML = `
        <div class="card h-100" data-field-id="${fieldId}">
            <div class="card-body">
                <h5 class="card-title">${name}</h5>
                <p class="card-text">
                    <i class="bi bi-geo-alt"></i> ${location}<br>
                    <i class="bi bi-rulers"></i> ${area} hectares
                </p>
            </div>
            <div class="card-footer">
                <button class="btn btn-primary btn-sm view-field-btn">View Details</button>
            </div>
        </div>
    `;
    
    // Add to the list of fields
    document.getElementById('fieldCards').appendChild(card);
    
    // Add click event to view field button
    card.querySelector('.view-field-btn').addEventListener('click', function() {
        loadFieldData(fieldId, name);
    });
    
    showAlert('success', `Field "${name}" added successfully`);
}

// Load field data from API
function loadFieldData(fieldId, fieldName) {
    // Show the field data container
    const fieldDataContainer = document.getElementById('fieldDataContainer');
    fieldDataContainer.style.display = 'block';
    
    // Set the field name
    document.getElementById('selectedFieldName').textContent = fieldName;
    
    // Highlight the selected field card
    document.querySelectorAll('.card[data-field-id]').forEach(card => {
        if (card.dataset.fieldId == fieldId) {
            card.classList.add('border-primary');
        } else {
            card.classList.remove('border-primary');
        }
    });
    
    // Load weather data
    loadWeatherData(fieldId);
    
    // Load sensor data
    loadSensorData(fieldId);
    
    // Load disease map
    loadDiseaseMap(fieldId);
}

// Load weather data from API
function loadWeatherData(fieldId) {
    const weatherContainer = document.getElementById('weatherContainer');
    weatherContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading weather data...</p></div>';
    
    fetch(`/api/weather/${fieldId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch weather data');
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }
            
            const weather = data.weather;
            
            // Display weather data
            weatherContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-3">
                            <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" style="width: 64px; height: 64px;" alt="${weather.description}">
                            <div class="ms-3">
                                <h2 class="mb-0">${Math.round(weather.temp)}°C</h2>
                                <p class="mb-0 text-capitalize">${weather.description}</p>
                            </div>
                        </div>
                        <div class="row text-center">
                            <div class="col-6">
                                <div class="border rounded p-2">
                                    <i class="bi bi-droplet"></i> ${weather.humidity}% Humidity
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="border rounded p-2">
                                    <i class="bi bi-wind"></i> ${weather.wind_speed} km/h Wind
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h5>Location</h5>
                        <p>${data.location || data.field_name}</p>
                        <h5>Forecast</h5>
                        <div class="row">
                            ${renderForecast(weather.forecast)}
                        </div>
                    </div>
                </div>
            `;
            
            // Create weather chart
            createWeatherChart(weather.forecast);
        })
        .catch(error => {
            console.error("Error loading weather data:", error);
            weatherContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Weather data temporarily unavailable. Please try again later.
                </div>
            `;
        });
}

// Render forecast for weather display
function renderForecast(forecast) {
    if (!forecast || !Array.isArray(forecast) || forecast.length === 0) {
        return '<div class="col-12"><p class="text-muted">No forecast data available</p></div>';
    }
    
    // Only show up to 4 periods
    return forecast.slice(0, 4).map(period => {
        const date = new Date(period.time);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="col-3 text-center">
                <p class="mb-1">${time}</p>
                <img src="https://openweathermap.org/img/wn/${period.icon}.png" alt="Weather" style="width: 32px; height: 32px;">
                <p class="mb-0">${Math.round(period.temp)}°C</p>
            </div>
        `;
    }).join('');
}

// Create weather chart
function createWeatherChart(forecast) {
    if (!forecast || !Array.isArray(forecast) || forecast.length === 0) {
        return;
    }
    
    const ctx = document.getElementById('weatherChart').getContext('2d');
    
    // Clear any existing chart
    if (window.weatherChart) {
        try {
            window.weatherChart.destroy();
        } catch(e) {
            console.log("Error destroying old chart, creating new one anyway:", e);
        }
    }
    
    // Prepare data
    const labels = forecast.map(period => {
        const date = new Date(period.time);
        // Format as hour with AM/PM
        return date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    });
    
    const temperatures = forecast.map(period => period.temp);
    
    // Find temperature range to set axis limits
    const minTemp = Math.min(...temperatures) - 1;
    const maxTemp = Math.max(...temperatures) + 1;
    
    // Create chart
    window.weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: temperatures,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            // Format the date for tooltip
                            const date = new Date(forecast[tooltipItems[0].dataIndex].time);
                            return date.toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: minTemp,
                    suggestedMax: maxTemp,
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        font: {
                            size: 10
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '24-Hour Forecast',
                        font: {
                            size: 10
                        }
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 8,
                        font: {
                            size: 9
                        }
                    }
                }
            }
        }
    });
}

// Load sensor data from API
function loadSensorData(fieldId) {
    const sensorContainer = document.getElementById('sensorContainer');
    sensorContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading sensor data...</p></div>';
    
    fetch(`/api/sensors/${fieldId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch sensor data');
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }
            
            if (!data.sensors || data.sensors.length === 0) {
                sensorContainer.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> No sensors installed in this field yet.</div>';
                return;
            }
            
            // Display sensor data
            let html = `<div class="row">`;
            
            data.sensors.forEach(sensor => {
                html += `
                    <div class="col-md-3 mb-3">
                        <div class="card h-100 ${getSensorStatusClass(sensor.status)}">
                            <div class="card-body text-center">
                                <h5 class="mb-1">${sensor.name}</h5>
                                <div class="display-5 mb-2">${sensor.value} ${sensor.unit}</div>
                                <p class="text-muted mb-0 small">Updated: ${formatTimestamp(sensor.timestamp)}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
            sensorContainer.innerHTML = html;
        })
        .catch(error => {
            console.error("Error loading sensor data:", error);
            sensorContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Sensor data temporarily unavailable. Please try again later.
                </div>
            `;
        });
}

// Load disease map
function loadDiseaseMap(fieldId) {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary"></div><p class="mt-2">Loading map data...</p></div>';
    
    fetch(`/api/diseases/${fieldId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch disease data');
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }
            
            const detections = data.detections;
            
            if (!detections || detections.length === 0) {
                mapContainer.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> No disease detections recorded for this field.</div>';
                return;
            }
            
            // Check if maplibregl is available
            if (typeof maplibregl === 'undefined') {
                mapContainer.innerHTML = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle"></i> Map library not loaded. Please refresh the page.</div>';
                return;
            }
            
            mapContainer.innerHTML = '';
            
            try {
                // Get the first detection's coordinates or use default
                const firstDetection = detections[0];
                const centerLat = firstDetection?.latitude || 22.5726;
                const centerLng = firstDetection?.longitude || 88.3639;
                
                // Initialize map using the default style which doesn't require API calls
                const map = new maplibregl.Map({
                    container: mapContainer,
                    style: {
                        "version": 8,
                        "sources": {
                            "osm": {
                                "type": "raster",
                                "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                                "tileSize": 256,
                                "attribution": "© OpenStreetMap contributors"
                            }
                        },
                        "layers": [{
                            "id": "osm",
                            "type": "raster",
                            "source": "osm",
                            "minzoom": 0,
                            "maxzoom": 19
                        }]
                    },
                    center: [centerLng, centerLat],
                    zoom: 14
                });
                
                // Add navigation controls
                map.addControl(new maplibregl.NavigationControl());
                
                // Create array for coordinates to fit bounds
                const coordinates = [];
                
                // Add markers when map is loaded
                map.on('load', function() {
                    detections.forEach(detection => {
                        if (!detection.latitude || !detection.longitude) return;
                        
                        const latLng = [detection.longitude, detection.latitude];
                        coordinates.push(latLng);
                        
                        // Create marker element
                        const el = document.createElement('div');
                        el.style.width = '20px';
                        el.style.height = '20px';
                        el.style.borderRadius = '50%';
                        el.style.backgroundColor = getDiseaseStatusColor(detection.status);
                        el.style.border = '2px solid white';
                        el.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
                        
                        // Create popup
                        const popup = new maplibregl.Popup({ offset: 20 })
                            .setHTML(`
                                <div style="padding: 5px;">
                                    <strong>${formatDiseaseName(detection.disease_name)}</strong><br>
                                    Status: <span class="badge ${getDiseaseStatusClass(detection.status)}">${detection.status}</span><br>
                                    Confidence: ${(detection.confidence * 100).toFixed(1)}%<br>
                                    Detected: ${formatTimestamp(detection.detected_at)}
                                </div>
                            `);
                        
                        // Add marker
                        new maplibregl.Marker({ element: el })
                            .setLngLat(latLng)
                            .setPopup(popup)
                            .addTo(map);
                    });
                    
                    // Fit map to markers if more than one
                    if (coordinates.length > 1) {
                        try {
                            const bounds = coordinates.reduce((bounds, coord) => {
                                return bounds.extend(coord);
                            }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
                            
                            map.fitBounds(bounds, { padding: 50 });
                        } catch (error) {
                            console.error("Error fitting map bounds:", error);
                        }
                    }
                });
            } catch (error) {
                console.error("Error initializing map:", error);
                mapContainer.innerHTML = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle"></i> Error initializing map. Please refresh the page.</div>';
            }
        })
        .catch(error => {
            console.error("Error loading disease data:", error);
            mapContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Disease data temporarily unavailable. Please try again later.
                </div>
            `;
        });
}

// Helper function to format timestamps
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, { 
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper function to format disease names
function formatDiseaseName(name) {
    if (!name) return 'Unknown';
    
    // Remove underscores and double underscores
    return name
        .replace(/_+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Helper function to get sensor status class
function getSensorStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'warning': return 'border-warning';
        case 'danger': return 'border-danger';
        case 'good': return 'border-success';
        default: return '';
    }
}

// Helper function to get disease status color
function getDiseaseStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'detected': return '#dc3545'; // danger
        case 'monitoring': return '#ffc107'; // warning
        case 'treated': return '#0dcaf0'; // info
        case 'resolved': return '#198754'; // success
        default: return '#6c757d'; // secondary
    }
}

// Helper function to get disease status badge class
function getDiseaseStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'detected': return 'bg-danger';
        case 'monitoring': return 'bg-warning text-dark';
        case 'treated': return 'bg-info';
        case 'resolved': return 'bg-success';
        default: return 'bg-secondary';
    }
}

// Helper function to show alerts
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
} 