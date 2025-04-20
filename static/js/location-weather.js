// JavaScript to handle location detection, weather data fetching, and disease correlation

// Store fetched weather data
let weatherData = null;
let userLocationData = null;

// Disease data from the provided table
const diseaseData = {
    "Apple Scab": {
        plant: "Apple",
        humidity: 95,
        soilMoisture: "High",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Mountain soils (well-drained, loamy)"
    },
    "Apple Black Rot": {
        plant: "Apple",
        humidity: "High",
        soilMoisture: "Moderate to high",
        rainfall: "Moderate to heavy rainfall (15.6-115.5 mm)",
        soilType: "Mountain soils with moderate organic content"
    },
    "Cedar Apple Rust": {
        plant: "Apple", 
        humidity: "High",
        soilMoisture: "Moist conditions",
        rainfall: "Light to moderate rainfall (2.5-64.4 mm)",
        soilType: "Well-drained mountain soils"
    },
    "Root Rot": {
        plant: "Blueberry",
        humidity: "High",
        soilMoisture: "High",
        rainfall: "Heavy rainfall (>64.5 mm)",
        soilType: "Lateritic soils"
    },
    "Powdery Mildew": {
        plant: "Cherry",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Mountain soils"
    },
    "Cercospora Leaf Spot": {
        plant: "Corn (Maize)",
        humidity: "High",
        soilMoisture: "High",
        rainfall: "Moderate to heavy rainfall (15.6-115.5 mm)",
        soilType: "Black cotton soils"
    },
    "Common Rust": {
        plant: "Corn (Maize)",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Alluvial soils"
    },
    "Northern Leaf Blight": {
        plant: "Corn (Maize)",
        humidity: "High",
        soilMoisture: "High",
        rainfall: "Moderate to heavy rainfall (15.6-115.5 mm)",
        soilType: "Red loamy soils"
    },
    "Black Rot": {
        plant: "Grape",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Black cotton soils"
    },
    "Esca (Black Measles)": {
        plant: "Grape",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Black cotton soils"
    },
    "Leaf Blight": {
        plant: "Grape",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Red loamy soils"
    },
    "Huanglongbing (Citrus Greening)": {
        plant: "Orange",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Black cotton soils"
    },
    "Bacterial Spot": {
        plant: "Peach",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Mountain soils"
    },
    "Early Blight": {
        plant: "Potato",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Red loamy soils"
    },
    "Late Blight": {
        plant: "Potato",
        humidity: "High",
        soilMoisture: "High",
        rainfall: "Heavy rainfall (>64.5 mm)",
        soilType: "Mountain soils"
    },
    "Alternaria Leaf Spot": {
        plant: "Soybean",
        humidity: "74.1-83.7%",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Black cotton soils"
    },
    "Leaf Scorch": {
        plant: "Strawberry",
        humidity: "High",
        soilMoisture: "Moderate",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Mountain soils"
    },
    "Leaf Mold": {
        plant: "Tomato",
        humidity: "High",
        soilMoisture: "High",
        rainfall: "Moderate rainfall (15.6-64.4 mm)",
        soilType: "Red loamy soils"
    }
};

// Initialize location and weather data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the result page
    if (document.querySelector('.result-container')) {
        // Get user's location
        getUserLocation();
    }
});

