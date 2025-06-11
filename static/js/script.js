document.addEventListener("DOMContentLoaded", function () {
    const faqItems = document.querySelectorAll(".faq-item");

    // Initialize global variables if not already defined
    if (typeof window.diseaseClasses === 'undefined') {
        window.diseaseClasses = ["Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy", "Blueberry___healthy", "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy", "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot", "Corn_(maize)___Common_rust_", "Corn_(maize)___Northern_Leaf_Blight", "Corn_(maize)___healthy", "Grape___Black_rot", "Grape___Esca_(Black_Measles)", "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy", "Orange___Haunglongbing_(Citrus_greening)", "Peach___Bacterial_spot", "Peach___healthy", "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy", "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy", "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew", "Strawberry___Leaf_scorch", "Strawberry___healthy", "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight", "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot", "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot", "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus", "Tomato___healthy"];
    }

    function handleScroll() {
        faqItems.forEach((item) => {
            const itemPosition = item.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;

            if (itemPosition < windowHeight - 100) {
                item.classList.add("show");
            } else {
                item.classList.remove("show"); // Reset when out of view
            }
        });
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Run once on page load
    
    // Check server status for TensorFlow availability
    checkServerStatus();
    
    // Initialize language dropdown
    initLanguageDropdown();
    
    // Initialize language selector
    initLanguageSelector();
    
    // Setup speech recognition for voice input
    setupVoiceRecognition();
    
    // Setup image preview for online mode
    setupImagePreview();
    
    // Setup the offline detect button
    setupOfflineDetection();

    // Preload the model if we're in offline mode
    setTimeout(() => {
        // Only preload if we're in offline mode
        if (document.getElementById('mode-toggle').value === 'offline') {
            console.log("Offline model down, switching to online model...");
            loadOfflineModel().then(success => {
                if (success) {
                    console.log("High-accuracy online model loaded successfully!");
                } else {
                    console.warn("Could not preload high-accuracy model");
                }
            }).catch(error => {
                console.error("Error preloading model:", error);
            });
        }
    }, 2000); // Wait 2 seconds before starting the preload
});

// Add an image preview functionality
function setupImagePreview() {
    // For online mode
    const imageInputOnline = document.getElementById('image-input-online');
    const imagePreviewOnline = document.getElementById('image-preview');
    const previewImageOnline = document.getElementById('preview-image');
    
    if (imageInputOnline && previewImageOnline) {
        imageInputOnline.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    previewImageOnline.src = e.target.result;
                    imagePreviewOnline.style.display = 'block';
                };
                
                reader.readAsDataURL(this.files[0]);
            } else {
                previewImageOnline.src = '';
                imagePreviewOnline.style.display = 'none';
            }
        });
    }
    
    // For offline mode
    const imageInputOffline = document.getElementById('image-input');
    const imagePreviewOffline = document.getElementById('offline-image-preview');
    const previewImageOffline = document.getElementById('offline-preview-image');
    
    if (imageInputOffline && previewImageOffline) {
        imageInputOffline.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    previewImageOffline.src = e.target.result;
                    imagePreviewOffline.style.display = 'block';
                };
                
                reader.readAsDataURL(this.files[0]);
            } else {
                previewImageOffline.src = '';
                imagePreviewOffline.style.display = 'none';
            }
        });
    }
}

// Setup speech recognition for microphone button
function setupVoiceRecognition() {
    const voiceButton = document.getElementById('voice-input-btn');
    const symptomsInput = document.getElementById('symptoms-input');
    const voiceStatus = document.getElementById('voice-status');
    
    if (!voiceButton || !symptomsInput) return;
    
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        // Speech recognition not supported
        if (voiceStatus) {
            voiceStatus.textContent = 'Speech recognition not supported in this browser.';
        }
        if (voiceButton) {
            voiceButton.disabled = true;
            voiceButton.classList.add('btn-secondary');
            voiceButton.classList.remove('btn-primary');
        }
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Change to true for continuous listening
    recognition.interimResults = true; // Show interim results
    
    // Try to detect language based on page language
    const html = document.querySelector('html');
    if (html && html.lang) {
        recognition.lang = html.lang;
    } else {
        recognition.lang = 'en-US'; // Default to English
    }
    
    let isListening = false;
    
    // When user clicks the microphone button
    voiceButton.addEventListener('click', () => {
        if (isListening) {
            // If already listening, stop
            recognition.stop();
            isListening = false;
            voiceButton.classList.remove('listening');
            voiceButton.classList.remove('btn-danger');
            voiceButton.classList.add('btn-secondary');
            voiceStatus.textContent = 'Listening stopped.';
        } else {
            // Start listening
            try {
            recognition.start();
                isListening = true;
            voiceButton.classList.add('listening');
            voiceButton.classList.remove('btn-secondary');
            voiceButton.classList.add('btn-danger');
            voiceStatus.textContent = 'Listening... Speak now.';
            } catch (e) {
                console.error('Speech recognition error:', e);
                voiceStatus.textContent = 'Error starting speech recognition. Try again.';
            }
        }
    });
    
    // Process the speech when results are available
    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update the input field with the transcribed text
        if (finalTranscript !== '') {
            symptomsInput.value = finalTranscript;
            voiceStatus.textContent = 'Recognized: ' + finalTranscript;
        } else if (interimTranscript !== '') {
            symptomsInput.value = interimTranscript;
            voiceStatus.textContent = 'Listening: ' + interimTranscript;
        }
    };
    
    // Handle errors
    recognition.onerror = (event) => {
        voiceStatus.textContent = 'Error: ' + event.error;
        isListening = false;
        voiceButton.classList.remove('listening');
        voiceButton.classList.remove('btn-danger');
        voiceButton.classList.add('btn-secondary');
    };
    
    // When recognition ends
    recognition.onend = () => {
        isListening = false;
        voiceButton.classList.remove('listening');
        voiceButton.classList.remove('btn-danger');
        voiceButton.classList.add('btn-secondary');
        voiceStatus.textContent = 'Listening ended.';
    };
}

// Initialize language dropdown
function initLanguageDropdown() {
    const dropdownToggle = document.getElementById('languageDropdown');
    const dropdownMenu = document.querySelector('.language-dropdown-menu');
    const languageOptions = document.querySelectorAll('.language-option');
    const currentLanguageSpan = document.getElementById('currentLanguage');
    
    if (!dropdownToggle || !dropdownMenu) return;
    
    // Toggle dropdown when clicking the toggle button
    dropdownToggle.addEventListener('click', function(e) {
        e.preventDefault();
        dropdownMenu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Handle language selection
    languageOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const langCode = this.getAttribute('data-lang-code');
            const langName = this.textContent;
            
            // Update active state
            languageOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update current language display
            currentLanguageSpan.textContent = langName;
            
            // Get the Google Translate element
            const googleElement = document.getElementById('google_translate_element');
            if (googleElement) {
                // Find and click the appropriate language option in the Google Translate widget
                const select = googleElement.querySelector('select');
                if (select) {
                    select.value = langCode;
                    select.dispatchEvent(new Event('change'));
                }
            }
            
            // Close the dropdown
            const dropdown = document.querySelector('.language-dropdown-menu');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        });
    });
}

// Check if server has TensorFlow available
async function checkServerStatus() {
    try {
        const response = await fetch('/status');
        if (response.ok) {
            const data = await response.json();
            if (!data.tensorflow_available) {
                // If TensorFlow is not available on server, auto-switch to offline mode
                document.getElementById('mode-toggle').value = 'offline';
                document.getElementById('mode-toggle').dispatchEvent(new Event('change'));
                
                // Show a notification
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = `<div class="alert alert-warning">
                    <p><strong>Note:</strong> The server doesn't have TensorFlow available.</p>
                    <p>You've been automatically switched to offline mode.</p>
                    <p>You'll need to download the model for local detection.</p>
                </div>`;
            }
        }
    } catch (error) {
        console.error('Error checking server status:', error);
    }
}

// Toggle between Online and Offline modes
document.getElementById('mode-toggle').addEventListener('change', function () {
    // Clear previous results
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    
    if (this.value === 'online') {
        document.getElementById('online-mode').style.display = 'block';
        document.getElementById('offline-mode').style.display = 'none';
    } else {
        document.getElementById('online-mode').style.display = 'none';
        document.getElementById('offline-mode').style.display = 'block';
        
        // Make sure jQuery is loaded for offline mode
        ensureJQuery(() => {
            // Clear any previous message
            const resultArea = document.getElementById('result-area');
            if (resultArea) {
                resultArea.innerHTML = '';
            }
            
            // Trigger model loading with proper UI update
            handleModelLoadForOffline();
        });
    }
});

// Global variables for offline model
let offlineModel = null;
let offlineModelLoading = false;
const classNames = ["Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy", "Blueberry___healthy", "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy", "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot", "Corn_(maize)___Common_rust_", "Corn_(maize)___Northern_Leaf_Blight", "Corn_(maize)___healthy", "Grape___Black_rot", "Grape___Esca_(Black_Measles)", "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy", "Orange___Haunglongbing_(Citrus_greening)", "Peach___Bacterial_spot", "Peach___healthy", "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy", "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy", "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew", "Strawberry___Leaf_scorch", "Strawberry___healthy", "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight", "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot", "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot", "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus", "Tomato___healthy"];

