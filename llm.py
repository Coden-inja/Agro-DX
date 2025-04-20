from google import genai
from config import Config
import os
import requests
import httpx

# Set up Gemini API key
try:
    client = genai.Client(api_key=Config.GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

# Function to detect plant disease based on user input
def detect_disease(symptoms):
    """
    Process symptoms and return plant disease information.
    May raise network-related exceptions if API is unreachable.
    """
    if not client:
        return "Error: Gemini API client could not be initialized. Check your API key."
    
    # Fallback response in case of error
    fallback_response = """
    Disease: Unable to determine

    Description: The service encountered an error while processing your request.

    Treatment:
    - Without a specific diagnosis, consult with a local agricultural extension office
    - Take clear photos of affected plants for in-person consultation
    - Consider isolating affected plants as a precaution

    Prevention:
    - Maintain good garden hygiene
    - Ensure proper spacing between plants
    - Water at the base to keep foliage dry

    References:
    - Local agricultural extension services
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[f"""The user describes the following plant symptoms: {symptoms}. 
            
            1. First, identify the most likely plant disease based on these symptoms. 
            2. Then provide detailed information about:
               - Treatment options for this disease
               - Prevention measures for future outbreaks
               - Citations or references to scientific sources about the treatment and prevention
               
            Format your response as a structured JSON-like object, but in plain text:
            
            Disease: [Disease name]
            
            Description: [Brief description of the disease]
            
            Treatment:
            - [Treatment option 1]
            - [Treatment option 2]
            - [Treatment option 3]
            
            Prevention:
            - [Prevention measure 1]
            - [Prevention measure 2]
            - [Prevention measure 3]
            
            References:
            - [Reference 1: Author, Title, Source, Year]
            - [Reference 2: Author, Title, Source, Year]
            - [Reference 3: Author, Title, Source, Year]
            
            Keep your response concise but informative. If you can't determine the disease with confidence, state that clearly.
            """]
        )
       
        return response.text if response else "Unable to determine the disease."
    
    except (requests.exceptions.RequestException, httpx.ConnectError) as e:
        # Network-related errors should be raised to be handled by the caller
        raise
    
    except Exception as e:
        # Log the error but return a user-friendly message
        print(f"Error in disease detection API: {e}")
        return fallback_response

if __name__ == "__main__":
    try:
        user_input = input("Describe the plant symptoms: ")
        disease_prediction = detect_disease(user_input)
        print("\nPotential Disease(s):")
        print(disease_prediction)
    except Exception as e:
        print(f"Error: {e}")