// Function to get user's location
function getUserLocation() {
    const locationStatusDiv = document.getElementById('location-status') || createStatusDiv();
    
    locationStatusDiv.innerHTML = '<p><i class="fas fa-map-marker-alt"></i> Getting your location...</p>';
    
    if (navigator.geolocation) {
        // Add geolocation options for better reliability
        const geoOptions = {
            enableHighAccuracy: true,  // Request high accuracy (may be slower)
            timeout: 10000,           // Wait up to 10 seconds for a response
            maximumAge: 0             // Don't use cached position
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Success callback
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                userLocationData = { latitude, longitude };
                
                console.log("Location detected:", latitude, longitude);
                locationStatusDiv.innerHTML = `<p><i class="fas fa-map-marker-alt"></i> Location detected: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>`;
                
                // Fetch weather data based on location
                fetchWeatherData(latitude, longitude);
            },
            (error) => {
                // Error callback with more specific error messages
                console.error("Error getting location:", error);
                
                let errorMessage = "Couldn't get your location automatically.";
                if (error.code === 1) {
                    errorMessage = "Location access was denied. Please allow location access or enter coordinates manually.";
                } else if (error.code === 2) {
                    errorMessage = "Your location couldn't be determined. Please check your device settings or enter coordinates manually.";
                } else if (error.code === 3) {
                    errorMessage = "Location request timed out. Please try again or enter coordinates manually.";
                }
                
                locationStatusDiv.innerHTML = `
                    <p><i class="fas fa-exclamation-triangle"></i> ${errorMessage}</p>
                    <div class="manual-location-input mt-2">
                        <div class="input-group">
                            <input type="text" id="latitude" class="form-control" placeholder="Latitude (e.g., 22.5726)">
                            <input type="text" id="longitude" class="form-control" placeholder="Longitude (e.g., 88.3639)">
                            <button class="btn btn-primary" id="submit-location">Submit</button>
                        </div>
                        <div class="mt-1 small text-muted">Try using coordinates for Kolkata: 22.5726, 88.3639</div>
                    </div>`;
                
                // Add event listener for manual location submission
                document.getElementById('submit-location').addEventListener('click', submitManualLocation);
            },
            geoOptions  // Pass the options to getCurrentPosition
        );
    } else {
        locationStatusDiv.innerHTML = `
            <p><i class="fas fa-exclamation-triangle"></i> Geolocation is not supported by this browser.</p>
            <div class="manual-location-input mt-2">
                <div class="input-group">
                    <input type="text" id="latitude" class="form-control" placeholder="Latitude (e.g., 22.5726)">
                    <input type="text" id="longitude" class="form-control" placeholder="Longitude (e.g., 88.3639)">
                    <button class="btn btn-primary" id="submit-location">Submit</button>
                </div>
                <div class="mt-1 small text-muted">Try using coordinates for Kolkata: 22.5726, 88.3639</div>
            </div>`;
        
        // Add event listener for manual location submission
        document.getElementById('submit-location').addEventListener('click', submitManualLocation);
    }
}

// Function to submit manual location
function submitManualLocation() {
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    
    if (isNaN(latitude) || isNaN(longitude)) {
        alert('Please enter valid latitude and longitude values.');
        return;
    }
    
    userLocationData = { latitude, longitude };
    const locationStatusDiv = document.getElementById('location-status');
    locationStatusDiv.innerHTML = `<p><i class="fas fa-map-marker-alt"></i> Using location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>`;
    
    // Fetch weather data based on location
    fetchWeatherData(latitude, longitude);
}

// Function to fetch weather data from Open-Meteo API
function fetchWeatherData(latitude, longitude) {
    const weatherStatusDiv = document.getElementById('weather-status') || createWeatherStatusDiv();
    weatherStatusDiv.innerHTML = '<p><i class="fas fa-cloud-sun"></i> Fetching weather data...</p>';
    
    // Using the backend proxy to get weather data
    fetch(`/api/weather-data?lat=${latitude}&lon=${longitude}`)
        .then(response => response.json())
        .then(data => {
            weatherData = data;
            
            // Calculate 7-day rainfall sum from hourly data if available
            let totalRainfall = 0;
            let rainCount = 0;
            
            if (data.hourly && data.hourly.precipitation) {
                const last7Days = data.hourly.precipitation.slice(-168); // Last 7 days (24*7=168 hours)
                totalRainfall = last7Days.reduce((sum, val) => sum + val, 0);
                rainCount = last7Days.filter(val => val > 0).length;
            }
            
            const weatherInfo = `
                <div class="weather-info p-3 bg-light rounded mb-3">
                    <h5><i class="fas fa-cloud-sun"></i> Current Weather Conditions</h5>
                    <div class="d-flex flex-wrap">
                        <div class="me-4 mb-2">
                            <strong>Temperature:</strong> ${data.current.temperature_2m}°C
                        </div>
                        <div class="me-4 mb-2">
                            <strong>Humidity:</strong> ${data.current.relative_humidity_2m}%
                        </div>
                        <div class="me-4 mb-2">
                            <strong>Rainfall (last 7 days):</strong> ${totalRainfall.toFixed(1)} mm
                        </div>
                        <div class="me-4 mb-2">
                            <strong>Soil Moisture:</strong> ${getSoilMoistureEstimate(data.current.relative_humidity_2m, totalRainfall)}
                        </div>
                    </div>
                </div>`;
            
            weatherStatusDiv.innerHTML = weatherInfo;
            
            // Now analyze the disease based on weather data
            analyzeDiseaseConditions();
        })
        .catch(error => {
            console.error("Error fetching weather data:", error);
            weatherStatusDiv.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Failed to fetch weather data. Please try again later.</p>';
        });
}

