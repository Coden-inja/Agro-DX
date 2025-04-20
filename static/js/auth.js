// Handle user registration
async function registerUser(email, password, displayName) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({
      displayName: displayName
    });
    
    // Create user document in Firestore
    await db.collection('users').doc(userCredential.user.uid).set({
      displayName: displayName,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    closeAllModals();
    showAlert('Registration successful!', 'success');
    
    // Reset button state explicitly
    const registerButton = document.querySelector('#registerForm button[type="submit"]');
    if (registerButton) {
      registerButton.disabled = false;
      registerButton.innerHTML = 'Register';
    }
    
    return userCredential.user;
  } catch (error) {
    console.error("Registration error:", error);
    showAlert('Registration failed: ' + error.message, 'danger');
    throw error;
  }
}

// Handle user login
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    
    // Update last login timestamp
    await db.collection('users').doc(userCredential.user.uid).update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
      // If document doesn't exist, create it
      if (err.code === 'not-found') {
        return db.collection('users').doc(userCredential.user.uid).set({
          displayName: userCredential.user.displayName || email.split('@')[0],
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      throw err;
    });
    
    closeAllModals();
    showAlert('Login successful!', 'success');
    
    // Reset button state explicitly
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Login';
    }
    
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    showAlert('Login failed: ' + error.message, 'danger');
    throw error;
  }
}

// Handle Google sign-in
async function signInWithGoogle() {
  try {
    // Add a CSP-compatible approach
    document.body.style.overflow = 'hidden'; // Prevent scrolling while popup is open
    
    // Try popup with fallback to redirect
    try {
      const result = await auth.signInWithPopup(googleProvider);
      document.body.style.overflow = ''; // Restore scrolling
      
      // Reset Google buttons immediately
      resetGoogleButtons();
      
      // Handle successful sign-in
      await handleGoogleSignInSuccess(result);
      return result.user;
    } catch (popupError) {
      document.body.style.overflow = ''; // Restore scrolling
      
      console.warn("Popup sign-in error:", popupError);
      
      // Handle domain authorization errors specifically
      if (popupError.message && (popupError.message.includes('domain') || 
          (popupError.message.includes('not authorized') && 
           (popupError.message.includes('127.0.0.1') || popupError.message.includes('localhost'))))) {
        
        resetGoogleButtons();
        
        // Show detailed guidance for domain authorization error
        showAlert(`
          This domain is not authorized for Google sign-in. 
          To fix this:
          1. Go to Firebase Console → Authentication → Sign-in method
          2. Edit Google provider settings
          3. Add both "127.0.0.1" and "localhost" to Authorized domains
        `, 'danger');
        
        throw popupError;
      }
      
      // Only use redirect for specific popup errors
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request') {
        
        // Show message before redirect
        showAlert('Popup was blocked. Redirecting to Google sign-in page...', 'warning');
        
        // Reset Google buttons and attempt redirect
        resetGoogleButtons();
        
        // Short delay to allow user to see message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Use redirect method for mobile or popup blocked situations
        await auth.signInWithRedirect(googleProvider);
        return null; // This won't be reached as redirect happens
      } else {
        throw popupError; // Rethrow other errors
      }
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    
    // Don't show generic error if we already showed a specific domain error message
    if (!error.message || !error.message.includes('domain')) {
      showAlert('Google sign-in failed: ' + error.message, 'danger');
    }
    
    // Reset Google buttons
    resetGoogleButtons();
    
    throw error;
  }
}

// Helper function to reset Google buttons
function resetGoogleButtons() {
  const googleSignInBtn = document.getElementById('googleSignIn');
  const googleSignUpBtn = document.getElementById('googleSignUp');
  
  if (googleSignInBtn) {
    googleSignInBtn.disabled = false;
    googleSignInBtn.innerHTML = '<i class="fab fa-google me-2"></i> Sign in with Google';
  }
  
  if (googleSignUpBtn) {
    googleSignUpBtn.disabled = false;
    googleSignUpBtn.innerHTML = '<i class="fab fa-google me-2"></i> Sign up with Google';
  }
}

