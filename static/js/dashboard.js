// Dashboard JavaScript - Handles API integrations and data display

// Main initialization function
function initializeDashboard() {
    // Load required external libraries first
    loadExternalLibraries().then(() => {
        // Load user's fields after libraries are loaded
        loadUserFields();
        
        // Set up event listeners for the fields
        document.addEventListener('click', function(e) {
            // Check if clicked element is a view field button
            if (e.target.closest('.view-field-btn')) {
                const fieldCard = e.target.closest('.card');
                const fieldId = fieldCard.dataset.fieldId;
                loadFieldData(fieldId);
            }
        });
        
        // Handle adding a new field
        document.getElementById('addFieldForm')?.addEventListener('submit', function(e) {
            e.preventDefault();
            addNewField();
        });
    
        // Handle save field button click
        document.getElementById('saveField')?.addEventListener('click', function() {
            document.getElementById('addFieldForm')?.dispatchEvent(new Event('submit'));
        });
        
        // Setup logout button handler
        document.getElementById('logoutBtn')?.addEventListener('click', function() {
            logout();
        });
    });
}

// Load all external libraries needed for the dashboard
function loadExternalLibraries() {
    const promises = [];
    
    // Load Chart.js if not already loaded
    if (typeof Chart === 'undefined') {
        const chartPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        promises.push(chartPromise);
    }
    
    // Load MapLibre GL if not already loaded
    if (typeof maplibregl === 'undefined') {
        const mapPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js';
            
            const mapStyle = document.createElement('link');
            mapStyle.rel = 'stylesheet';
            mapStyle.href = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css';
            document.head.appendChild(mapStyle);
            
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        promises.push(mapPromise);
    }
    
    return Promise.all(promises).catch(error => {
        console.error("Error loading libraries:", error);
        showAlert('warning', 'Failed to load some libraries. Some features may not work correctly.');
    });
}

// Function to load user's fields from backend
function loadUserFields() {
    const fieldsList = document.getElementById('fieldsList');
    if (!fieldsList) return;
    
    // Show loading state
    fieldsList.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading fields...</p></div>';
    
    // Get current user
    const user = firebase.auth().currentUser;
    if (!user) {
        fieldsList.innerHTML = '<div class="alert alert-warning">You need to be logged in to view your fields.</div>';
        return;
    }
    
    // For demo purposes, create mock fields
    const mockFields = [
        {
            id: 1,
            name: "Rice Field - North",
            location: "Kolkata, West Bengal",
            area: 5.2,
            createdAt: new Date().toISOString(),
            latitude: 22.5726,
            longitude: 88.3639
        },
        {
            id: 2,
            name: "Wheat Field - East",
            location: "Mumbai, Maharashtra",
            area: 3.7,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            latitude: 19.0760,
            longitude: 72.8777
        },
        {
            id: 3,
            name: "Vegetable Garden",
            location: "Delhi, NCR",
            area: 1.5,
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            latitude: 28.7041,
            longitude: 77.1025
        }
    ];
    
    // Create container for field cards
    fieldsList.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4';
    fieldsList.appendChild(row);
    
    // Add each field to UI
    mockFields.forEach((fieldData) => {
        const fieldCard = createFieldCard(fieldData.id, fieldData);
        row.appendChild(fieldCard);
    });
}

// Function to create a field card
function createFieldCard(fieldId, fieldData) {
    const colDiv = document.createElement('div');
    colDiv.className = 'col';
    
    colDiv.innerHTML = `
        <div class="card h-100" data-field-id="${fieldId}">
            <div class="card-body">
                <h5 class="card-title">${fieldData.name}</h5>
                <p class="card-text">
                    <i class="bi bi-geo-alt-fill"></i> ${fieldData.location || 'Location not set'}<br>
                    <i class="bi bi-rulers"></i> ${fieldData.area || 0} hectares
                </p>
            </div>
            <div class="card-footer">
                <div class="d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary view-field-btn">
                        <i class="bi bi-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-field-btn">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for delete button
    colDiv.querySelector('.delete-field-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${fieldData.name}"?`)) {
            deleteField(fieldId);
        }
    });
    
    return colDiv;
}