// Helper function to estimate soil moisture based on humidity and rainfall
function getSoilMoistureEstimate(humidity, rainfall) {
    if (humidity > 80 && rainfall > 50) {
        return "High";
    } else if (humidity > 60 || rainfall > 20) {
        return "Moderate";
    } else {
        return "Low";
    }
}

// Function to analyze if the disease is related to weather conditions or other factors
function analyzeDiseaseConditions() {
    // Get the predicted disease name
    const diseaseName = getPredictedDiseaseName();
    
    // Create analysis container if it doesn't exist
    const analysisContainer = document.getElementById('weather-analysis') || createAnalysisDiv();
    
    if (!diseaseName) {
        console.log("Missing disease name for analysis");
        analysisContainer.innerHTML = `
            <div class="alert alert-warning">
                <p><i class="fas fa-exclamation-triangle"></i> Could not determine disease name from the prediction.</p>
                <p>Please make sure the disease name is properly displayed in the results.</p>
            </div>`;
        return;
    }
    
    if (!weatherData) {
        console.log("Missing weather data for analysis");
        analysisContainer.innerHTML = `
            <div class="alert alert-warning">
                <p><i class="fas fa-exclamation-triangle"></i> Could not load weather data for your location.</p>
                <p>Weather-based disease analysis is unavailable at this time.</p>
            </div>`;
        return;
    }
    
    // Get disease info from our dataset
    const disease = findDiseaseInDataset(diseaseName);
    
    // Get current weather conditions for display regardless of disease match
    const currentHumidity = weatherData.current.relative_humidity_2m;
    
    // Calculate 7-day rainfall sum
    let totalRainfall = 0;
    if (weatherData.hourly && weatherData.hourly.precipitation) {
        const last7Days = weatherData.hourly.precipitation.slice(-168); // Last 7 days (24*7=168 hours)
        totalRainfall = last7Days.reduce((sum, val) => sum + val, 0);
    }
    
    // Estimate soil moisture
    const soilMoistureEstimate = getSoilMoistureEstimate(currentHumidity, totalRainfall);
    
    if (!disease) {
        console.log("Disease not found in dataset:", diseaseName);
        
        // Still show weather conditions even though we don't have disease data
        analysisContainer.innerHTML = `
            <div class="weather-disease-analysis p-3 bg-light rounded mb-3">
                <h5><i class="fas fa-microscope"></i> Disease Condition Analysis</h5>
                <div class="alert alert-info">
                    <p>This disease (${diseaseName}) is not in our weather correlation database yet.</p>
                    <p>We can't provide specific correlation analysis, but here are your current conditions:</p>
                </div>
                <ul class="condition-list">
                    <li>
                        <i class="fas fa-tint"></i>
                        Humidity: Current ${currentHumidity}%
                    </li>
                    <li>
                        <i class="fas fa-cloud-rain"></i>
                        Rainfall: Last 7 days ${totalRainfall.toFixed(1)} mm
                    </li>
                    <li>
                        <i class="fas fa-water"></i>
                        Soil Moisture: Estimated ${soilMoistureEstimate}
                    </li>
                </ul>
                <div class="mt-3">
                    <p>For most plant diseases, the following conditions increase risk:</p>
                    <ul>
                        <li>High humidity (>70%)</li>
                        <li>Moderate to high rainfall</li>
                        <li>High soil moisture</li>
                    </ul>
                </div>
            </div>`;
        return;
    }
    
    // Check if conditions match disease requirements
    const humidityMatch = checkHumidityMatch(currentHumidity, disease.humidity);
    const rainfallMatch = checkRainfallMatch(totalRainfall, disease.rainfall);
    const soilMoistureMatch = checkSoilMoistureMatch(soilMoistureEstimate, disease.soilMoisture);
    
    // Calculate overall match score (0-100)
    const matchScore = calculateMatchScore(humidityMatch, rainfallMatch, soilMoistureMatch);
    
    // Generate analysis text
    let analysisHtml = `
        <div class="weather-disease-analysis p-3 bg-light rounded mb-3">
            <h5><i class="fas fa-microscope"></i> Disease Condition Analysis</h5>
            <p>Based on your location's weather conditions and the detected disease (${diseaseName}):</p>
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
            </ul>`;
    
    // Add explanation and fertilizer questionnaire if match score is low
    if (matchScore < 50) {
        analysisHtml += `
            <div class="alert alert-warning mt-3">
                <p><strong>Note:</strong> The current weather conditions don't strongly match the typical pattern for this disease. Other factors might be contributing to the infection.</p>
            </div>
            <div class="mt-3">
                <p>Please provide additional information for a more detailed analysis:</p>
                <form id="fertilizer-form" class="fertilizer-form">
                    <div class="mb-2">
                        <label for="fertilizer-input" class="form-label">Fertilizer used:</label>
                        <input type="text" id="fertilizer-input" class="form-control form-control-sm" placeholder="e.g., NPK 10-10-10, organic compost">
                    </div>
                    <div class="mb-2">
                        <label for="soil-type-input" class="form-label">Soil type:</label>
                        <select id="soil-type-input" class="form-select form-select-sm">
                            <option value="">-- Select soil type --</option>
                            <option value="Alluvial soil">Alluvial soil</option>
                            <option value="Black cotton soil">Black cotton soil</option>
                            <option value="Red loamy soil">Red loamy soil</option>
                            <option value="Mountain soil">Mountain soil</option>
                            <option value="Lateritic soil">Lateritic soil</option>
                            <option value="Sandy soil">Sandy soil</option>
                            <option value="Clay soil">Clay soil</option>
                            <option value="Loamy soil">Loamy soil</option>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label for="watering-input" class="form-label">Watering schedule:</label>
                        <select id="watering-input" class="form-select form-select-sm">
                            <option value="">-- Select watering frequency --</option>
                            <option value="Once daily">Once daily</option>
                            <option value="Twice daily">Twice daily</option>
                            <option value="Every other day">Every other day</option>
                            <option value="Twice weekly">Twice weekly</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Drip irrigation">Drip irrigation</option>
                            <option value="Flood irrigation">Flood irrigation</option>
                        </select>
                    </div>
                    <button type="button" id="submit-fertilizer" class="btn btn-sm btn-primary mt-2">Submit for Analysis</button>
                </form>
            </div>`;
    } else {
        // Add explanation for high match score
        analysisHtml += `
            <div class="alert alert-info mt-3">
                <p><strong>Weather Analysis:</strong> Current weather conditions match the typical pattern for this disease.</p>
                <p>This suggests that weather factors are likely contributing to the disease development.</p>
            </div>`;
    }
    
    analysisHtml += `</div>`;
    analysisContainer.innerHTML = analysisHtml;
    
    // Add event listener for fertilizer form if present
    const submitButton = document.getElementById('submit-fertilizer');
    if (submitButton) {
        submitButton.addEventListener('click', submitFertilizerData);
    }
}

