import numpy as np
import os
import tensorflow as tf

# Try to load the model
print("Attempting to load model.h5...")
try:
    model = tf.keras.models.load_model('model.h5')
    print("Model loaded successfully!")
    
    # Try creating a dummy input and make a prediction
    print("\nCreating a dummy input for prediction test...")
    dummy_input = np.random.random((1, 128, 128, 3))
    
    print("Running prediction...")
    prediction = model.predict(dummy_input, verbose=1)
    
    print(f"\nPrediction shape: {prediction.shape}")
    print(f"Max confidence: {np.max(prediction):.4f}")
    print(f"Predicted class: {np.argmax(prediction[0])}")
    
except Exception as e:
    print(f"Error loading or using the model: {e}") 