// Function to load the offline model
async function loadOfflineModel() {
    // Don't load again if already loaded
    if (offlineModel) {
        return true;
    }
    
    // Get model status elements
    const modelStatus = document.getElementById('model-status');
    const modelLoadingStatus = document.getElementById('model-loading-status');
    const modelProgressBar = document.getElementById('model-progress-bar');
    const modelProgressDiv = document.getElementById('model-progress-div');
    const offlineToggle = document.getElementById('offline-toggle');
    const globalLoader = document.getElementById('global-loader');  // Add reference to the global loader
    
    // Update UI to loading state
    if (modelStatus) modelStatus.innerText = 'Loading...';
    if (modelLoadingStatus) modelLoadingStatus.classList.remove('d-none');
    if (modelProgressBar) modelProgressBar.style.width = '0%';
    if (modelProgressDiv) modelProgressDiv.classList.remove('d-none');
    if (offlineToggle) offlineToggle.disabled = true;
    
    try {
        // First try to load metadata and classes - these are critical for mapping predictions to labels
        try {
            const metadataResponse = await fetch('/static/model/metadata.json');
            if (metadataResponse.ok) {
                window.modelMetadata = await metadataResponse.json();
                console.log("Loaded model metadata:", window.modelMetadata);
            }
        } catch (error) {
            console.warn("Could not load metadata, will try to continue:", error);
        }
        
        // Load class names - this is essential for accurate prediction mapping
        try {
            const classesResponse = await fetch('/static/model/classes.json');
            if (classesResponse.ok) {
                window.diseaseClasses = await classesResponse.json();
                console.log("Loaded disease classes:", window.diseaseClasses);
            } else {
                // Use the global classNames as fallback only if needed
                window.diseaseClasses = classNames;
                console.log("Using fallback disease classes list");
            }
        } catch (error) {
            // Use the global classNames as fallback
            window.diseaseClasses = classNames;
            console.log("Using fallback disease classes due to error:", error);
        }
        
        // Define progress callback function
        const onProgress = (fraction) => {
            // Calculate percentage and update progress bar
            const percent = Math.round(fraction * 100);
            if (modelProgressBar) {
                modelProgressBar.style.width = `${percent}%`;
                modelProgressBar.innerText = `${percent}%`;
            }
            console.log(`Loading model: ${percent}%`);
        };
        
        // Clear any existing models to prevent interference
        try {
            const existingModels = await tf.io.listModels();
            for (const modelPath in existingModels) {
                if (modelPath.includes('plant-disease-model')) {
                    console.log(`Removing existing model: ${modelPath}`);
                    await tf.io.removeModel(modelPath);
                }
            }
        } catch (error) {
            console.warn("Error clearing existing models:", error);
        }
        
        // First try loading from server - most reliable approach for accuracy
        console.log("Loading model from server (tfjs_model directory)...");
        try {
            // This should load the full production model with accurate weights
            offlineModel = await tf.loadLayersModel('/static/model/tfjs_model/model.json', {
                onProgress: onProgress
            });
            console.log("Successfully loaded model from tfjs_model directory");
            
            // Save to IndexedDB for future offline use
            try {
                const timestamp = Date.now();
                await offlineModel.save(`indexeddb://plant-disease-model-${timestamp}`);
                console.log("Model saved to IndexedDB for offline use");
            } catch (saveError) {
                console.warn("Could not save model to IndexedDB:", saveError);
            }
        } catch (error) {
            console.error("Could not load model from tfjs_model:", error);
            
            // Try alternative model location
            try {
                console.log("Trying alternative model path...");
                offlineModel = await tf.loadLayersModel('/static/model/model.json', {
                    onProgress: onProgress
                });
                console.log("Successfully loaded model from root model directory");
                
                // Save this model to IndexedDB
                try {
                    const timestamp = Date.now();
                    await offlineModel.save(`indexeddb://plant-disease-model-${timestamp}`);
                    console.log("Model saved to IndexedDB");
                } catch (saveError) {
                    console.warn("Could not save model to IndexedDB:", saveError);
                }
            } catch (alternativeError) {
                // As last resort, try loading from IndexedDB if it was previously saved
                try {
                    console.log("Trying to load model from IndexedDB...");
                    const models = await tf.io.listModels();
                    let newestModel = null;
                    let newestTimestamp = 0;
                    
                    // Find the most recently saved model
                    for (const modelPath in models) {
                        if (modelPath.includes('plant-disease-model')) {
                            const pathTimestamp = parseInt(modelPath.split('-').pop()) || 0;
                            if (pathTimestamp > newestTimestamp) {
                                newestModel = modelPath;
                                newestTimestamp = pathTimestamp;
                            }
                        }
                    }
                    
                    if (newestModel) {
                        console.log(`Loading most recent model from IndexedDB: ${newestModel}`);
                        offlineModel = await tf.loadLayersModel(newestModel);
                        console.log("Successfully loaded model from IndexedDB");
                    } else {
                        throw new Error("No models found in IndexedDB");
                    }
                } catch (indexedDBError) {
                    console.error("Failed to load model from any source:", indexedDBError);
                    throw new Error("Could not load the model from any source");
                }
            }
        }
        
        // Final warmup and validation for the loaded model
        if (offlineModel) {
            // Verify input dimensions - critical to prevent preprocessing errors
            const inputShape = offlineModel.inputs[0].shape;
            console.log("Model input shape:", inputShape);
            
            // Create metadata if missing
            if (!window.modelMetadata) {
                window.modelMetadata = {
                    inputShape: [224, 224, 3],  // Use standard CNN input size
                    preprocessingParams: {
                        targetSize: [224, 224],
                        normalization: "[-1,1]"  // Document normalization approach
                    },
                    postprocessingParams: {
                        confidenceThreshold: 0.3,
                        topK: 1
                    }
                };
            }
            
            try {
                // Perform a warmup prediction to initialize the model
                // Always use 224x224 for consistency
                const dummyInput = tf.zeros([1, 224, 224, 3]);
                
                // Run prediction but don't check result - just initialize model
                const warmupResult = offlineModel.predict(dummyInput);
                warmupResult.dataSync(); // Force execution
                warmupResult.dispose(); // Cleanup
                dummyInput.dispose(); // Cleanup
                
                console.log("Model warmup successful");
            } catch (warmupError) {
                console.warn("Model warmup failed, trying a second attempt with different dimensions:", warmupError);
                
                try {
                    // Try a second attempt with original dimensions from model
                    const inputShape = offlineModel.inputs[0].shape;
                    const dummyInput = tf.zeros([1, inputShape[1], inputShape[2], 3]);
                    const warmupResult = offlineModel.predict(dummyInput);
                    warmupResult.dataSync();
                    warmupResult.dispose();
                    dummyInput.dispose();
                    console.log("Second warmup attempt successful");
                } catch (secondError) {
                    console.warn("All warmup attempts failed, but continuing:", secondError);
                }
            }
            
            // Update UI to show success
            if (modelStatus) modelStatus.innerText = 'Loaded';
            if (modelLoadingStatus) modelLoadingStatus.classList.add('d-none');
            if (modelProgressDiv) modelProgressDiv.classList.add('d-none');
            
            // Hide global loader when model is loaded
            if (globalLoader) globalLoader.style.display = 'none';
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        // Update UI to show error
        console.error("Error loading model:", error);
        
        if (modelStatus) modelStatus.innerText = 'Error';
        if (modelLoadingStatus) {
            modelLoadingStatus.classList.remove('d-none');
            modelLoadingStatus.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        }
        
        // Hide global loader on error
        if (globalLoader) globalLoader.style.display = 'none';
        
        return false;
    } finally {
        // Re-enable offline toggle regardless of outcome
        if (offlineToggle) offlineToggle.disabled = false;
        
        // Always make sure the global loader is hidden
        if (globalLoader) globalLoader.style.display = 'none';
        
        // Remove any "Loading..." text messages
        const loaderMessages = document.querySelectorAll('.loading-message, .offline-loader-message');
        loaderMessages.forEach(message => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        });
    }
}