// Function to submit fertilizer and other data for analysis
function submitFertilizerData() {
    // Disable submit button and show loading state
    const fertilizer = document.getElementById('fertilizer-input')?.value || '';
    const soilType = document.getElementById('soil-type-input')?.value || '';
    const watering = document.getElementById('watering-input')?.value || '';
    
    // Use a more direct approach instead of jQuery
    const diseaseName = getPredictedDiseaseName();
    if (!diseaseName) {
        alert("Please detect a disease first before requesting analysis");
        return;
    }
    
    // Create a loading indicator in the form itself
    const formElement = document.getElementById('fertilizer-form');
    formElement.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x mb-3"></i><p>Analyzing disease factors...</p></div>';
    
    // Prepare data for the API
    const formData = {
        disease: diseaseName,
        location: userLocationData,
        weather: {
            temperature: weatherData?.current?.temperature_2m,
            humidity: weatherData?.current?.relative_humidity_2m,
            conditions: "Current conditions"
        },
        fertilizer: fertilizer,
        soil_type: soilType,
        watering: watering
    };
    
    // Send the data to the API
    fetch('/api/analyze-disease-factors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(response => {
        console.log("Analysis response:", response);
        
        if (response && response.success) {
            // Format and display the analysis results
            let analysisHtml = '';
            let preventionHtml = '';
            
            if (response.analysis) {
                analysisHtml = formatGeminiResponse(response.analysis);
                
                // Make sure the analysis has a proper heading
                if (!analysisHtml.includes("<h1") && !analysisHtml.includes("<h2") && !analysisHtml.includes("<h3")) {
                    analysisHtml = `<h3 class="mb-3 text-primary">Disease Analysis: ${diseaseName}</h3>${analysisHtml}`;
                }
            }
            
            if (response.prevention) {
                preventionHtml = formatGeminiResponse(response.prevention);
                
                // Make sure the prevention section has a proper heading
                if (!preventionHtml.includes("<h1") && !preventionHtml.includes("<h2") && !preventionHtml.includes("<h3")) {
                    preventionHtml = `<h3 class="mb-3 text-primary">Prevention Recommendations</h3>${preventionHtml}`;
                }
            }
            
            // Put it all together in a nicely formatted section
            const analysisContainer = document.getElementById('weather-analysis');
            
            if (analysisContainer) {
                const htmlContent = `
                    <div class="analysis-results mt-4">
                        <div class="card mb-4 shadow-sm">
                            <div class="card-body">
                                ${analysisHtml}
                            </div>
                        </div>
                        
                        <div class="card mb-4 shadow-sm">
                            <div class="card-body">
                                ${preventionHtml}
                            </div>
                        </div>
                    </div>
                `;
                
                analysisContainer.innerHTML = htmlContent;
                
                // Scroll to the analysis section
                analysisContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            // Handle error
            const analysisContainer = document.getElementById('weather-analysis');
            if (analysisContainer) {
                analysisContainer.innerHTML = '<div class="alert alert-danger">Failed to analyze disease factors. Please try again.</div>';
            }
        }
    })
    .catch(error => {
        console.error("Error submitting data:", error);
        
        // Show error in the analysis container
        const analysisContainer = document.getElementById('weather-analysis');
        if (analysisContainer) {
            analysisContainer.innerHTML = `<div class="alert alert-danger">Failed to analyze disease factors: ${error.message}</div>`;
        }
    });
}

