import numpy as np
import os

# Try importing TensorFlow, but provide a fallback if it fails
try:
    import tensorflow as tf
    TENSORFLOW_AVAILABLE = True
except ImportError:
    print("Warning: TensorFlow could not be imported. Image-based detection may not work properly.")
    TENSORFLOW_AVAILABLE = False

def model_prediction(image_path, verbose=False):
    """
    Perform image-based disease detection.
    Returns the index of the detected disease or -1 if detection fails or model has low confidence.
    """
    try:
        if not TENSORFLOW_AVAILABLE:
            print("Error: TensorFlow is not available. Cannot make predictions.")
            return -1
            
        model = tf.keras.models.load_model('model.h5')
        image = tf.keras.preprocessing.image.load_img(image_path, target_size=(128, 128))
        input_arr = tf.keras.preprocessing.image.img_to_array(image)
        input_arr = np.array([input_arr])
        prediction = model.predict(input_arr, verbose=verbose)
        result_index = np.argmax(prediction)
        return result_index if prediction[0][result_index] > 0.4 else -1
    except Exception as e:
        print(f"Error in model prediction: {e}")
        return -1

# Class names for reference
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

# For standalone testing
if __name__ == "__main__":
    base_dir = os.getcwd()
    input_folder = os.path.join(base_dir, 'input_folder')
    input_images = sorted(os.listdir(input_folder))
    if not input_images:
        print("No images found in the input folder!")
        exit()
    else:
        image_path = os.path.join(input_folder, input_images[0])
        result_index = model_prediction(image_path)
        if result_index == -1:
            model_prediction = None
            print("Model is not confident about the prediction!")
        else:
            model_prediction = class_names[result_index]
            print(f"Disease Name: {model_prediction}")