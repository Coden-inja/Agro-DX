// Test script for location and weather functionality

document.addEventListener('DOMContentLoaded', () => {
    console.log('Testing location and weather functionality');
    
    // Create test container if we're not on the result page
    if (!document.querySelector('.result-container')) {
        const testContainer = document.createElement('div');
        testContainer.className = 'container mt-4';
        testContainer.innerHTML = `
            <h2>Location and Weather Test</h2>
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header">Location Test</div>
                        <div class="card-body">
                            <div id="location-status">Waiting for location...</div>
                            <div class="mt-3">
                                <button id="get-location-btn" class="btn btn-primary">Get My Location</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header">Weather Test</div>
                        <div class="card-body">
                            <div id="weather-status">Waiting for location...</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">Disease Analysis Test</div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="test-disease" class="form-label">Test Disease</label>
                                <select class="form-select" id="test-disease">
                                    <option value="">Select a disease...</option>
                                    <option value="Apple Scab">Apple Scab</option>
                                    <option value="Apple Black Rot">Apple Black Rot</option>
                                    <option value="Cedar Apple Rust">Cedar Apple Rust</option>
                                    <option value="Root Rot">Root Rot</option>
                                    <option value="Powdery Mildew">Powdery Mildew</option>
                                    <option value="Cercospora Leaf Spot">Cercospora Leaf Spot</option>
                                    <option value="Common Rust">Common Rust</option>
                                </select>
                            </div>
                            <button id="analyze-btn" class="btn btn-primary" disabled>Analyze Disease Conditions</button>
                            <div id="weather-analysis" class="mt-3"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(testContainer);
        
        // Add event listeners
        document.getElementById('get-location-btn').addEventListener('click', testGetLocation);
        document.getElementById('analyze-btn').addEventListener('click', testAnalyzeDisease);
        
        // Enable/disable analyze button based on disease selection
        document.getElementById('test-disease').addEventListener('change', function() {
            document.getElementById('analyze-btn').disabled = !this.value;
        });
    }
});

// Test function for getting location
function testGetLocation() {
    const locationStatusDiv = document.getElementById('location-status');
    locationStatusDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Getting your location...</p>';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Success callback
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                userLocationData = { latitude, longitude };
                
                locationStatusDiv.innerHTML = `
                    <p><i class="fas fa-map-marker-alt"></i> Location detected:</p>
                    <p>Latitude: ${latitude.toFixed(6)}</p>
                    <p>Longitude: ${longitude.toFixed(6)}</p>
                `;
                
                // Enable the analyze button if disease is selected
                if (document.getElementById('test-disease').value) {
                    document.getElementById('analyze-btn').disabled = false;
                }
                
                // Fetch weather data
                testFetchWeather(latitude, longitude);
            },
            (error) => {
                // Error callback
                console.error("Error getting location:", error);
                let errorMsg = "";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMsg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMsg = "An unknown error occurred.";
                        break;
                }
                
                locationStatusDiv.innerHTML = `
                    <p><i class="fas fa-exclamation-triangle"></i> Error: ${errorMsg}</p>
                    <div class="manual-location-input mt-2">
                        <div class="input-group mb-2">
                            <span class="input-group-text">Latitude</span>
                            <input type="text" id="latitude" class="form-control" placeholder="e.g., 30.5089">
                        </div>
                        <div class="input-group mb-2">
                            <span class="input-group-text">Longitude</span>
                            <input type="text" id="longitude" class="form-control" placeholder="e.g., 77.0960">
                        </div>
                        <button class="btn btn-primary" id="submit-manual-location">Submit</button>
                    </div>`;
                
                // Add event listener for manual location submission
                document.getElementById('submit-manual-location').addEventListener('click', function() {
                    const latitude = parseFloat(document.getElementById('latitude').value);
                    const longitude = parseFloat(document.getElementById('longitude').value);
                    
                    if (isNaN(latitude) || isNaN(longitude)) {
                        alert('Please enter valid latitude and longitude values.');
                        return;
                    }
                    
                    userLocationData = { latitude, longitude };
                    locationStatusDiv.innerHTML = `
                        <p><i class="fas fa-map-marker-alt"></i> Using manual location:</p>
                        <p>Latitude: ${latitude.toFixed(6)}</p>
                        <p>Longitude: ${longitude.toFixed(6)}</p>
                    `;
                    
                    // Enable the analyze button if disease is selected
                    if (document.getElementById('test-disease').value) {
                        document.getElementById('analyze-btn').disabled = false;
                    }
                    
                    // Fetch weather data
                    testFetchWeather(latitude, longitude);
                });
            }
        );
    } else {
        locationStatusDiv.innerHTML = "<p>Geolocation is not supported by this browser.</p>";
    }
}

// Test function for fetching weather data
function testFetchWeather(latitude, longitude) {
    const weatherStatusDiv = document.getElementById('weather-status');
    weatherStatusDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Fetching weather data...</p>';
    
    fetch(`/api/weather-data?lat=${latitude}&lon=${longitude}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Store weather data globally
            weatherData = data;
            
            // Display weather data
            weatherStatusDiv.innerHTML = `
                <h5>Weather Data:</h5>
                <p><strong>Temperature:</strong> ${data.current.temperature_2m}°C</p>
                <p><strong>Humidity:</strong> ${data.current.relative_humidity_2m}%</p>
                <p><strong>Weather:</strong> ${getWeatherDescription(data.current.weathercode)}</p>
                <p><strong>Wind Speed:</strong> ${data.current.windspeed_10m} km/h</p>
                <div class="mt-3">
                    <details>
                        <summary>View Raw Response</summary>
                        <pre class="bg-light p-2 mt-2" style="max-height: 200px; overflow: auto;">${JSON.stringify(data, null, 2)}</pre>
                    </details>
                </div>
            `;
        })
        .catch(error => {
            console.error("Error fetching weather data:", error);
            weatherStatusDiv.innerHTML = `
                <p><i class="fas fa-exclamation-triangle"></i> Error fetching weather data:</p>
                <p>${error.message}</p>
            `;
        });
}