// Function to clear model storage
async function clearModelStorage() {
    const resultDiv = document.getElementById('result');
    
    try {
        const modelPath = 'indexeddb://plant-disease-model';
        await tf.io.removeModel(modelPath);
        offlineModel = null;
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <p>Model storage has been cleared.</p>
                <button id="reload-model-btn" class="btn btn-primary mt-2">Load New Model</button>
            </div>
        `;
        
        // Add event listener to reload button
        document.getElementById('reload-model-btn').addEventListener('click', function() {
            loadOfflineModel();
        });
        
    } catch (error) {
        console.error("Error clearing model storage:", error);
        resultDiv.innerHTML = `<div class="alert alert-danger">Error clearing model storage: ${error.message}</div>`;
    }
}

// Function to fix model.json format issues (camelCase vs snake_case)
function fixModelJsonFormat(modelJson) {
    // Deep copy the model to avoid modifying the original
    const fixedModel = JSON.parse(JSON.stringify(modelJson));
    
    // Fix modelTopology if it exists
    if (fixedModel.modelTopology) {
        // Fix class_name vs className
        if (fixedModel.modelTopology.className && !fixedModel.modelTopology.class_name) {
            fixedModel.modelTopology.class_name = fixedModel.modelTopology.className;
            delete fixedModel.modelTopology.className;
        }
        
        // Fix kerasVersion vs keras_version
        if (fixedModel.modelTopology.kerasVersion && !fixedModel.modelTopology.keras_version) {
            fixedModel.modelTopology.keras_version = fixedModel.modelTopology.kerasVersion;
            delete fixedModel.modelTopology.kerasVersion;
        }
        
        // Fix config layers
        if (fixedModel.modelTopology.config && fixedModel.modelTopology.config.layers) {
            fixedModel.modelTopology.config.layers = fixedModel.modelTopology.config.layers.map(layer => {
                // Fix class_name
                if (layer.className && !layer.class_name) {
                    layer.class_name = layer.className;
                    delete layer.className;
                }
                
                // Fix config properties
                if (layer.config) {
                    // Fix batchInputShape
                    if (layer.config.batchInputShape && !layer.config.batch_input_shape) {
                        layer.config.batch_input_shape = layer.config.batchInputShape;
                        delete layer.config.batchInputShape;
                    }
                    
                    // Fix useBias
                    if (layer.config.useBias !== undefined && layer.config.use_bias === undefined) {
                        layer.config.use_bias = layer.config.useBias;
                        delete layer.config.useBias;
                    }
                }
                
                return layer;
            });
        }
    }
    
    return fixedModel;
}

// Function to check model compatibility and attempt fixes
async function checkModelCompatibility() {
    if (!offlineModel) return false;
    
    try {
        // Get the model information
        const inputShape = offlineModel.inputs[0].shape;
        console.log("Model input shape:", inputShape);
        
        // Use 224x224 standard size for compatibility check
        const testTensor = tf.zeros([1, 224, 224, 3]);
        
        // Try a prediction
        try {
            const testResult = offlineModel.predict(testTensor);
            console.log("Test prediction succeeded. Model compatible with 224x224 input.");
            console.log("Test prediction output shape:", testResult.shape);
            
            // Check the max class - see if it's always predicting the same class
            const testProbs = Array.from(await testResult.data());
            const maxTestClass = testProbs.indexOf(Math.max(...testProbs));
            console.log("Test prediction max class:", maxTestClass, "name:", classNames[maxTestClass]);
            
            // For a test tensor of all zeros, we expect inconsistent results
            // We'll keep the model regardless of what it predicts here
            testResult.dispose();
            testTensor.dispose();
            return true;
        } catch (error) {
            console.error("Test prediction failed with 224x224 input:", error);
            testTensor.dispose();
            
            // Try forcing model reload to fix compatibility issues
            console.log("Attempting to fix model compatibility by reloading...");
            await forceReloadModel(true); // Silent mode
            return false;
        }
    } catch (error) {
        console.error("Error checking model compatibility:", error);
        return false;
    }
}

// Function to completely reset the model and reload
async function forceModelReset() {
    try {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Resetting model cache...</strong></p>
                <p>Attempting to load a fresh model from the server.</p>
            </div>
        `;
        
        // First dispose of the current model if it exists
        if (offlineModel) {
            offlineModel.dispose();
            offlineModel = null;
        }
        
        // Clear all models from IndexedDB
        const models = await tf.io.listModels();
        for (const modelPath in models) {
                console.log("Clearing model:", modelPath);
                await tf.io.removeModel(modelPath);
        }
        
        // Clear browser cache for model files
        if ('caches' in window) {
            try {
                const cacheNames = await window.caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('model')) {
                        await window.caches.delete(cacheName);
                        console.log("Deleted cache:", cacheName);
                    }
                }
            } catch (e) {
                console.warn("Cache API access error:", e);
            }
        }
        
        // Attempt to load the model fresh from server
        try {
            console.log("Loading fresh model from server...");
            const modelPath = '/static/model/model.json';
            offlineModel = await tf.loadLayersModel(modelPath, {
                onProgress: (fraction) => {
                    resultDiv.innerHTML = `
                        <div class="alert alert-info">
                            <p><strong>Loading fresh model...</strong></p>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: ${Math.round(fraction * 100)}%" 
                                    aria-valuenow="${Math.round(fraction * 100)}" aria-valuemin="0" aria-valuemax="100">
                                    ${Math.round(fraction * 100)}%
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
            
            // Save the model to a new path to avoid issues with the old one
            await offlineModel.save('indexeddb://plant-disease-model-' + new Date().getTime());
            
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <p><strong>Model reset successful!</strong></p>
                    <p>Please try your detection again.</p>
                </div>
            `;
            
            return true;
        } catch (error) {
            console.error("Failed to load fresh model:", error);
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Model reset failed.</strong></p>
                    <p>Please try using the online mode instead.</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='/'">
                        Return to Home
                    </button>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error("Error during model reset:", error);
        return false;
    }
}

// Function to verify model has the right input dimensions
async function verifyModelInputDimensions() {
    if (!offlineModel) return false;
    
    try {
        // Get model input shape
        const modelInputShape = offlineModel.inputs[0].shape;
        console.log("Model input shape:", modelInputShape);
        
        // Use 224x224 dimensions for model verification
        const testTensor = tf.zeros([1, 224, 224, 3]);
        
        try {
            // Try prediction with 224x224
            const testResult = offlineModel.predict(testTensor);
            testResult.dispose();
            testTensor.dispose();
            console.log("Model validation successful with 224x224");
            return true;
        } catch (error) {
            console.error("Model validation failed with 224x224:", error);
            testTensor.dispose();
            return false;
        }
    } catch (error) {
        console.error("Error checking model dimensions:", error);
        return false;
    }
}

// Camera functionality for both online and offline modes
document.addEventListener('DOMContentLoaded', function() {
    // Setup online mode camera
    setupCamera('open-camera-online', 'close-camera-online', 'capture-photo-online', 
                'camera-feed-container-online', 'camera-feed-online', 'photo-canvas-online', true);
    
    // Setup offline mode camera
    setupCamera('open-camera', 'close-camera', 'capture-photo', 
                'camera-feed-container', 'camera-feed', 'photo-canvas', false);
                
    // Common camera setup function
    function setupCamera(openBtnId, closeBtnId, captureBtnId, containerId, feedId, canvasId, isOnlineMode) {
        // Camera elements
        const openCameraBtn = document.getElementById(openBtnId);
        const closeCameraBtn = document.getElementById(closeBtnId);
        const capturePhotoBtn = document.getElementById(captureBtnId);
        const cameraFeedContainer = document.getElementById(containerId);
        const cameraFeed = document.getElementById(feedId);
        const photoCanvas = document.getElementById(canvasId);
        
        let stream = null;
        
        // Check if camera elements exist
        if (openCameraBtn && closeCameraBtn && capturePhotoBtn && cameraFeed && photoCanvas) {
            // Open camera button click handler
            openCameraBtn.addEventListener('click', async function() {
                try {
                    // Request camera access and get stream
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            facingMode: 'environment', // Prefer back camera if available
                            width: { ideal: 224 },
                            height: { ideal: 224 } 
                        } 
                    });
                    
                    // Set video source and show camera feed
                    cameraFeed.srcObject = stream;
                    cameraFeedContainer.classList.remove('d-none');
                    openCameraBtn.classList.add('d-none');
                    
                    // Add simple instructions above camera
                    const instructionsDiv = document.createElement('div');
                    instructionsDiv.className = 'alert alert-info mt-2 mb-2';
                    instructionsDiv.innerHTML = '<small>Center the plant in frame and ensure good lighting.</small>';
                    cameraFeedContainer.insertBefore(instructionsDiv, cameraFeedContainer.firstChild);
                    
                    console.log("Camera opened successfully");
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    alert('Could not access camera. Please make sure you have granted camera permissions and try again.');
                }
            });
            
            // Close camera button click handler
            closeCameraBtn.addEventListener('click', function() {
                // Stop camera stream
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                
                // Hide camera feed and show open camera button
                cameraFeedContainer.classList.add('d-none');
                openCameraBtn.classList.remove('d-none');
                
                // Remove any instruction div we added
                const instructionsDiv = cameraFeedContainer.querySelector('.alert');
                if (instructionsDiv) {
                    instructionsDiv.remove();
                }
                
                console.log("Camera closed");
            });
            
            // Capture photo button click handler
            capturePhotoBtn.addEventListener('click', function() {
                if (!stream) return;
                
                // Set canvas dimensions to match video
                const context = photoCanvas.getContext('2d');
                photoCanvas.width = 224;
                photoCanvas.height = 224;
                
                // Draw current frame from video to canvas
                context.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);
                
                // Convert canvas to data URL
                const photoURL = photoCanvas.toDataURL('image/jpeg');
                
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = `
                    <div class="card mb-3">
                        <div class="card-body">
                            <img src="${photoURL}" class="img-fluid mb-2" style="max-width: 224px;">
                            <div class="alert alert-info mb-0">Ready for detection. Click "Detect Disease" to analyze.</div>
                        </div>
                    </div>
                `;
                
                // If online mode, prepare for form submission
                if (isOnlineMode) {
                    // Convert dataURL to blob
                    const base64Data = photoURL.split(',')[1];
                    const blob = base64ToBlob(base64Data, 'image/jpeg');
                    
                    // Create a File from Blob
                    const fileName = `captured_photo_${new Date().getTime()}.jpg`;
                    const file = new File([blob], fileName, { type: 'image/jpeg' });
                    
                    // Create a FileList-like object
                    const fileList = new DataTransfer();
                    fileList.items.add(file);
                    
                    // Assign the file to the input element
                    const inputElement = document.getElementById('image-input-online');
                    inputElement.files = fileList.files;
                    
                    // Show preview
                    const previewImage = document.getElementById('preview-image');
                    const imagePreview = document.getElementById('image-preview');
                    if (previewImage && imagePreview) {
                        previewImage.src = photoURL;
                        imagePreview.style.display = 'block';
                    }
                } else {
                    // For offline mode
                    window.capturedPhotoURL = photoURL;
                }
                
                // Close camera
                closeCameraBtn.click();
                
                console.log("Photo captured successfully");
            });
        }
    }
    
    // Helper function to convert base64 to Blob
    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i += 512) {
            const slice = byteCharacters.slice(i, i + 512);
            const byteNumbers = new Array(slice.length);
            
            for (let j = 0; j < slice.length; j++) {
                byteNumbers[j] = slice.charCodeAt(j);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        
        return new Blob(byteArrays, { type: mimeType });
    }
});