// Helper function to handle successful Google sign-in
async function handleGoogleSignInSuccess(result) {
  // Check if this is a new user
  const isNewUser = result.additionalUserInfo.isNewUser;
  
  if (isNewUser) {
    // Create user document in Firestore for new Google sign-ins
    await db.collection('users').doc(result.user.uid).set({
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    // Update last login timestamp
    await db.collection('users').doc(result.user.uid).update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      photoURL: result.user.photoURL // Update photo URL in case it changed
    }).catch(err => {
      // If document doesn't exist for some reason, create it
      if (err.code === 'not-found') {
        return db.collection('users').doc(result.user.uid).set({
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      throw err;
    });
  }
  
  closeAllModals();
  showAlert('Google sign-in successful!', 'success');
  return result.user;
}

// Log out user
async function logoutUser() {
  try {
    await auth.signOut();
    showAlert('Logged out successfully!', 'success');
  } catch (error) {
    console.error("Logout error:", error);
    showAlert('Logout failed: ' + error.message, 'danger');
    throw error;
  }
}

// Password reset
async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    closeAllModals();
    showAlert('Password reset email sent. Check your inbox.', 'info');
  } catch (error) {
    console.error("Password reset error:", error);
    showAlert('Password reset failed: ' + error.message, 'danger');
    throw error;
  }
}

// Helper function to close all modals
function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    const modalInstance = bootstrap.Modal.getInstance(modal);
    if (modalInstance) modalInstance.hide();
  });
}

