/**
 * Firebase Configuration
 * 
 * This file is responsible for initializing Firebase services.
 * The Firebase configuration is passed from the backend.
 */

// Check if Firebase apps are already initialized
if (!firebase.apps.length) {
  // Firebase is already initialized in the HTML template
  console.log("Using Firebase configuration from server");
} else {
  console.log("Firebase already initialized, using existing app");
  firebase.app(); // If already initialized, use the existing app
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore && firebase.firestore();
const storage = firebase.storage && firebase.storage();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Additional auth settings
if (auth) {
  // Enable persistence to improve the user experience
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(error => {
      console.error("Auth persistence error:", error);
    });

  // Use user's preferred language
  auth.useDeviceLanguage();
  
  // The onAuthStateChanged observer is now handled in index.html
  // to avoid conflicts and duplicate event handlers
} 