// Function to add a new field
function addNewField() {
    const fieldName = document.getElementById('fieldName').value;
    const fieldLocation = document.getElementById('fieldLocation').value;
    const fieldArea = document.getElementById('fieldArea').value;
    
    if (!fieldName || !fieldLocation || !fieldArea) {
        showAlert('warning', 'Please fill in all field details');
        return;
    }
    
    const user = firebase.auth().currentUser;
    if (!user) {
        showAlert('danger', 'You must be logged in to add a field');
        return;
    }
    
    // Create a new field with geocoded data (for demo, using predefined coordinates)
    let coordinates;
    if (fieldLocation.toLowerCase().includes('kolkata')) {
        coordinates = { lat: 22.5726, lng: 88.3639 };
    } else if (fieldLocation.toLowerCase().includes('mumbai')) {
        coordinates = { lat: 19.0760, lng: 72.8777 };
    } else if (fieldLocation.toLowerCase().includes('delhi')) {
        coordinates = { lat: 28.7041, lng: 77.1025 };
    } else {
        // Default to a random location in India
        coordinates = { 
            lat: 20.5937 + (Math.random() - 0.5) * 2,
            lng: 78.9629 + (Math.random() - 0.5) * 2
        };
    }
    
    const fieldData = {
        name: fieldName,
        location: fieldLocation,
        area: parseFloat(fieldArea),
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        createdAt: new Date().toISOString()
    };
    
    // For demo purposes, just simulate a successful save
    setTimeout(() => {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addFieldModal'));
        modal.hide();
        
        // Reset form
        document.getElementById('addFieldForm').reset();
        
        // Show success message
        showAlert('success', `Field "${fieldName}" added successfully`);
        
        // Reload fields (would come from backend in the real app)
        loadUserFields();
    }, 1000);
}

// Function to delete a field
function deleteField(fieldId) {
    // For demo purposes, just simulate a successful delete
    setTimeout(() => {
        showAlert('success', 'Field deleted successfully');
        loadUserFields();
    }, 1000);
}

// Function to load field data when a field is selected
function loadFieldData(fieldId) {
    // Ensure fieldId is valid
    if (!fieldId) {
        showAlert('danger', 'Invalid field selected');
        return;
    }
    
    // Update UI to show we're working with this field
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('border-primary');
    });
    document.querySelector(`.card[data-field-id="${fieldId}"]`)?.classList.add('border-primary');
    
    // Show active field name in the sections
    const fieldName = document.querySelector(`.card[data-field-id="${fieldId}"] .card-title`)?.textContent || 'Selected Field';
    document.querySelectorAll('.selected-field-name').forEach(el => {
        el.textContent = fieldName;
    });
    
    // Make the weather and related sections visible first
    document.getElementById('weatherSection')?.classList.remove('d-none');
    document.getElementById('sensorDataSection')?.classList.remove('d-none');
    document.getElementById('diseaseTrackingSection')?.classList.remove('d-none');
    
    // Now load data for each section
    loadWeatherData(fieldId);
    loadSensorData(fieldId);
    loadDiseaseData(fieldId);
    
    // Store the active field ID
    localStorage.setItem('activeFieldId', fieldId);
}

// Function to load weather data with charts
function loadWeatherData(fieldId) {
    const weatherContainer = document.getElementById('weatherContainer');
    if (!weatherContainer) return;
    
    // Show loading state
    weatherContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p>Loading weather data...</p></div>';
    
    // Fetch weather data from our API
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
            
            // Display weather data
            const weather = data.weather;
            
            // Create the HTML structure
            weatherContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-5">
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="mb-1">${data.location || data.field_name}</h5>
                                <p class="text-muted mb-3">${new Date().toLocaleDateString()}</p>
                                <div class="d-flex align-items-center mb-3">
                                    <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.description}" style="width: 64px; height: 64px;">
                                    <div>
                                        <h2 class="mb-0">${Math.round(weather.temp)}°C</h2>
                                        <p class="mb-0 text-capitalize">${weather.description}</p>
                                    </div>
                                </div>
                                <div class="row row-cols-2 g-2 text-center">
                                    <div class="col">
                                        <div class="p-2 border rounded">
                                            <i class="bi bi-droplet-fill text-primary"></i>
                                            <p class="mb-0">${weather.humidity}% Humidity</p>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <div class="p-2 border rounded">
                                            <i class="bi bi-wind text-info"></i>
                                            <p class="mb-0">${weather.wind_speed} km/h Wind</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-7">
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="mb-3">Forecast</h5>
                                <div id="forecastContainer" class="row row-cols-2 row-cols-lg-4 g-2">
                                    ${renderForecast(weather.forecast)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="mb-3">Temperature & Humidity Forecast</h5>
                                <canvas id="weatherChart" style="width:100%; height:300px;"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize weather chart
            createWeatherChart(weather.forecast);
        })
        .catch(error => {
            console.error("Error loading weather data:", error);
            weatherContainer.innerHTML = `<div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Weather data temporarily unavailable. Please try again later.
            </div>`;
        });
}