// Helper function to format and structure Gemini API response
function formatGeminiResponse(text) {
    if (!text) return '<p>No information available</p>';
    
    // Remove code block markers if present (```html, ```)
    text = text.replace(/```html|```/g, '');
    
    // Remove HTML document wrappers if present
    text = text.replace(/<!DOCTYPE html>|<html>|<\/html>|<body>|<\/body>/gi, '');
    
    // Add Bootstrap classes to improve styling
    text = text.replace(/<h1>/gi, '<h1 class="mb-3 text-primary">');
    text = text.replace(/<h2>/gi, '<h2 class="mb-3 text-primary">');
    text = text.replace(/<h3>/gi, '<h3 class="mb-2 text-secondary">');
    text = text.replace(/<h4>/gi, '<h4 class="mb-2 text-secondary">');
    text = text.replace(/<h5>/gi, '<h5 class="mb-2 text-secondary">');
    text = text.replace(/<ul>/gi, '<ul class="list-group list-group-flush mb-3">');
    text = text.replace(/<li>/gi, '<li class="list-group-item">');
    text = text.replace(/<p>/gi, '<p class="mb-2">');
    
    // Format for bold and emphasis
    text = text.replace(/<strong>|<b>/gi, '<strong class="text-dark">');
    
    // Add spacing between sections
    text = text.replace(/<\/h2>|<\/h3>/gi, '$&<div class="mb-3"></div>');
    
    // Add special styling for heading with "Cause" or "Factor" in it
    text = text.replace(/<h\d[^>]*>(.*?cause.*?|.*?factor.*?)<\/h\d>/gi, 
        match => match.replace(/<h(\d)/, '<h$1 class="text-warning"'));
    
    // The text should already be HTML, but in case it's not, add paragraph tags
    if (!text.includes('<')) {
        text = `<p class="mb-2">${text}</p>`;
    }
    
    return text;
}