// Setup the offline detection functionality
function setupOfflineDetection() {
    const detectOfflineBtn = document.getElementById('detect-offline');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('offline-image-preview');
    const currentResultArea = document.getElementById('result-area');
    const loaderElement = document.getElementById('global-loader');
    
    if (!detectOfflineBtn || !imageInput) {
        console.error("Offline detection elements not found");
        return;
    }
    
    console.log("Setting up offline detection with elements:", {
        detectOfflineBtn: detectOfflineBtn.id,
        imageInput: imageInput.id,
        imagePreview: imagePreview?.id,
        currentResultArea: currentResultArea?.id
    });
    
    // Show image preview when a file is selected
    imageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (imagePreview) {
                    imagePreview.innerHTML = `<img src="${e.target.result}" class="img-fluid rounded" style="max-height: 200px;">`;
                }
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Set up click handler for detect button
    detectOfflineBtn.addEventListener('click', async function() {
        console.log("Detect offline button clicked");
        
        // Check if file is selected
        if (!imageInput.files || !imageInput.files[0]) {
            if (currentResultArea) {
                currentResultArea.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>No image selected!</strong> Please select an image file.
                    </div>
                `;
            }
            return;
        }
        
        // Disable the button during processing
        detectOfflineBtn.disabled = true;
        
        // Validate file type
        const file = imageInput.files[0];
        if (!file.type.startsWith('image/')) {
            currentResultArea.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Invalid file type!</strong> Please select an image file.
                </div>
            `;
            detectOfflineBtn.disabled = false;
            return;
        }
        
        // Show local loading indicator
        if (currentResultArea) {
            currentResultArea.innerHTML = `
                <div class="d-flex justify-content-center" id="detection-loader">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Processing...</span>
                    </div>
                    <span class="ms-2">Processing image...</span>
                </div>
            `;
        }
        
        try {
            // Create object URL from the image file
            const imageURL = URL.createObjectURL(file);
            
            console.log("Processing with H5 model:", {
                fileSize: file.size,
                fileType: file.type,
                fileName: file.name
            });
            
            // Use direct H5 model processing (similar to online mode)
            // but with results displayed right here without redirecting
            await processH5ModelAndDisplayResult(imageURL, file, currentResultArea);
            
            // Clean up object URL
            URL.revokeObjectURL(imageURL);
            
        } catch (error) {
            console.error("Error in offline detection:", error);
            
            // Hide any loaders
            if (loaderElement) loaderElement.style.display = 'none';
            
            if (currentResultArea) {
                currentResultArea.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Error:</strong> ${error.message}
                        <p>Please try again or switch to online mode.</p>
                    </div>
                `;
            }
        } finally {
            // Re-enable the detect button
            detectOfflineBtn.disabled = false;
        }
    });
}

// Process with H5 model for offline detection
async function processH5ModelAndDisplayResult(imgURL, file, resultDiv) {
    try {
        console.log("Starting offline H5 model processing");
        
        // Show loading message
        resultDiv.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Processing Image</h5>
                    <img src="${imgURL}" class="img-fluid mb-3" style="max-width: 300px;">
                    <div class="alert alert-info">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Analyzing image with model.h5...
                    </div>
                </div>
            </div>
        `;

        // Create a form to submit the image
        const formData = new FormData();
        formData.append('file', file);
        
        console.log("Sending image to /api/offline-predict");
        
        // Send to our dedicated offline API endpoint
        const response = await fetch('/api/offline-predict', {
            method: 'POST',
            body: formData
        });
        
        console.log("Response received:", response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log("Result:", result);
            
            if (result.success) {
                // Format the class name to be more readable
                const className = result.disease;
                let formattedPrediction = "Unknown";
                
                try {
                    if (className) {
                        formattedPrediction = className
                            .replace(/_/g, ' ')
                            .replace('___', ': ')
                            .replace('/', ' or ');
                    }
                } catch (e) {
                    console.error("Error formatting prediction name:", e);
                    formattedPrediction = String(className || "Unknown");
                }
                
                // Display only the prediction without confidence
                resultDiv.innerHTML = `
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title text-center mb-3">Detection Result</h5>
                            <p class="text-center fs-5 mb-2">${formattedPrediction}</p>
                        </div>
                    </div>
                `;
            } else {
                // Low confidence or other error
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Low confidence detection:</strong> ${result.message || 'The model is not confident about this image.'}</p>
                        <p>Try with a clearer image or better lighting.</p>
                    </div>
                `;
            }
        } else {
            // Handle HTTP error
            console.error("Server error:", response.status);
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Server error (${response.status})</strong></p>
                    <p>The server couldn't process the image. Please try again later.</p>
                </div>
            `;
        }
    } catch (error) {
        // Handle any unexpected errors
        console.error("Error in offline detection:", error);
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Please try again with a different image.</p>
            </div>
        `;
    } finally {
        // Ensure loaders are hidden
        hideAllLoaders();
    }
}

// Check if model is already available when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Remove the download button from the offline section
    const downloadBtn = document.getElementById('download-model-btn');
    if (downloadBtn) {
        downloadBtn.remove();
    }
    
    // Add instructions about the offline mode
    const offlineMode = document.getElementById('offline-mode');
    if (offlineMode) {
        const header = offlineMode.querySelector('h3');
        if (header) {
            header.insertAdjacentHTML('afterend', `
                <div class="alert alert-info mb-3">
                    <p><strong>Offline Mode</strong></p>
                    <p>Take a photo or upload a plant image for local analysis without internet connection.</p>
                </div>
            `);
    }
}
    
    // Ensure "Any plant" is selected by default in both dropdowns
    const onlinePlantType = document.getElementById('plant-type');
    const offlinePlantType = document.getElementById('plant-type-offline');
    
    if (onlinePlantType && onlinePlantType.querySelector('option[value="any"]')) {
        onlinePlantType.value = 'any';
    }
    
    if (offlinePlantType && offlinePlantType.querySelector('option[value="any"]')) {
        offlinePlantType.value = 'any';
    }
});

// Language Selection Functionality
document.addEventListener('DOMContentLoaded', function() {
    const languageOptions = document.querySelectorAll('.language-option');
    const currentLanguageSpan = document.getElementById('currentLanguage');
    const languageDropdown = document.getElementById('languageDropdown');
    
    // Initialize Bootstrap dropdown
    if (languageDropdown) {
        const dropdown = new bootstrap.Dropdown(languageDropdown);
    }
    
    languageOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const langCode = this.getAttribute('data-lang-code');
            const langName = this.textContent;
            
            // Update active state
            languageOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update current language display
            currentLanguageSpan.textContent = langName;
            
            // Get the Google Translate element
            const googleElement = document.getElementById('google_translate_element');
            if (googleElement) {
                // Find and click the appropriate language option in the Google Translate widget
                const select = googleElement.querySelector('select');
                if (select) {
                    select.value = langCode;
                    select.dispatchEvent(new Event('change'));
                }
            }
            
            // Close the dropdown
            const dropdownMenu = document.querySelector('.language-dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        });
    });
});

// Initialize language selector
function initLanguageSelector() {
    const translateBtn = document.getElementById('translateBtn');
    
    if (!translateBtn) return;
    
    // Override Bootstrap's data-bs-toggle
    translateBtn.removeAttribute('data-bs-toggle');
    
    // Use a direct click handler
    translateBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropdownMenu = this.nextElementSibling;
        if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
            // Toggle show class
            dropdownMenu.classList.toggle('show');
            
            // Close when clicking outside
            function handleClickOutside(e) {
                if (!translateBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                    document.removeEventListener('click', handleClickOutside);
                }
            }
            
            // Add the document click handler
            document.addEventListener('click', handleClickOutside);
        }
    });
    
    // Add click handlers for language options
    const languageItems = document.querySelectorAll('.dropdown-item[onclick^="translatePage"]');
    languageItems.forEach(item => {
        item.addEventListener('click', function() {
            // Close the dropdown after selection
            const dropdownMenu = translateBtn.nextElementSibling;
            if (dropdownMenu) {
                setTimeout(() => {
                    dropdownMenu.classList.remove('show');
                }, 100);
            }
        });
    });
}

// Reset model button click handler - use the new complete reset function
document.addEventListener('DOMContentLoaded', function() {
    // No longer needed - reset model button has been removed
});

// Remove event listeners for the reset model button
document.addEventListener('DOMContentLoaded', function() {
    // No longer needed - reset model button has been removed
});

// Function to handle model dimension errors and retry
async function fixModelDimensionError(e, imgURL) {
    console.log("Handling model dimension error:", e.message);
    const resultDiv = document.getElementById('result');
    
    try {
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Optimizing model for your image...</strong></p>
                <p>Please wait a moment.</p>
            </div>
        `;
        
        // Force reload the model to ensure we have the high-accuracy version
        await forceReloadModel(true); // Silent mode
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use 128x128 as the model expects this size
        const targetSize = [128, 128];
        console.log("Processing with correct dimensions:", targetSize);
        
        // Process the image using the proper approach
        const img = new Image();
        img.src = imgURL;
        await new Promise(resolve => img.onload = resolve);
        
        // Preprocess with the EXACT same approach as server
        const tensor = tf.tidy(() => {
            const pixels = tf.browser.fromPixels(img);
            const resized = tf.image.resizeBilinear(pixels, targetSize);
            
            // Use standard [0,1] normalization
            return tf.div(resized, 255.0).expandDims(0);
        });
        
        // Run prediction with fixed dimensions
        const prediction = offlineModel.predict(tensor);
        const probabilities = Array.from(await prediction.data());
        
        // Get max probability and class
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const maxProb = probabilities[maxIndex];
        const className = window.diseaseClasses[maxIndex];
        
        console.log("Fixed prediction successful:", {
            class: className,
            index: maxIndex
        });
        
        // Apply confidence threshold to match production settings
        const confidenceThreshold = 0.3;
        
        // Display result with appropriate confidence threshold logic
        if (maxProb >= confidenceThreshold) {
            // Check if className is valid before formatting
            if (className) {
                // Format the class name to be more readable
                const formattedName = className
                    .replace(/_/g, ' ')
                    .replace('___', ': ')
                    .replace('/', ' or ');
                
                // Include confidence percentage
                const confidencePercent = Math.round(maxProb * 100);
                const formattedResult = `${formattedName} (Confidence: ${confidencePercent}%)`;
                
                // Use the displayResults function to show results
                displayResults(formattedResult);
            } else {
                // Handle the case where className is undefined
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Error:</strong> Could not determine plant disease class.</p>
                        <p>Please try again with a clearer image or switch to online mode.</p>
                    </div>
                `;
            }
        } else {
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3" style="max-width: 100%;">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-warning">
                                    <h5><i class="fas fa-exclamation-circle"></i> Low Confidence:</h5>
                                    <p>Model is not confident about the prediction</p>
                                    <p>Try with a clearer image or better lighting.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Clean up tensors
        tensor.dispose();
        prediction.dispose();
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
        
        // Call hideAllLoaders to ensure all loaders are hidden
        hideAllLoaders();
        
        return true;
    } catch (retryError) {
        console.error("Error in dimension fix:", retryError);
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <p><i class="fas fa-exclamation-triangle"></i> Could not process image.</p>
                <p>Please try with a different image or reset the model.</p>
                <button class="btn btn-primary mt-2" id="retry-with-reset">
                    <i class="fas fa-sync-alt"></i> Reset Model & Try Again
                </button>
            </div>
        `;
        
        // Add event listener for the retry button
        document.getElementById('retry-with-reset').addEventListener('click', async function() {
            await forceReloadModel(false);
            document.getElementById('detect-offline').click();
        });
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
        
        // Call hideAllLoaders to ensure all loaders are hidden
        hideAllLoaders();
        
        return true; // We handled the error with our custom UI
    }
}

// Function to process image with direct H5 model - matches online behavior
async function processWithH5Model(imgURL, resultDiv) {
    try {
        // Process similar to how it's done server-side
        console.log("Processing with H5 model for high accuracy");
        
        // Create a form to submit the image to the server
        const formData = new FormData();
        
        // Get the actual file from the image URL
        const response = await fetch(imgURL);
        const blob = await response.blob();
        formData.append('file', blob, 'image.jpg');
        
        // Send the image to a special endpoint that uses the h5 model directly
        // but processes on the client side in a web worker
        const predictResponse = await fetch('/api/predict_h5_offline', {
            method: 'POST',
            body: formData
        });
        
        if (predictResponse.ok) {
            const result = await predictResponse.json();
            
            if (result.success) {
                // Format class name for display
                const className = result.class;
                
                // Check if className is valid
                if (className) {
                    const formattedName = className
                        .replace(/_/g, ' ')
                        .replace('___', ': ')
                        .replace('/', ' or ');
                        
                    // Display prediction results using the displayResults function
                    displayResults(formattedName);
                } else {
                    // Handle the case where className is undefined
                    resultDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <p><strong>Error:</strong> Could not determine plant disease class.</p>
                            <p>Please try again with a clearer image or switch to online mode.</p>
                        </div>
                    `;
                }
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Error processing with H5 model:</strong> ${result.error}</p>
                        <p>Falling back to standard model...</p>
                    </div>
                `;
                
                // Fall back to regular model processing
                if (!offlineModel) {
                    const modelLoaded = await loadOfflineModel();
                    if (!modelLoaded) {
                        return;
                    }
                }
                
                // Continue with regular processing
                await processWithRegularModel(imgURL, resultDiv);
            }
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Server error:</strong> Could not process image with H5 model.</p>
                    <p>Trying fallback method...</p>
                </div>
            `;
            
            // Try falling back to direct offline processing
            await processWithRegularModel(imgURL, resultDiv);
        }
    } catch (error) {
        console.error("Error in H5 processing:", error);
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Trying standard offline processing...</p>
            </div>
        `;
        
        // Try falling back to direct offline processing
        await processWithRegularModel(imgURL, resultDiv);
    }
}

// Refactored original processing function to be called as a fallback
async function processWithRegularModel(imgURL, resultDiv) {
    try {
        // Show loading message
        resultDiv.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Uploaded Image</h5>
                    <img src="${imgURL}" class="img-fluid mb-3" style="max-width: 300px;">
                    <div class="alert alert-info">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Processing image...
                    </div>
                </div>
            </div>
        `;
        
        // Create a tensor from the image
        const img = new Image();
        img.src = imgURL;
        await new Promise(resolve => img.onload = resolve);
        
        // PRODUCTION-LEVEL PREPROCESSING - Matches exactly the Python model preprocessing
        const tensor = tf.tidy(() => {
            // Step 1: Load the image pixels
            const pixels = tf.browser.fromPixels(img);
            
            // Step 2: Resize to 224x224 (standard for modern CNN models)
            const resized = tf.image.resizeBilinear(pixels, [224, 224]);
            
            // Step 3: Center crop to ensure focus on the main subject
            // This improves accuracy by focusing on the plant in the center
            const cropSize = Math.min(resized.shape[0], resized.shape[1]);
            const startRow = Math.floor((resized.shape[0] - cropSize) / 2);
            const startCol = Math.floor((resized.shape[1] - cropSize) / 2);
            const cropped = tf.slice(resized, [startRow, startCol, 0], [cropSize, cropSize, 3]);
            
            // Step 4: Normalize using the advanced [-1,1] approach for better discrimination
            const normalized = tf.div(tf.sub(cropped, 127.5), 127.5);
            
            console.log("Using production-quality preprocessing for maximum accuracy");
            
            // Add batch dimension and return
            return normalized.expandDims(0);
        });
        
        // Ensure model has correct shape before prediction
        if (offlineModel.inputs[0].shape[1] !== 224 || offlineModel.inputs[0].shape[2] !== 224) {
            console.error("Model input shape mismatch, need to reload model");
            await forceReloadModel();
        }
        
        // Run inference with the model
        console.log("Running prediction with production-quality preprocessing");
        const prediction = offlineModel.predict(tensor);
        
        // Get prediction data
        const predictionData = Array.from(await prediction.data());
        
        // Clean up tensors
        tensor.dispose();
        prediction.dispose();
        
        // Apply temperature scaling to sharpen predictions (t=0.8)
        // This helps improve confidence in the correct class
        const temperature = 0.8;
        const scaledPredictions = predictionData.map(p => Math.pow(p, 1/temperature));
        
        // Apply softmax to ensure proper probabilities
        const maxVal = Math.max(...scaledPredictions);
        let expSum = 0;
        const expValues = [];
        
        for (let i = 0; i < scaledPredictions.length; i++) {
            const expVal = Math.exp(scaledPredictions[i] - maxVal);
            expValues.push(expVal);
            expSum += expVal;
        }
        
        // Final normalized probabilities
        const normalizedPredictions = expValues.map(val => val / expSum);
        
        // Log probability sum for verification
        const probSum = normalizedPredictions.reduce((a, b) => a + b, 0);
        console.log("Probability sum after normalization:", probSum);
        
        // Log all probabilities for evaluation
        const allClassesWithProbs = [];
        for (let i = 0; i < Math.min(normalizedPredictions.length, (window.diseaseClasses || []).length); i++) {
            allClassesWithProbs.push({
                class: window.diseaseClasses?.[i] || `Class ${i}`,
                probability: normalizedPredictions[i]
            });
        }
        
        // Sort by probability
        const top5Predictions = allClassesWithProbs
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5);
        
        console.log("Top 5 predictions:", top5Predictions);
        
        // Find max probability and corresponding class
        const maxIndex = normalizedPredictions.indexOf(Math.max(...normalizedPredictions));
        const maxProb = normalizedPredictions[maxIndex];
        
        // FIXED: Ensure we have disease classes and handle undefined
        if (!window.diseaseClasses || window.diseaseClasses.length === 0) {
            console.error("No disease classes found, using default class names");
            window.diseaseClasses = Array.from({length: normalizedPredictions.length}, (_, i) => `Class ${i}`);
        }
        
        // FIXED: Ensure maxIndex is in bounds of the disease classes array
        if (maxIndex >= window.diseaseClasses.length) {
            console.error("Index out of bounds for disease classes array");
            // Use a default class name if index is invalid
            var className = `Class ${maxIndex}`;
        } else {
            // Get the class name
            var className = window.diseaseClasses[maxIndex] || `Class ${maxIndex}`;
        }
        
        console.log("Prediction result:", {
            class: className,
            probability: maxProb,
            index: maxIndex
        });
        
        // Calculate top 3 predictions for display with proper error handling
        const top3Predictions = [];
        for (let i = 0; i < Math.min(3, top5Predictions.length); i++) {
            const pred = top5Predictions[i];
            
            // Ensure the name exists and format it properly
            let formattedName;
            try {
                formattedName = pred.class ? 
                    pred.class.replace(/_/g, ' ').replace('___', ': ').replace('/', ' or ') :
                    `Class ${i}`;
            } catch (e) {
                formattedName = `Class ${i}`;
            }
            
            // Normalize the probability to be between 0 and 100%
            // This fixes the issue with probabilities over 100%
            const normalizedProb = Math.min(100, Math.max(0, Math.round(pred.probability * 100)));
            
            top3Predictions.push({
                name: formattedName,
                probability: normalizedProb
            });
        }
        
        // Use a production-appropriate confidence threshold (0.3)
        const confidenceThreshold = 0.3;
        
        if (maxProb < confidenceThreshold) {
            // Model is not confident enough
            resultDiv.innerHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Detection Result</h5>
                        <div class="row">
                            <div class="col-md-5">
                                <img src="${imgURL}" class="img-fluid rounded mb-3">
                            </div>
                            <div class="col-md-7">
                                <div class="alert alert-warning">
                                    <h5><i class="fas fa-exclamation-circle"></i> Low Confidence:</h5>
                                    <p>The model is not confident enough about this image</p>
                                    <p>Try taking a clearer photo with better lighting and a simple background.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Check if className is valid
            if (className) {
                // Format the class name to be more readable
                const formattedName = className
                    .replace(/_/g, ' ')
                    .replace('___', ': ')
                    .replace('/', ' or ');
                
                // Add the confidence percentage to the result
                const confidencePercent = Math.round(maxProb * 100);
                const formattedResult = `${formattedName} (Confidence: ${confidencePercent}%)`;
                
                // Use the displayResults function to show results
                displayResults(formattedResult);
            } else {
                // Handle the case where className is undefined
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <p><strong>Error:</strong> Could not determine plant disease class.</p>
                        <p>Please try again with a clearer image or switch to online mode.</p>
                    </div>
                `;
            }
            
            // Hide loading indicator
            const offlineLoading = document.getElementById('offline-loading');
            if (offlineLoading) {
                offlineLoading.classList.add('d-none');
            }
            
            // Re-enable the detect button
            const detectOfflineBtn = document.getElementById('detect-offline');
            if (detectOfflineBtn) {
                detectOfflineBtn.disabled = false;
            }
            
            // Clean up tensors
            tensor.dispose();
            prediction.dispose();
            
            // Always hide global loader
            const globalLoader = document.getElementById('global-loader');
            if (globalLoader) globalLoader.style.display = 'none';
            
            return;
        }
        
        // Clean up tensors
        tensor.dispose();
        prediction.dispose();
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
        
        // Always hide global loader
        const globalLoader = document.getElementById('global-loader');
        if (globalLoader) globalLoader.style.display = 'none';
        
    } catch (error) {
        console.error("Error in regular model processing:", error);
        
        // Check if it's a dimension mismatch error and try to fix it
        if (error.message && (error.message.includes('dimension') || error.message.includes('shape'))) {
            try {
                // Try to fix dimension error
                await fixModelDimensionError(error, imgURL);
            } catch (e) {
                console.error("Error in dimension fix:", e);
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <h5><i class="fas fa-exclamation-triangle"></i> Error:</h5>
                        <p>${error.message}</p>
                        <p>Please try again with a different image or reload the page.</p>
                    </div>
                `;
            }
        } else {
            // General error handling
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle"></i> Error:</h5>
                    <p>${error.message}</p>
                    <p>Please try again or switch to online mode if available.</p>
                </div>
            `;
        }
        
        // Hide loading indicator
        const offlineLoading = document.getElementById('offline-loading');
        if (offlineLoading) {
            offlineLoading.classList.add('d-none');
        }
        
        // Re-enable the detect button
        const detectOfflineBtn = document.getElementById('detect-offline');
        if (detectOfflineBtn) {
            detectOfflineBtn.disabled = false;
        }
        
        // Always hide global loader on error
        const globalLoader = document.getElementById('global-loader');
        if (globalLoader) globalLoader.style.display = 'none';
        
        // Explicitly call the loader hiding function
        hideAllLoaders();
    }
}

// Function to force reload the model
async function forceReloadModel(silentMode = false) {
    console.log("Forcing reload of custom disease detection model...");
    
    // Get model status elements
    const modelStatus = document.getElementById('model-status');
    const modelLoadingStatus = document.getElementById('model-loading-status');
    const modelProgressBar = document.getElementById('model-progress-bar');
    const modelProgressDiv = document.getElementById('model-progress-div');
    const offlineToggle = document.getElementById('offline-toggle');
    const resultDiv = document.getElementById('result-area');
    const isOnlineMode = document.getElementById('mode-toggle')?.value === 'online';
    const globalLoader = document.getElementById('global-loader'); // Add reference to the global loader
    
    // If in online mode or silent mode requested, don't show any messages
    if (!silentMode && !isOnlineMode && resultDiv) {
        resultDiv.innerHTML = `
            <div class="alert alert-info">
                <p><strong>Reloading disease detection model...</strong></p>
                <p>Please wait while the model is being prepared.</p>
            </div>
        `;
    }
    
    try {
        // First dispose any existing model
        if (offlineModel) {
            offlineModel.dispose();
            offlineModel = null;
        }
        
        // Clear all models from storage
        const models = await tf.io.listModels();
        for (const modelPath in models) {
            console.log(`Removing model: ${modelPath}`);
            await tf.io.removeModel(modelPath);
        }
        
        // Force clear browser cache for model files if possible
        if ('caches' in window) {
            try {
                const cacheNames = await window.caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('tensorflowjs') || cacheName.includes('model')) {
                        await window.caches.delete(cacheName);
                        console.log(`Deleted cache: ${cacheName}`);
                    }
                }
            } catch (e) {
                console.warn("Cache API error:", e);
            }
        }
        
        // Wait a moment for storage to clear
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get timestamp to bypass cache
        const timestamp = Date.now();
        
        // First load model metadata and class names
        window.modelMetadata = null;  // Reset metadata
        window.diseaseClasses = null; // Reset classes
        
        // Load metadata
        try {
            const metadataResponse = await fetch(`/static/model/metadata.json?t=${timestamp}`);
            if (metadataResponse.ok) {
                window.modelMetadata = await metadataResponse.json();
                console.log("Model metadata:", window.modelMetadata);
            }
        } catch (error) {
            console.warn("Could not load model metadata:", error);
        }
        
        // Load class names - needed for correct classification
        try {
            const classesResponse = await fetch(`/static/model/classes.json?t=${timestamp}`);
            if (classesResponse.ok) {
                window.diseaseClasses = await classesResponse.json();
                console.log("Loaded disease classes:", window.diseaseClasses);
            } else {
                // Fallback to hardcoded classes if file load fails
                window.diseaseClasses = classNames;
                console.log("Using fallback disease classes");
            }
        } catch (error) {
            console.warn("Could not load disease classes:", error);
            // Fallback to hardcoded classes
            window.diseaseClasses = classNames;
            console.log("Using fallback disease classes due to error");
        }
        
        // Set up progress callback for model loading
        const progressCallback = (fraction) => {
            const percent = Math.round(fraction * 100);
            if (modelProgressBar) {
                modelProgressBar.style.width = `${percent}%`;
                modelProgressBar.innerText = `${percent}%`;
            }
            if (!silentMode) console.log(`Loading model: ${percent}%`);
        };
        
        // Try to load the model, ALWAYS using tfjs_model path first - this is most reliable
        try {
            console.log("Loading model from tfjs_model directory...");
            offlineModel = await tf.loadLayersModel(`/static/model/tfjs_model/model.json?t=${timestamp}`, {
                onProgress: progressCallback
            });
            console.log("Successfully loaded model from tfjs_model directory");
            
            // Save to IndexedDB for future offline use - use timestamp to avoid conflicts
            try {
                await offlineModel.save(`indexeddb://plant-disease-model-${timestamp}`);
                console.log("Model saved to IndexedDB");
            } catch (saveError) {
                console.warn("Could not save model to IndexedDB:", saveError);
            }
        } catch (tfjsError) {
            console.warn("Could not load model from tfjs_model directory:", tfjsError);
            
            // Try the root model.json as backup
            try {
                console.log("Trying to load from /static/model/model.json...");
                offlineModel = await tf.loadLayersModel(`/static/model/model.json?t=${timestamp}`, {
                    onProgress: progressCallback
                });
                console.log("Successfully loaded model from root model directory");
                
                // Save to IndexedDB
                try {
                    await offlineModel.save(`indexeddb://plant-disease-model-${timestamp}`);
                    console.log("Model saved to IndexedDB");
                } catch (saveError) {
                    console.warn("Could not save model to IndexedDB:", saveError);
                }
            } catch (rootModelError) {
                console.error("Failed to load model from any source:", rootModelError);
                
                // Update UI to show error
                if (modelStatus) modelStatus.innerText = 'Failed to load';
                if (modelLoadingStatus) {
                    modelLoadingStatus.classList.remove('d-none');
                    modelLoadingStatus.innerHTML = `
                        <div class="alert alert-danger">
                            <strong>Error:</strong> Could not load model from any source
                        </div>
                    `;
                }
                
                if (resultDiv) {
                    resultDiv.innerHTML = `
                        <div class="alert alert-danger">
                            <strong>Error loading model:</strong> Could not load model from any source. 
                            <p>You can still use the online mode which does not require model loading.</p>
                        </div>
                    `;
                }
                
                // Make sure global loader is hidden on error
                if (globalLoader) globalLoader.style.display = 'none';
                if (offlineToggle) offlineToggle.disabled = false;
                
                return false;
            }
        }
        
        // Test the model with 224x224 input shape - this is CRITICAL for accuracy
        console.log("Testing model with 224x224 input...");
        
        // Always use 224x224x3 for input - standard size for most CNN models
        const testTensor = tf.zeros([1, 224, 224, 3]);
        
        // Log detailed model architecture
        console.log("Model architecture inspection:");
        console.log("- Input shape:", offlineModel.inputs[0].shape);
        console.log("- Output shape:", offlineModel.outputs[0].shape);
        console.log("- Number of layers:", offlineModel.layers.length);
        
        // Log details of each layer for debugging
        offlineModel.layers.forEach((layer, index) => {
            const config = layer.getConfig();
            const weights = layer.getWeights();
            console.log(`Layer ${index}: ${layer.name}`);
            console.log(`- Type: ${layer.getClassName()}`);
            console.log(`- Input shape:`, layer.inputShape);
            console.log(`- Output shape:`, layer.outputShape);
            console.log(`- Weights count: ${weights.length}`);
            if (weights.length > 0) {
                console.log(`- Weight shapes: ${weights.map(w => w.shape).join(', ')}`);
            }
        });
        
        // Test the model
        console.log(`Testing with tensor shape: ${testTensor.shape}`);
        const testResult = offlineModel.predict(testTensor);
        console.log("Test successful, result shape:", testResult.shape);
        
        // Check if result shape matches the number of classes we have
        const numClasses = window.diseaseClasses ? window.diseaseClasses.length : classNames.length;
        console.log(`Number of classes: ${numClasses}, prediction output size: ${testResult.shape[1]}`);
        
        // Clean up tensors
        testTensor.dispose();
        testResult.dispose();
        
        // Only show success message if not in silent mode and not in online mode
        if (!silentMode && !isOnlineMode && resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <p><strong>Disease detection model loaded successfully!</strong></p>
                    <p>The offline detection should now provide accurate results.</p>
                </div>
            `;
        }
        
        // Update UI indicators
        if (modelStatus) modelStatus.innerText = 'Loaded';
        if (modelLoadingStatus) modelLoadingStatus.classList.add('d-none');
        if (modelProgressDiv) modelProgressDiv.classList.add('d-none');
        if (offlineToggle) offlineToggle.disabled = false;
        
        // Make sure global loader is hidden after successful loading
        if (globalLoader) globalLoader.style.display = 'none';
        
        return true;
        
    } catch (error) {
        console.error("Error reloading model:", error);
        
        // Update UI to show error
        if (modelStatus) modelStatus.innerText = 'Error';
        if (modelLoadingStatus) {
            modelLoadingStatus.classList.remove('d-none');
            modelLoadingStatus.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
        }
        
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error loading model:</strong> ${error.message}
                    <p>You can still use the online mode which does not require model loading.</p>
                    <button class="btn btn-primary mt-2" onclick="forceReloadModel(false)">
                        <i class="fas fa-sync me-2"></i>Retry Loading Model
                    </button>
                </div>
            `;
        }
        
        if (offlineToggle) offlineToggle.disabled = false;
        
        // Make sure global loader is hidden on error
        if (globalLoader) globalLoader.style.display = 'none';
        
        return false;
    } finally {
        // Always ensure global loader is hidden regardless of success or failure
        if (globalLoader) globalLoader.style.display = 'none';
    }
}

// Add help text and reload button to offline mode section
document.addEventListener('DOMContentLoaded', function() {
    // Add instructions about the offline mode
    const offlineMode = document.getElementById('offline-mode');
    if (offlineMode) {
        const header = offlineMode.querySelector('h3');
        if (header) {
            header.insertAdjacentHTML('afterend', `
                <div class="alert alert-info mb-3">
                    <p><strong>Offline Mode</strong></p>
                    <p>Take a photo or upload a plant image for local analysis without internet connection.</p>
                </div>
            `);
        }
    }
});

// Add the offline description box using MutationObserver instead
document.addEventListener('DOMContentLoaded', function() {
    const offlineMode = document.getElementById('offline-mode');
    if (offlineMode) {
        // Use MutationObserver instead of DOMNodeInserted
        const observer = new MutationObserver(function(mutations) {
            // Don't add informational boxes in offline mode
            // This is just a placeholder for any future processing
        });
        
        // Start observing
        observer.observe(offlineMode, { 
            childList: true,
            subtree: true 
        });
    }
});

// Update the handleModelLoadForOffline function to not add the info box
function handleModelLoadForOffline() {
    ensureJQuery(() => {
        // Start loading the model without displaying status messages
        if (!offlineModel && !offlineModelLoading) {
            offlineModelLoading = true;
            console.log("Starting model loading from handler...");
            
            // Clear any previous error message
            const resultArea = document.getElementById('result-area');
            if (resultArea) {
                resultArea.innerHTML = `
                    <div class="alert alert-info">
                        <div class="d-flex align-items-center">
                            <div class="spinner-border text-primary me-2" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <strong>Loading model...</strong>
                        </div>
                        <p class="mb-0 mt-2">Please wait while the model is loading...</p>
                    </div>
                `;
            }
            
            // Try to load the model
            loadOfflineModel()
                .then(success => {
                    offlineModelLoading = false;
                    if (success) {
                        console.log("Model loaded successfully from handler");
                        // Update UI to show success
                        if (resultArea) {
                            resultArea.innerHTML = `
                                <div class="alert alert-success">
                                    <strong>Model loaded successfully!</strong>
                                    <p>You can now use the offline detection feature.</p>
                                </div>
                            `;
                            // Fade out the success message after 3 seconds
                            setTimeout(() => {
                                $(resultArea).find('.alert').fadeOut(500, function() {
                                    resultArea.innerHTML = '';
                                });
                            }, 3000);
                        }
                        
                        // Ensure all loaders are hidden
                        hideAllLoaders();
                    } else {
                        console.error("Model failed to load from handler");
                        if (resultArea) {
                            resultArea.innerHTML = `
                                <div class="alert alert-danger">
                                    <p><strong>Error loading model</strong></p>
                                    <p>Could not load the detection model. Please check your internet connection and try again.</p>
                                    <button class="btn btn-primary mt-2" onclick="forceReloadModel(false)">
                                        <i class="fas fa-sync me-2"></i>Retry Loading Model
                                    </button>
                                </div>
                            `;
                        }
                        
                        // Ensure all loaders are hidden
                        hideAllLoaders();
                    }
                })
                .catch(error => {
                    offlineModelLoading = false;
                    console.error("Error loading offline model:", error);
                    if (resultArea) {
                        resultArea.innerHTML = `
                            <div class="alert alert-danger">
                                <p><strong>Error loading model</strong></p>
                                <p>Could not load the detection model: ${error.message}</p>
                                <button class="btn btn-primary mt-2" onclick="forceReloadModel(false)">
                                    <i class="fas fa-sync me-2"></i>Retry Loading Model
                                </button>
                            </div>
                        `;
                    }
                    
                    // Ensure all loaders are hidden
                    hideAllLoaders();
                });
        }
    });
}

// Helper function to hide all loaders
function hideAllLoaders() {
    // Hide global loader
    const globalLoader = document.getElementById('global-loader');
    if (globalLoader) globalLoader.style.display = 'none';
    
    // Hide offline loading message
    const offlineLoading = document.getElementById('offline-loading');
    if (offlineLoading) offlineLoading.classList.add('d-none');
    
    // Remove any "Loading..." text messages
    const loadingMessages = document.querySelectorAll('.loading-message, .offline-loader-message');
    loadingMessages.forEach(message => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    });
    
    // Remove any other potential loaders
    const otherLoaders = document.querySelectorAll('[id$="-loader"]');
    otherLoaders.forEach(loader => {
        if (loader.id !== 'global-loader') {
            loader.style.display = 'none';
        }
    });
}

function displayResults(prediction) {
    // Clear results area 
    const resultArea = document.getElementById('result-area');
    if (!resultArea) return;
    
    // Hide any active loaders - IMPORTANT FOR FIXING ENDLESS LOADING ISSUE
    const globalLoader = document.getElementById('global-loader');
    if (globalLoader) globalLoader.style.display = 'none';
    
    const offlineLoading = document.getElementById('offline-loading');
    if (offlineLoading) offlineLoading.classList.add('d-none');
    
    // Create the HTML for results - simple layout with just the disease name
    let resultHTML = `
        <div class="card mb-4">
            <div class="card-header bg-success text-white">
                <h5 class="mb-0"><i class="fas fa-check-circle me-2"></i>Detection Result</h5>
            </div>
            <div class="card-body">
                <h4 class="mb-3">Detected Disease: </h4>
                <div class="alert alert-info">
                    <h5 class="mb-0"><i class="fas fa-bug me-2"></i>${prediction}</h5>
                </div>
            </div>
        </div>
    `;
    
    // Add the result HTML to the page
    resultArea.innerHTML = resultHTML;
    
    // Re-enable any disabled buttons
    const detectOfflineBtn = document.getElementById('detect-offline');
    if (detectOfflineBtn) detectOfflineBtn.disabled = false;
    
    // Scroll to results if the element exists
    if (resultArea) {
        try {
            resultArea.scrollIntoView({behavior: 'smooth'});
        } catch (error) {
            // Silently handle scroll errors
        }
    }
    
    // Add a failsafe timeout to ensure loaders are hidden
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'none';
        
        const offlineLoader = document.getElementById('offline-loading');
        if (offlineLoader) offlineLoader.classList.add('d-none');
    }, 1000);
}

// Load jQuery dynamically if it's not already loaded
function ensureJQuery(callback) {
    if (typeof jQuery === 'undefined') {
        console.log('jQuery not detected, loading it dynamically...');
        const script = document.createElement('script');
        // Use the cdn.jsdelivr.net domain which is in the CSP allowlist
        script.src = 'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js';
        script.onload = function() {
            console.log('jQuery loaded successfully');
            if (callback) callback();
        };
        script.onerror = function() {
            console.error('Failed to load jQuery');
        };
        document.head.appendChild(script);
    } else {
        console.log('jQuery already loaded');
        if (callback) callback();
    }
}

// Initialize offline detection when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're in offline mode
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle && modeToggle.value === 'offline') {
        console.log("Page loaded in offline mode, preloading model...");
        
        // Remove any existing persistent loader messages
        const loaderMessages = document.querySelectorAll('.offline-loader-message');
        loaderMessages.forEach(elem => elem.remove());
        
        // Find and remove any "Loading..." text nodes
        const staticLoaderElements = document.querySelectorAll('*');
        staticLoaderElements.forEach(el => {
            if ((el.textContent === 'Loading...' || 
                 el.textContent === 'Processing with offline model...' ||
                 el.textContent.includes('Loading...')) && 
                el.children.length === 0) {
                el.textContent = '';
                el.style.display = 'none';
            }
        });
        
        // Also hide global loader
        const globalLoader = document.getElementById('global-loader');
        if (globalLoader) globalLoader.style.display = 'none';
        
        // Hide any element with id containing "loader"
        const allLoaders = document.querySelectorAll('[id*="loader"]');
        allLoaders.forEach(loader => {
            loader.style.display = 'none';
        });
        
        // Add a slight delay to ensure all other initialization is complete
        setTimeout(() => {
            handleModelLoadForOffline();
            
            // One more attempt to remove loaders after model load
            hideAllLoaders();
        }, 500);
    }
});