// Test function for analyzing disease conditions
function testAnalyzeDisease() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const analysisDiv = document.getElementById('weather-analysis');
    const diseaseName = document.getElementById('test-disease').value;
    
    if (!diseaseName) {
        alert('Please select a disease first.');
        return;
    }
    
    if (!weatherData || !userLocationData) {
        alert('Weather data or location not available. Please try again.');
        return;
    }
    
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    analysisDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Analyzing disease conditions...</p>';
    
    // Simulate the disease analysis
    const disease = diseaseData[diseaseName];
    if (!disease) {
        analysisDiv.innerHTML = `<p>Disease "${diseaseName}" not found in database.</p>`;
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = 'Analyze Disease Conditions';
        return;
    }
    
    // Get current weather conditions
    const currentHumidity = weatherData.current.relative_humidity_2m;
    
    // Calculate 7-day rainfall sum
    let totalRainfall = 0;
    if (weatherData.hourly && weatherData.hourly.precipitation) {
        const last7Days = weatherData.hourly.precipitation.slice(-168); // Last 7 days (24*7=168 hours)
        totalRainfall = last7Days.reduce((sum, val) => sum + val, 0);
    }
    
    // Estimate soil moisture
    const soilMoistureEstimate = getSoilMoistureEstimate(currentHumidity, totalRainfall);
    
    // Check if conditions match disease requirements
    const humidityMatch = checkHumidityMatch(currentHumidity, disease.humidity);
    const rainfallMatch = checkRainfallMatch(totalRainfall, disease.rainfall);
    const soilMoistureMatch = checkSoilMoistureMatch(soilMoistureEstimate, disease.soilMoisture);
    
    // Calculate overall match score (0-100)
    const matchScore = calculateMatchScore(humidityMatch, rainfallMatch, soilMoistureMatch);
    
    // Generate analysis HTML
    const analysisHtml = `
        <div class="weather-disease-analysis p-3 bg-light rounded mt-3">
            <h5><i class="fas fa-microscope"></i> Disease Condition Analysis for ${diseaseName}</h5>
            <p>Based on your location's weather conditions:</p>
            <div class="progress mb-3">
                <div class="progress-bar ${getProgressBarColor(matchScore)}" role="progressbar" 
                    style="width: ${matchScore}%" aria-valuenow="${matchScore}" aria-valuemin="0" aria-valuemax="100">
                    ${matchScore}% Match
                </div>
            </div>
            <ul class="condition-list">
                <li class="${humidityMatch ? 'text-success' : 'text-danger'}">
                    <i class="fas ${humidityMatch ? 'fa-check' : 'fa-times'}"></i>
                    Humidity: Current ${currentHumidity}% / Expected ${disease.humidity}
                </li>
                <li class="${rainfallMatch ? 'text-success' : 'text-danger'}">
                    <i class="fas ${rainfallMatch ? 'fa-check' : 'fa-times'}"></i>
                    Rainfall: Last 7 days ${totalRainfall.toFixed(1)} mm / Expected ${disease.rainfall}
                </li>
                <li class="${soilMoistureMatch ? 'text-success' : 'text-danger'}">
                    <i class="fas ${soilMoistureMatch ? 'fa-check' : 'fa-times'}"></i>
                    Soil Moisture: Estimated ${soilMoistureEstimate} / Expected ${disease.soilMoisture}
                </li>
                <li>
                    <i class="fas fa-info-circle"></i>
                    Typical Soil Type: ${disease.soilType}
                </li>
            </ul>
            
            ${matchScore < 50 ? `
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Note:</strong> The current weather conditions don't strongly match the typical conditions for this disease.
                    The disease might be caused by other factors like fertilizers, pesticides, or soil issues.
                </div>
                
                <div class="fertilizer-test-section mt-3">
                    <h6><i class="fas fa-flask"></i> Test Further Analysis</h6>
                    <button id="test-fertilizer-btn" class="btn btn-sm btn-outline-primary mt-2">Test Fertilizer Analysis</button>
                </div>
            ` : `
                <div class="alert alert-success mt-3">
                    <i class="fas fa-check-circle"></i>
                    <strong>Strong match:</strong> The current weather conditions strongly match the typical conditions for this disease.
                    Weather appears to be the primary factor in this disease occurrence.
                </div>
            `}
        </div>`;
    
    analysisDiv.innerHTML = analysisHtml;
    
    // Add event listener for fertilizer test button
    if (matchScore < 50) {
        document.getElementById('test-fertilizer-btn').addEventListener('click', testFertilizerAnalysis);
    }
    
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = 'Analyze Disease Conditions';
}