// Helper function to show alerts
function showAlert(message, type, isLocationRequest = false) {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  
  let alertContent = message;
  
  if (isLocationRequest) {
    alertContent += `
      <div class="mt-2">
        <button class="btn btn-sm btn-success me-2" onclick="requestLocationPermission()">Enable Location</button>
        <button class="btn btn-sm btn-secondary" onclick="this.closest('.alert').remove()">Not Now</button>
      </div>
    `;
  } else {
    alertContent += `
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
  }
  
  alertDiv.innerHTML = alertContent;
  alertContainer.appendChild(alertDiv);
  
  if (!isLocationRequest) {
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);
  }
}

// Function to request location permission
function requestLocationPermission() {
  if (!navigator.geolocation) {
    showAlert('Geolocation is not supported by your browser.', 'warning');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Store the location in Firebase
      const user = firebase.auth().currentUser;
      if (user) {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString()
        };
        
        firebase.firestore().collection('users').doc(user.uid).update({
          lastKnownLocation: locationData
        }).then(() => {
          showAlert('Location permission granted and saved.', 'success');
        }).catch((error) => {
          console.error('Error saving location:', error);
          showAlert('Error saving location data.', 'danger');
        });
      }
    },
    (error) => {
      let errorMessage = 'Error getting location: ';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Please allow location access in your browser settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage += 'Location request timed out.';
          break;
        default:
          errorMessage += 'An unknown error occurred.';
      }
      showAlert(errorMessage, 'warning');
    }
  );
}

// Update UI based on authentication state
function updateUIForAuthState(user) {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userDisplay = document.getElementById('userDisplay');
  const dashboardBtn = document.getElementById('dashboardBtn');
  
  if (!loginBtn || !registerBtn || !logoutBtn || !userDisplay) return;
  
  if (user) {
    // User is signed in
    loginBtn.classList.add('d-none');
    registerBtn.classList.add('d-none');
    logoutBtn.classList.remove('d-none');
    userDisplay.classList.remove('d-none');
    if (dashboardBtn) {
      dashboardBtn.classList.remove('d-none');
    }
    
    // Display user info
    const displayName = user.displayName || user.email.split('@')[0];
    userDisplay.querySelector('.user-name').textContent = displayName;
  } else {
    // User is signed out
    loginBtn.classList.remove('d-none');
    registerBtn.classList.remove('d-none');
    logoutBtn.classList.add('d-none');
    userDisplay.classList.add('d-none');
    if (dashboardBtn) {
      dashboardBtn.classList.add('d-none');
    }
  }
}

// Setup event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Reset any busy button states that might have persisted through redirects
  const resetButtonStates = () => {
    // Google sign-in buttons
    const googleSignInBtn = document.getElementById('googleSignIn');
    if (googleSignInBtn) {
      googleSignInBtn.disabled = false;
      googleSignInBtn.innerHTML = '<i class="fab fa-google me-2"></i> Sign in with Google';
    }
    
    const googleSignUpBtn = document.getElementById('googleSignUp');
    if (googleSignUpBtn) {
      googleSignUpBtn.disabled = false;
      googleSignUpBtn.innerHTML = '<i class="fab fa-google me-2"></i> Sign up with Google';
    }
    
    // Other buttons
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Login';
    }
    
    const registerButton = document.querySelector('#registerForm button[type="submit"]');
    if (registerButton) {
      registerButton.disabled = false;
      registerButton.innerHTML = 'Register';
    }
    
    const resetButton = document.querySelector('#resetForm button[type="submit"]');
    if (resetButton) {
      resetButton.disabled = false;
      resetButton.innerHTML = 'Send Reset Link';
    }
    
    // Phone auth buttons
    const sendLoginCode = document.getElementById('sendLoginCode');
    if (sendLoginCode) {
      sendLoginCode.disabled = false;
      sendLoginCode.innerHTML = 'Send Verification Code';
    }
    
    const verifyLoginCode = document.getElementById('verifyLoginCode');
    if (verifyLoginCode) {
      verifyLoginCode.disabled = false;
      verifyLoginCode.innerHTML = 'Verify Code';
    }
    
    const sendRegisterCode = document.getElementById('sendRegisterCode');
    if (sendRegisterCode) {
      sendRegisterCode.disabled = false;
      sendRegisterCode.innerHTML = 'Send Verification Code';
    }
    
    const verifyRegisterCode = document.getElementById('verifyRegisterCode');
    if (verifyRegisterCode) {
      verifyRegisterCode.disabled = false;
      verifyRegisterCode.innerHTML = 'Verify & Register';
    }
  };
  
  // Call immediately to reset any buttons
  resetButtonStates();
  
  // Also check for redirect result from Google sign-in
  auth.getRedirectResult().then(result => {
    if (result.user) {
      // User successfully signed in with redirect
      handleGoogleSignInSuccess(result);
    }
  }).catch(error => {
    if (error.code !== 'auth/null-credential') {
      console.error("Redirect result error:", error);
      showAlert('Sign-in error: ' + error.message, 'danger');
    }
  });

  // Register form event listener
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const displayName = document.getElementById('registerName').value;
      
      try {
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
        }
        
        await registerUser(email, password, displayName);
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Register';
        }
      } catch (error) {
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Register';
        }
        // Error already handled in registerUser function
      }
    });
  }
  
  // Login form event listener
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      try {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
        }
        
        await loginUser(email, password);
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Login';
        }
      } catch (error) {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Login';
        }
        // Error already handled in loginUser function
      }
    });
  }
  
  // Phone Authentication Listeners
  // Initialize recaptcha verifiers
  let loginRecaptchaVerifier, registerRecaptchaVerifier;
  let loginConfirmationResult, registerConfirmationResult;
  
  // Initialize login recaptcha on tab change
  document.getElementById('phone-login-tab')?.addEventListener('click', () => {
    if (!loginRecaptchaVerifier) {
      loginRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('login-recaptcha-container', {
        size: 'normal',
        callback: () => {
          document.getElementById('sendLoginCode').disabled = false;
        }
      });
      loginRecaptchaVerifier.render();
    }
  });
  
  // Initialize register recaptcha on tab change
  document.getElementById('phone-register-tab')?.addEventListener('click', () => {
    if (!registerRecaptchaVerifier) {
      registerRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('register-recaptcha-container', {
        size: 'normal',
        callback: () => {
          document.getElementById('sendRegisterCode').disabled = false;
        }
      });
      registerRecaptchaVerifier.render();
    }
  });
  
  // Send login verification code
  document.getElementById('sendLoginCode')?.addEventListener('click', async () => {
    const phoneNumber = document.getElementById('loginPhone').value;
    const sendButton = document.getElementById('sendLoginCode');
    
    if (!phoneNumber) {
      showAlert('Please enter a valid phone number', 'warning');
      return;
    }
    
    try {
      sendButton.disabled = true;
      sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
      
      loginConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, loginRecaptchaVerifier);
      
      // Show verification code input
      document.getElementById('phone-auth-step-1').style.display = 'none';
      document.getElementById('phone-auth-step-2').style.display = 'block';
      
      showAlert('Verification code sent to your phone', 'success');
    } catch (error) {
      console.error("Error sending verification code:", error);
      showAlert('Error sending code: ' + error.message, 'danger');
      
      sendButton.disabled = false;
      sendButton.innerHTML = 'Send Verification Code';
      
      // Reset recaptcha
      loginRecaptchaVerifier.reset();
      loginRecaptchaVerifier = null;
      document.getElementById('login-recaptcha-container').innerHTML = '';
    }
  });
  
  // Verify login code
  document.getElementById('phoneLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const verificationCode = document.getElementById('loginVerificationCode').value;
    const verifyButton = document.getElementById('verifyLoginCode');
    
    if (!verificationCode) {
      showAlert('Please enter the verification code', 'warning');
      return;
    }
    
    try {
      verifyButton.disabled = true;
      verifyButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';
      
      const result = await loginConfirmationResult.confirm(verificationCode);
      
      // Update user profile if needed and create/update document in Firestore
      await db.collection('users').doc(result.user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        phoneNumber: result.user.phoneNumber
      }).catch(err => {
        // If document doesn't exist, create it
        if (err.code === 'not-found') {
          return db.collection('users').doc(result.user.uid).set({
            phoneNumber: result.user.phoneNumber,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        throw err;
      });
      
      closeAllModals();
      showAlert('Phone login successful!', 'success');
      
      // Reset form and buttons
      verifyButton.disabled = false;
      verifyButton.innerHTML = 'Verify Code';
      document.getElementById('phoneLoginForm').reset();
      document.getElementById('phone-auth-step-1').style.display = 'block';
      document.getElementById('phone-auth-step-2').style.display = 'none';
    } catch (error) {
      console.error("Error verifying code:", error);
      showAlert('Error verifying code: ' + error.message, 'danger');
      
      verifyButton.disabled = false;
      verifyButton.innerHTML = 'Verify Code';
    }
  });
  
  // Send register verification code
  document.getElementById('sendRegisterCode')?.addEventListener('click', async () => {
    const phoneNumber = document.getElementById('registerPhone').value;
    const sendButton = document.getElementById('sendRegisterCode');
    
    if (!phoneNumber) {
      showAlert('Please enter a valid phone number', 'warning');
      return;
    }
    
    try {
      sendButton.disabled = true;
      sendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
      
      registerConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, registerRecaptchaVerifier);
      
      // Show verification code input
      document.getElementById('phone-reg-step-1').style.display = 'none';
      document.getElementById('phone-reg-step-2').style.display = 'block';
      
      showAlert('Verification code sent to your phone', 'success');
    } catch (error) {
      console.error("Error sending verification code:", error);
      showAlert('Error sending code: ' + error.message, 'danger');
      
      sendButton.disabled = false;
      sendButton.innerHTML = 'Send Verification Code';
      
      // Reset recaptcha
      registerRecaptchaVerifier.reset();
      registerRecaptchaVerifier = null;
      document.getElementById('register-recaptcha-container').innerHTML = '';
    }
  });
  
  // Verify register code and create account
  document.getElementById('phoneRegisterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const verificationCode = document.getElementById('registerVerificationCode').value;
    const displayName = document.getElementById('registerName2').value;
    const verifyButton = document.getElementById('verifyRegisterCode');
    
    if (!verificationCode) {
      showAlert('Please enter the verification code', 'warning');
      return;
    }
    
    if (!displayName) {
      showAlert('Please enter your name', 'warning');
      return;
    }
    
    try {
      verifyButton.disabled = true;
      verifyButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';
      
      const result = await registerConfirmationResult.confirm(verificationCode);
      
      // Update user profile
      await result.user.updateProfile({
        displayName: displayName
      });
      
      // Create user document in Firestore
      await db.collection('users').doc(result.user.uid).set({
        displayName: displayName,
        phoneNumber: result.user.phoneNumber,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      closeAllModals();
      showAlert('Phone registration successful!', 'success');
      
      // Reset form and buttons
      verifyButton.disabled = false;
      verifyButton.innerHTML = 'Verify & Register';
      document.getElementById('phoneRegisterForm').reset();
      document.getElementById('phone-reg-step-1').style.display = 'block';
      document.getElementById('phone-reg-step-2').style.display = 'none';
    } catch (error) {
      console.error("Error verifying code:", error);
      showAlert('Error verifying code: ' + error.message, 'danger');
      
      verifyButton.disabled = false;
      verifyButton.innerHTML = 'Verify & Register';
    }
  });
  
  // Google sign-in buttons
  const googleSignInBtn = document.getElementById('googleSignIn');
  const googleSignUpBtn = document.getElementById('googleSignUp');
  
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      try {
        googleSignInBtn.disabled = true;
        googleSignInBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
        
        await signInWithGoogle();
        
        // We don't reset the button here because the page might redirect
        // The button state will be reset when the page loads again
      } catch (error) {
        googleSignInBtn.disabled = false;
        googleSignInBtn.innerHTML = '<i class="fab fa-google me-2"></i> Sign in with Google';
        // Error already handled in signInWithGoogle function
      }
    });
  }
  
  if (googleSignUpBtn) {
    googleSignUpBtn.addEventListener('click', async () => {
      try {
        googleSignUpBtn.disabled = true;
        googleSignUpBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing up...';
        
        await signInWithGoogle();
        
        // We don't reset the button here because the page might redirect
        // The button state will be reset when the page loads again
      } catch (error) {
        googleSignUpBtn.disabled = false;
        googleSignUpBtn.innerHTML = '<i class="fab fa-google me-2"></i> Sign up with Google';
        // Error already handled in signInWithGoogle function
      }
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        logoutBtn.disabled = true;
        await logoutUser();
        logoutBtn.disabled = false;
      } catch (error) {
        logoutBtn.disabled = false;
        // Error already handled in logoutUser function
      }
    });
  }
  
  // Password reset form
  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value;
      
      try {
        const submitBtn = resetForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
        }
        
        await resetPassword(email);
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send Reset Link';
        }
      } catch (error) {
        const submitBtn = resetForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send Reset Link';
        }
        // Error already handled in resetPassword function
      }
    });
  }
}); 