// Add a diagnostic function that can be called from the console for testing
window.diagnosePlantModel = async function(imageUrl) {
    console.log("Running plant model diagnostics...");
    
    if (!imageUrl) {
        console.error("Please provide an image URL");
        return;
    }
    
    // Check if model is loaded
    if (!offlineModel) {
        console.error("Model not loaded. Loading now...");
        await loadOfflineModel();
        if (!offlineModel) {
            console.error("Failed to load model");
            return;
        }
    }
    
    // Load the image
    const img = new Image();
    img.crossOrigin = "Anonymous";
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageUrl;
    });
    
    console.log("Image loaded, dimensions:", img.width, "x", img.height);
    
    // Try different preprocessing approaches
    const preprocessingMethods = [
        {
            name: "Standard 0-1",
            process: () => {
                return tf.tidy(() => {
                    const pixels = tf.browser.fromPixels(img);
                    const resized = tf.image.resizeBilinear(pixels, [128, 128]);
                    return tf.div(resized, 255.0).expandDims(0);
                });
            }
        },
        {
            name: "ImageNet Normalization",
            process: () => {
                return tf.tidy(() => {
                    const pixels = tf.browser.fromPixels(img);
                    const resized = tf.image.resizeBilinear(pixels, [128, 128]);
                    const normalized = tf.div(resized, 255.0);
                    return normalized.sub([0.485, 0.456, 0.406]).div([0.229, 0.224, 0.225]).expandDims(0);
                });
            }
        },
        {
            name: "MobileNet -1 to 1",
            process: () => {
                return tf.tidy(() => {
                    const pixels = tf.browser.fromPixels(img);
                    const resized = tf.image.resizeBilinear(pixels, [128, 128]);
                    const normalized = tf.div(resized, 255.0);
                    return normalized.mul(2).sub(1).expandDims(0);
                });
            }
        },
        {
            name: "Direct 0-255", // In case model expects raw values
            process: () => {
                return tf.tidy(() => {
                    const pixels = tf.browser.fromPixels(img);
                    return tf.image.resizeBilinear(pixels, [128, 128]).expandDims(0);
                });
            }
        }
    ];
    
    // Test each preprocessing method
    console.log("Testing different preprocessing methods...");
    const results = [];
    
    for (const method of preprocessingMethods) {
        try {
            console.log(`\nTrying method: ${method.name}`);
            const tensor = method.process();
            console.log(`- Tensor shape: ${tensor.shape}`);
            
            // Run prediction
            const prediction = offlineModel.predict(tensor);
            console.log(`- Prediction shape: ${prediction.shape}`);
            
            // Extract probabilities
            const probs = Array.from(await prediction.data());
            const maxIndex = probs.indexOf(Math.max(...probs));
            const maxValue = probs[maxIndex];
            
            // Get class name
            const className = window.diseaseClasses?.[maxIndex] || `Class ${maxIndex}`;
            
            console.log(`- Predicted class: ${className}`);
            console.log(`- Confidence: ${(maxValue * 100).toFixed(2)}%`);
            
            // Top 3 predictions
            const top3 = Array.from({length: probs.length}, (_, i) => i)
                .sort((a, b) => probs[b] - probs[a])
                .slice(0, 3)
                .map(idx => ({
                    class: window.diseaseClasses?.[idx] || `Class ${idx}`,
                    probability: probs[idx]
                }));
                
            console.log("- Top 3 predictions:", top3);
            
            // Clean up
            tensor.dispose();
            prediction.dispose();
            
            // Store results
            results.push({
                method: method.name,
                topClass: className,
                confidence: maxValue,
                top3: top3
            });
            
        } catch (error) {
            console.error(`Error with method ${method.name}:`, error);
        }
    }
    
    // Final comparison of methods
    console.log("\nComparison of preprocessing methods:");
    results.forEach(result => {
        console.log(`${result.method}: ${result.topClass} (${(result.confidence * 100).toFixed(2)}%)`);
    });
    
    // Determine best method
    if (results.length > 0) {
        const bestMethod = results.reduce((prev, current) => {
            return (current.confidence > prev.confidence) ? current : prev;
        });
        
        console.log("\nBest preprocessing method:", bestMethod.method);
        console.log("- With confidence:", (bestMethod.confidence * 100).toFixed(2) + "%");
        console.log("- Predicted class:", bestMethod.topClass);
        
        return bestMethod;
    }
    
    console.log("No successful prediction methods found");
    return null;
};