// Test function for fertilizer analysis
function testFertilizerAnalysis() {
    const analysisDiv = document.getElementById('weather-analysis');
    const diseaseName = document.getElementById('test-disease').value;
    
    if (!diseaseName || !weatherData || !userLocationData) {
        alert('Missing required data. Please try again.');
        return;
    }
    
    // Create mock data for analysis
    const analysisData = {
        disease: diseaseName,
        location: userLocationData,
        weather: {
            humidity: weatherData.current.relative_humidity_2m,
            rainfall: calculateTotalRainfall(),
            temperature: weatherData.current.temperature_2m
        },
        fertilizer: "NPK 10-10-10",
        soil_type: "Alluvial",
        pesticide: "Neem oil",
        watering: "Every 2-3 days"
    };
    
    // Show loading state
    analysisDiv.innerHTML += `
        <div class="test-fertilizer-result mt-3">
            <p><i class="fas fa-spinner fa-spin"></i> Testing fertilizer analysis API...</p>
        </div>`;
    
    // Send test request to API
    fetch('/api/analyze-disease-factors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Display the API response
        const resultElement = document.querySelector('.test-fertilizer-result');
        if (resultElement) {
            resultElement.innerHTML = `
                <div class="detailed-analysis p-3 bg-light rounded mb-3">
                    <h5><i class="fas fa-chart-pie"></i> Detailed Analysis Results</h5>
                    <div class="analysis-result">
                        ${data.analysis}
                    </div>
                    
                    <div class="prevention-advice mt-3">
                        <h6><i class="fas fa-shield-alt"></i> Prevention Advice</h6>
                        <div>${data.prevention}</div>
                    </div>
                    
                    <div class="mt-3">
                        <details>
                            <summary>View Raw Response</summary>
                            <pre class="bg-light p-2 mt-2" style="max-height: 200px; overflow: auto;">${JSON.stringify(data, null, 2)}</pre>
                        </details>
                    </div>
                </div>`;
        }
    })
    .catch(error => {
        console.error("Error submitting analysis data:", error);
        const resultElement = document.querySelector('.test-fertilizer-result');
        if (resultElement) {
            resultElement.innerHTML = `
                <div class="alert alert-danger">
                    <p><i class="fas fa-exclamation-triangle"></i> Error testing API:</p>
                    <p>${error.message}</p>
                </div>`;
        }
    });
}

// Helper function to get weather description from code
function getWeatherDescription(code) {
    const weatherCodes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow fall",
        73: "Moderate snow fall",
        75: "Heavy snow fall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };
    
    return weatherCodes[code] || "Unknown";
} 