// Function to render forecast cards
function renderForecast(forecast) {
    if (!forecast || !Array.isArray(forecast) || forecast.length === 0) {
        return `<div class="col-12"><p class="text-muted">No forecast data available</p></div>`;
    }
    
    // Only show up to 4 forecast periods
    const forecastItems = forecast.slice(0, 4);
    
    return forecastItems.map(item => {
        const date = new Date(item.time);
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="col">
                <div class="card h-100 text-center">
                    <div class="card-body p-2">
                        <div class="small text-muted">${formattedTime}</div>
                        <img src="https://openweathermap.org/img/wn/${item.icon}.png" alt="Weather" class="my-2" style="width: 40px; height: 40px;">
                        <div class="fw-bold">${Math.round(item.temp)}°C</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Function to create weather chart
function createWeatherChart(forecast) {
    if (!forecast || !Array.isArray(forecast) || forecast.length === 0) {
        console.warn("No forecast data available for chart");
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error("Chart.js library not loaded");
        return;
    }
    
    const ctx = document.getElementById('weatherChart');
    if (!ctx) return;
    
    // Clear any existing chart
    if (window.weatherChart) {
        window.weatherChart.destroy();
    }
    
    // Prepare data for chart
    const labels = forecast.map(item => {
        const date = new Date(item.time);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    const temperatures = forecast.map(item => Math.round(item.temp));
    
    // Create chart
    window.weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Function to load sensor data from API
function loadSensorData(fieldId) {
    const sensorContainer = document.getElementById('sensorContainer');
    if (!sensorContainer) return;
    
    // Show loading state
    sensorContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p>Loading sensor data...</p></div>';
    
    // Fetch sensor data from our API
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
            
            // Display sensor data
            if (!data.sensors || data.sensors.length === 0) {
                sensorContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        No sensor data available for this field
                    </div>
                    <div class="card">
                        <div class="card-body text-center">
                            <h5 class="mb-3">No Sensors Detected</h5>
                            <p>You haven't added any sensors to this field yet.</p>
                            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addSensorModal">
                                <i class="bi bi-plus-circle me-2"></i>Add Sensor
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Create HTML for sensor readings
            let sensorHtml = `
                <div class="alert alert-${data.health_status?.color || 'info'}">
                    <i class="bi bi-${data.health_status?.icon || 'info-circle-fill'} me-2"></i>
                    Field Health: <strong>${data.health_status?.label || 'Unknown'}</strong>
                </div>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
            `;
            
            data.sensors.forEach(sensor => {
                sensorHtml += `
                    <div class="col">
                        <div class="card h-100 ${getStatusClass(sensor.status)}">
                            <div class="card-body">
                                <h5 class="card-title">${sensor.name}</h5>
                                <div class="sensor-value">
                                    <span class="value">${sensor.value}</span>
                                    <span class="unit">${sensor.unit}</span>
                                </div>
                                <p class="card-text text-muted">
                                    <small>Last updated: ${formatTimestamp(sensor.timestamp)}</small>
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            sensorHtml += `
                </div>
                <div class="text-end mt-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadSensorData('${fieldId}')">
                        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
                    </button>
                </div>
            `;
            
            sensorContainer.innerHTML = sensorHtml;
        })
        .catch(error => {
            console.error("Error loading sensor data:", error);
            sensorContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Could not load sensor data: ${error.message}
                    <button type="button" class="btn btn-sm btn-outline-secondary ms-3" onclick="loadSensorData('${fieldId}')">Retry</button>
                </div>
            `;
        });
}

// Function to load disease tracking data
function loadDiseaseData(fieldId) {
    const diseaseContainer = document.getElementById('diseaseContainer');
    const diseaseMap = document.getElementById('diseaseMap');
    
    if (!diseaseContainer || !diseaseMap) return;
    
    // Show loading states
    diseaseContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p>Loading disease data...</p></div>';
    diseaseMap.innerHTML = '<div class="text-center py-5"><i class="bi bi-map" style="font-size: 3rem; color: #ccc;"></i><p class="mt-2 text-muted">Map loading...</p></div>';
    
    // Fetch disease data from our API
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
            const stats = data.stats;
            
            // Display disease statistics
            diseaseContainer.innerHTML = `
                <div class="row mb-3">
                    <div class="col-12">
                        <h6>Disease Summary</h6>
                        <div class="row row-cols-2 row-cols-md-4 g-2 text-center">
                            <div class="col">
                                <div class="card bg-light">
                                    <div class="card-body p-2">
                                        <h3 class="mb-0">${stats.total}</h3>
                                        <small class="text-muted">Total</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col">
                                <div class="card bg-warning bg-opacity-10">
                                    <div class="card-body p-2">
                                        <h3 class="mb-0">${stats.active}</h3>
                                        <small class="text-muted">Active</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col">
                                <div class="card bg-info bg-opacity-10">
                                    <div class="card-body p-2">
                                        <h3 class="mb-0">${stats.treated}</h3>
                                        <small class="text-muted">Treated</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col">
                                <div class="card bg-success bg-opacity-10">
                                    <div class="card-body p-2">
                                        <h3 class="mb-0">${stats.resolved}</h3>
                                        <small class="text-muted">Resolved</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0">Recent Detections</h6>
                            <button class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-upload"></i> Upload Image
                            </button>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th>Disease</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Confidence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${detections.length > 0 ? 
                                        detections.map(d => `
                                            <tr>
                                                <td>${formatDiseaseName(d.disease_name)}</td>
                                                <td><span class="badge ${getStatusBadgeClass(d.status)}">${d.status}</span></td>
                                                <td>${formatTimestamp(d.detected_at)}</td>
                                                <td>${(d.confidence * 100).toFixed(1)}%</td>
                                            </tr>
                                        `).join('') : 
                                        '<tr><td colspan="4" class="text-center">No disease detections yet</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize disease map
            displayDiseaseMap(fieldId, detections, diseaseMap);
        })
        .catch(error => {
            console.error("Error loading disease data:", error);
            diseaseContainer.innerHTML = `<div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Disease data temporarily unavailable. Please try again later.
            </div>`;
            
            diseaseMap.innerHTML = `<div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Map data unavailable. Please try again later.
            </div>`;
        });
}

// Function to display disease map
function displayDiseaseMap(fieldId, detections, container) {
    // Check if we have a valid container and detections
    if (!container || !detections || detections.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No disease detections found for this field.
            </div>
        `;
        return;
    }
    
    // Create map container with a unique ID to avoid conflicts
    const mapId = `map-container-${fieldId}`;
    container.innerHTML = `<div id="${mapId}" style="width: 100%; height: 400px; border-radius: 6px;"></div>`;
    
    // Determine center coordinates - use first detection or default to Kolkata
    const firstDetection = detections[0];
    const centerLat = firstDetection?.latitude || 22.5726;
    const centerLng = firstDetection?.longitude || 88.3639;
    
    try {
        const mapContainer = document.getElementById(mapId);
        
        // Fetch API key from the server
        fetch('/api/config/geoapify')
            .then(response => response.json())
            .then(data => {
                const apiKey = data.apiKey;
                
                const map = new maplibregl.Map({
                    container: mapId,
                    style: `https://maps.geoapify.com/v1/styles/osm-carto/style.json?apiKey=${apiKey}`,
                    center: [centerLng, centerLat],
                    zoom: 14
                });
                
                // Add navigation controls
                map.addControl(new maplibregl.NavigationControl());
                
                // Create an array of LngLatLike coordinates for all detections
                const coordinates = [];
                
                // Add markers for each detection
                map.on('load', function() {
                    detections.forEach(detection => {
                        // Skip if no coordinates
                        if (!detection.latitude || !detection.longitude) return;
                        
                        const markerColor = getMarkerColor(detection.status);
                        const latLng = [detection.longitude, detection.latitude];
                        coordinates.push(latLng);
                        
                        // Create marker element
                        const el = document.createElement('div');
                        el.className = 'marker';
                        el.style.width = '25px';
                        el.style.height = '25px';
                        el.style.borderRadius = '50%';
                        el.style.backgroundColor = markerColor;
                        el.style.border = '2px solid white';
                        el.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
                        
                        // Add popup with detection info
                        const popup = new maplibregl.Popup({ offset: 25 })
                            .setHTML(`
                                <div style="padding: 8px;">
                                    <h6 style="margin-bottom: 8px;">${formatDiseaseName(detection.disease_name)}</h6>
                                    <div style="margin-bottom: 5px;">
                                        <span style="font-weight: bold;">Status:</span> 
                                        <span class="badge ${getStatusBadgeClass(detection.status)}">${detection.status}</span>
                                    </div>
                                    <div style="margin-bottom: 5px;">
                                        <span style="font-weight: bold;">Confidence:</span> 
                                        ${(detection.confidence * 100).toFixed(1)}%
                                    </div>
                                    <div style="margin-bottom: 5px; font-size: 0.8rem; color: #666;">
                                        ${formatTimestamp(detection.detected_at)}
                                    </div>
                                </div>
                            `);
                        
                        // Add marker to map
                        new maplibregl.Marker({ element: el })
                            .setLngLat(latLng)
                            .setPopup(popup)
                            .addTo(map);
                    });
                    
                    // If we have multiple coordinates, fit bounds to include all markers
                    if (coordinates.length > 1) {
                        try {
                            // Create a 'LngLatBounds' with all coordinates
                            const bounds = coordinates.reduce(function(bounds, coord) {
                                return bounds.extend(coord);
                            }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
                            
                            // Fit the map to the bounds
                            map.fitBounds(bounds, {
                                padding: 60,
                                maxZoom: 15
                            });
                        } catch (error) {
                            console.error("Error fitting map bounds:", error);
                        }
                    }
                });
                
                // Handle map loading errors
                map.on('error', function(e) {
                    console.error("Map error:", e.error);
                    container.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle"></i> 
                            Error loading map. Please refresh and try again.
                        </div>
                    `;
                });
            })
            .catch(error => {
                console.error("Error fetching API key:", error);
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i> 
                        Error fetching map API key. Please refresh and try again.
                    </div>
                `;
            });
    } catch (error) {
        console.error("Error initializing map:", error);
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> 
                Error initializing map. Please refresh and try again.
            </div>
        `;
    }
}

// Helper function to get marker color based on disease status
function getMarkerColor(status) {
    switch (status?.toLowerCase()) {
        case 'detected':
            return '#dc3545'; // danger
        case 'monitoring':
            return '#ffc107'; // warning
        case 'treated':
            return '#0dcaf0'; // info
        case 'resolved':
            return '#198754'; // success
        default:
            return '#6c757d'; // secondary
    }
}

// Helper function to get CSS class based on sensor status
function getStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'warning':
            return 'border-warning';
        case 'danger':
            return 'border-danger';
        case 'good':
            return 'border-success';
        default:
            return '';
    }
}

// Helper function to get badge class based on disease status
function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
        case 'detected':
            return 'bg-danger';
        case 'monitoring':
            return 'bg-warning text-dark';
        case 'treated':
            return 'bg-info';
        case 'resolved':
            return 'bg-success';
        default:
            return 'bg-secondary';
    }
}

// Helper function to format disease name for display
function formatDiseaseName(name) {
    if (!name) return 'Unknown';
    
    // Replace underscores with spaces
    let formatted = name.replace(/_/g, ' ');
    
    // Split by doubled words (like Apple___Scab) and keep the last part
    if (formatted.includes('  ')) {
        const parts = formatted.split('  ');
        formatted = parts[parts.length - 1];
    }
    
    return formatted;
}

// Helper function to format timestamps
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper function to show alerts
function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Function to handle logout
function logout() {
    firebase.auth().signOut()
        .then(() => {
            // Sign-out successful
            showAlert('success', 'Logged out successfully!');
            // Redirect to home page after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        })
        .catch((error) => {
            // An error happened
            console.error('Logout error:', error);
            showAlert('danger', 'Failed to log out. Please try again.');
        });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard page loaded - checking auth state");
    
    // Handle Firebase onAuthStateChanged
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("User is authenticated, initializing dashboard");
            
            // Update user display name
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = user.displayName || user.email || 'User';
            }
            
            // Initialize dashboard components
            initializeDashboard();
            
            // Check if we have a previously selected field
            const activeFieldId = localStorage.getItem('activeFieldId');
            if (activeFieldId) {
                // Wait a bit for the fields to load
                setTimeout(() => {
                    console.log("Loading previously selected field:", activeFieldId);
                    loadFieldData(activeFieldId);
                }, 1000);
            }
        } else {
            console.log("User is not authenticated, continuing as guest");
            // User is not authenticated, but still allow access to dashboard
            
            // Update user display name
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = 'Guest User';
            }
            
            // Initialize dashboard components
            initializeDashboard();
        }
    });
    
    // Set up global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
        showAlert('danger', 'An error occurred. Please refresh the page and try again.');
    });
}); 