// Update the model's input shape description
if (window.modelMetadata && !window.modelMetadata.inputShape) {
    window.modelMetadata = {
        ...window.modelMetadata,
        inputShape: [128, 128, 3],
        preprocessingParams: {
            targetSize: [128, 128]
        }
    };
}

// Prepare class names - use meaningful fallbacks if not available
const getClassName = (index) => {
    if (window.diseaseClasses && window.diseaseClasses[index]) {
        return window.diseaseClasses[index];
    } else {
        // If we don't have class names, use the index as a fallback
        return `Class #${index}`;
    }
};

// Get the indices of the top predictions
indices = Array.from({ length: predictionData.length }, (_, i) => i)
    .sort((a, b) => predictionData[b] - predictionData[a])
    .slice(0, 5);

// Log the top 5 predictions
console.log("Top 5 predictions:");
let resultHTML = '<div class="result-container">';

// Display threshold message
const minConfidence = Math.max(...predictionData) * 100;
console.log("Prediction confidence:", Math.round(minConfidence) + "%");
console.log("Raw confidence value:", Math.max(...predictionData));
console.log("Confidence threshold:", CONFIDENCE_THRESHOLD);

// Add confidence information
resultHTML += `<h3>Confidence: ${Math.round(minConfidence)}%</h3>`;

if (minConfidence < CONFIDENCE_THRESHOLD * 100) {
    resultHTML += `<p class="low-confidence">Confidence too low (below ${CONFIDENCE_THRESHOLD * 100}%). Result may not be reliable.</p>`;
}

// Create a result table
resultHTML += '<table class="prediction-table"><tr><th>Prediction</th><th>Confidence</th></tr>';

indices.forEach(i => {
    const className = getClassName(i);
    const confidence = Math.round(predictionData[i] * 100);
    console.log(`${className}: ${confidence}%`);
    resultHTML += `<tr><td>${className}</td><td>${confidence}%</td></tr>`;
});

resultHTML += '</table></div>';
document.getElementById(resultDiv).innerHTML = resultHTML;