// Helper function to extract the predicted disease name
function getPredictedDiseaseName() {
    // Try to get from various elements where it might be
    let diseaseName = null;
    
    // First try: Check directly in the prediction element
    const predictionElement = document.querySelector('.prediction');
    if (predictionElement) {
        const text = predictionElement.textContent || '';
        if (text && text.length > 0) {
            console.log("Found prediction text:", text);
            return text.trim();
        }
    }
    
    // Second try: Check in h5.disease-name
    const diseaseNameElement = document.querySelector('h5.disease-name');
    if (diseaseNameElement) {
        const text = diseaseNameElement.textContent || '';
        console.log("Found disease-name text:", text);
        const match = text.match(/Disease:\s*(.+)/i);
        if (match && match[1]) {
            return match[1].trim();
        } else {
            return text.trim(); // Just use the text if no "Disease:" prefix
        }
    }
    
    // Third try: Check in any h5 that contains "Disease:"
    const allH5Elements = document.querySelectorAll('h5');
    for (const h5 of allH5Elements) {
        const text = h5.textContent || '';
        if (text.toLowerCase().includes('disease:')) {
            console.log("Found disease h5 text:", text);
            const match = text.match(/Disease:\s*(.+)/i);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    }
    
    // Fourth try: Look for it in the result structured format
    const resultContent = document.querySelector('.result');
    if (resultContent) {
        const text = resultContent.textContent || '';
        console.log("Checking result content for disease");
        const match = text.match(/Disease:\s*(.+?)(\n|$)/i);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    // Fifth try: Check page for prediction element with a different format
    const altPredictionElement = document.querySelector('.text-center.fs-5');
    if (altPredictionElement) {
        const text = altPredictionElement.textContent || '';
        if (text && text.trim().length > 0 && !text.toLowerCase().includes('error') && !text.toLowerCase().includes('uncertain')) {
            console.log("Found alternate prediction text:", text);
            return text.trim();
        }
    }
    
    console.log("Could not find disease name in the page");
    return null;
}

// Helper function to find disease in our dataset (partial name matching)
function findDiseaseInDataset(diseaseName) {
    if (!diseaseName) return null;
    
    // Convert to lowercase for case-insensitive matching
    const lowerDiseaseName = diseaseName.toLowerCase();
    
    // Clean up disease name by removing model format separators and normalizing
    let cleanedDiseaseName = lowerDiseaseName
        .replace(/___/g, ' ')  // Replace triple underscore with space
        .replace(/_/g, ' ')    // Replace remaining underscores with space
        .replace(/\(including sour\)/g, '')  // Remove parenthetical text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim();               // Remove leading/trailing spaces
    
    console.log("Looking for disease:", cleanedDiseaseName);
    
    // Try to extract just the disease part if it follows a format with plant name
    if (cleanedDiseaseName.includes('apple')) {
        cleanedDiseaseName = cleanedDiseaseName.replace('healthy', '');
        if (cleanedDiseaseName.includes('scab')) {
            cleanedDiseaseName = 'apple scab';
        } else if (cleanedDiseaseName.includes('black rot')) {
            cleanedDiseaseName = 'black rot';
        } else if (cleanedDiseaseName.includes('cedar') || cleanedDiseaseName.includes('rust')) {
            cleanedDiseaseName = 'cedar apple rust';
        }
    } else if (cleanedDiseaseName.includes('cherry') && cleanedDiseaseName.includes('powdery mildew')) {
        cleanedDiseaseName = 'powdery mildew';
    } else if (cleanedDiseaseName.includes('grape')) {
        cleanedDiseaseName = cleanedDiseaseName.replace('healthy', '');
        if (cleanedDiseaseName.includes('black rot')) {
            cleanedDiseaseName = 'black rot';
        } else if (cleanedDiseaseName.includes('measles') || cleanedDiseaseName.includes('esca')) {
            cleanedDiseaseName = 'black measles';
        } else if (cleanedDiseaseName.includes('blight') || cleanedDiseaseName.includes('isariopsis')) {
            cleanedDiseaseName = 'leaf blight';
        }
    } else if (cleanedDiseaseName.includes('tomato')) {
        cleanedDiseaseName = cleanedDiseaseName.replace('healthy', '');
        // Extract specific disease from tomato diseases
        if (cleanedDiseaseName.includes('early blight')) {
            cleanedDiseaseName = 'early blight';
        } else if (cleanedDiseaseName.includes('late blight')) {
            cleanedDiseaseName = 'late blight';
        } else if (cleanedDiseaseName.includes('leaf mold')) {
            cleanedDiseaseName = 'leaf mold';
        } else if (cleanedDiseaseName.includes('septoria')) {
            cleanedDiseaseName = 'septoria leaf spot';
        } else if (cleanedDiseaseName.includes('spider')) {
            cleanedDiseaseName = 'spider mites';
        } else if (cleanedDiseaseName.includes('target')) {
            cleanedDiseaseName = 'target spot';
        } else if (cleanedDiseaseName.includes('yellow') && cleanedDiseaseName.includes('curl')) {
            cleanedDiseaseName = 'yellow leaf curl virus';
        } else if (cleanedDiseaseName.includes('mosaic')) {
            cleanedDiseaseName = 'mosaic virus';
        } else if (cleanedDiseaseName.includes('bacterial')) {
            cleanedDiseaseName = 'bacterial spot';
        }
    }
    
    cleanedDiseaseName = cleanedDiseaseName.trim();
    console.log("Normalized disease name:", cleanedDiseaseName);
    
    // Try to find an exact match first
    for (const [key, value] of Object.entries(diseaseData)) {
        if (cleanedDiseaseName === key.toLowerCase()) {
            console.log("Found exact match:", key);
            return value;
        }
    }
    
    // If no exact match, look for partial matches
    for (const [key, value] of Object.entries(diseaseData)) {
        if (cleanedDiseaseName.includes(key.toLowerCase()) || 
            key.toLowerCase().includes(cleanedDiseaseName)) {
            console.log("Found partial match:", key);
            return value;
        }
    }
    
    // Try to match by plant type if nothing else worked
    let plantType = "";
    if (cleanedDiseaseName.includes('apple')) plantType = "Apple";
    else if (cleanedDiseaseName.includes('cherry')) plantType = "Cherry";
    else if (cleanedDiseaseName.includes('corn') || cleanedDiseaseName.includes('maize')) plantType = "Corn (Maize)";
    else if (cleanedDiseaseName.includes('grape')) plantType = "Grape";
    else if (cleanedDiseaseName.includes('potato')) plantType = "Potato";
    else if (cleanedDiseaseName.includes('tomato')) plantType = "Tomato";
    
    if (plantType) {
        // Find any disease for this plant type
        for (const [key, value] of Object.entries(diseaseData)) {
            if (value.plant === plantType) {
                console.log("Matched by plant type:", plantType, "->", key);
                return value;
            }
        }
    }
    
    console.log("No match found for disease:", diseaseName);
    return null;
}

// Helper function to check if humidity matches disease requirements
function checkHumidityMatch(currentHumidity, requiredHumidity) {
    if (typeof requiredHumidity === 'string') {
        if (requiredHumidity.toLowerCase() === 'high') {
            return currentHumidity >= 70;
        } else if (requiredHumidity.toLowerCase() === 'moderate') {
            return currentHumidity >= 50 && currentHumidity < 70;
        } else if (requiredHumidity.toLowerCase() === 'low') {
            return currentHumidity < 50;
        } else if (requiredHumidity.includes('-')) {
            // Range format like "74.1-83.7%"
            const range = requiredHumidity.replace('%', '').split('-');
            const min = parseFloat(range[0]);
            const max = parseFloat(range[1]);
            return currentHumidity >= min && currentHumidity <= max;
        }
    } else if (typeof requiredHumidity === 'number') {
        return currentHumidity >= requiredHumidity - 5 && currentHumidity <= requiredHumidity + 5;
    }
    
    return false;
}

// Helper function to check if rainfall matches disease requirements
function checkRainfallMatch(totalRainfall, requiredRainfall) {
    if (typeof requiredRainfall !== 'string') return false;
    
    if (requiredRainfall.includes('Heavy') || requiredRainfall.includes('>64.5')) {
        return totalRainfall >= 64.5;
    } else if (requiredRainfall.includes('Moderate to heavy') || requiredRainfall.includes('15.6-115.5')) {
        return totalRainfall >= 15.6 && totalRainfall <= 115.5;
    } else if (requiredRainfall.includes('Moderate') || requiredRainfall.includes('15.6-64.4')) {
        return totalRainfall >= 15.6 && totalRainfall <= 64.4;
    } else if (requiredRainfall.includes('Light to moderate') || requiredRainfall.includes('2.5-64.4')) {
        return totalRainfall >= 2.5 && totalRainfall <= 64.4;
    } else if (requiredRainfall.includes('Light') || requiredRainfall.includes('<15.6')) {
        return totalRainfall < 15.6;
    }
    
    return false;
}

// Helper function to check if soil moisture matches disease requirements
function checkSoilMoistureMatch(currentMoisture, requiredMoisture) {
    if (typeof requiredMoisture !== 'string') return false;
    
    if (requiredMoisture.toLowerCase().includes('high')) {
        return currentMoisture.toLowerCase() === 'high';
    } else if (requiredMoisture.toLowerCase().includes('moderate to high')) {
        return currentMoisture.toLowerCase() === 'high' || currentMoisture.toLowerCase() === 'moderate';
    } else if (requiredMoisture.toLowerCase().includes('moderate')) {
        return currentMoisture.toLowerCase() === 'moderate';
    } else if (requiredMoisture.toLowerCase().includes('low')) {
        return currentMoisture.toLowerCase() === 'low';
    } else if (requiredMoisture.toLowerCase().includes('moist')) {
        return currentMoisture.toLowerCase() === 'moderate' || currentMoisture.toLowerCase() === 'high';
    }
    
    return false;
}

// Helper function to calculate match score
function calculateMatchScore(humidityMatch, rainfallMatch, soilMoistureMatch) {
    let score = 0;
    
    if (humidityMatch) score += 33.3;
    if (rainfallMatch) score += 33.3;
    if (soilMoistureMatch) score += 33.4;
    
    return Math.round(score);
}

// Helper function to get progress bar color based on match score
function getProgressBarColor(score) {
    if (score >= 75) return 'bg-success';
    if (score >= 50) return 'bg-warning';
    return 'bg-danger';
}

// Helper function to calculate total rainfall from weather data
function calculateTotalRainfall() {
    if (!weatherData || !weatherData.hourly || !weatherData.hourly.precipitation) {
        return 0;
    }
    
    try {
        const last7Days = weatherData.hourly.precipitation.slice(-168); // Last 7 days (24*7=168 hours)
        return last7Days.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
    } catch (error) {
        console.error("Error calculating rainfall:", error);
        return 0;
    }
}

// Helper function to create status div if it doesn't exist
function createStatusDiv() {
    const resultContainer = document.querySelector('.prediction-box');
    if (!resultContainer) return null;
    
    const div = document.createElement('div');
    div.id = 'location-status';
    div.className = 'location-status mt-3';
    resultContainer.appendChild(div);
    return div;
}

// Helper function to create weather status div if it doesn't exist
function createWeatherStatusDiv() {
    const resultContainer = document.querySelector('.prediction-box');
    if (!resultContainer) return null;
    
    const div = document.createElement('div');
    div.id = 'weather-status';
    div.className = 'weather-status mt-3';
    resultContainer.appendChild(div);
    return div;
}

// Helper function to create analysis div if it doesn't exist
function createAnalysisDiv() {
    const resultContainer = document.querySelector('.prediction-box');
    if (!resultContainer) return null;
    
    const div = document.createElement('div');
    div.id = 'weather-analysis';
    div.className = 'weather-analysis mt-3';
    resultContainer.appendChild(div);
    return div;
}

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    // Check if we have a toast container, if not create one
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create a unique ID for this toast
    const toastId = 'toast-' + Date.now();
    
    // Map type to Bootstrap color
    const bgColor = type === 'success' ? 'bg-success' :
                   type === 'error' || type === 'danger' ? 'bg-danger' :
                   type === 'warning' ? 'bg-warning' : 'bg-info';
    
    // Create toast HTML
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgColor} text-white border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize the toast
    const toastElement = document.getElementById(toastId);
    
    // If Bootstrap's toast JavaScript is available
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastElement, { 
            autohide: true,
            delay: 5000
        });
        toast.show();
    } else {
        // Fallback if Bootstrap JS isn't loaded
        toastElement.classList.add('show');
        setTimeout(() => {
            toastElement.remove();
        }, 5000);
    }
    
    // Fallback - also show as alert for critical messages
    if (type === 'error' || type === 'danger') {
        console.error(message);
    }
} 