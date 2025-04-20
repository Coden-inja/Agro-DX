document.addEventListener('DOMContentLoaded', function() {
    // Initialize the chatbot
    initChatbot();
});

function initChatbot() {
    // Create the chatbot button
    const chatbotButton = document.createElement('button');
    chatbotButton.className = 'chatbot-button';
    chatbotButton.innerHTML = '<i class="bi bi-plant"></i>';
    chatbotButton.setAttribute('aria-label', 'Open Plant Disease Assistant');
    document.body.appendChild(chatbotButton);

    // Create the chatbot container
    const chatbotContainer = document.createElement('div');
    chatbotContainer.className = 'chatbot-container';
    chatbotContainer.innerHTML = `
        <div class="chatbot-header">
            <h3><i class="bi bi-plant"></i> Plant Disease Assistant</h3>
            <button class="chatbot-close" aria-label="Close chatbot"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="chatbot-messages">
            <div class="message bot-message">
                Hello! I'm your Plant Disease Assistant. I can help you identify and treat plant diseases. 
                Please describe your plant's symptoms or ask me any questions about plant diseases.
            </div>
        </div>
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <div class="chatbot-input">
            <input type="text" placeholder="Type your message here..." aria-label="Type your message">
            <button type="button" aria-label="Send message"><i class="bi bi-send"></i></button>
        </div>
    `;
    document.body.appendChild(chatbotContainer);

    // Get elements
    const closeButton = chatbotContainer.querySelector('.chatbot-close');
    const messagesContainer = chatbotContainer.querySelector('.chatbot-messages');
    const inputField = chatbotContainer.querySelector('input');
    const sendButton = chatbotContainer.querySelector('button[type="button"]');
    const typingIndicator = chatbotContainer.querySelector('.typing-indicator');

    // Event listeners
    chatbotButton.addEventListener('click', function() {
        chatbotContainer.style.display = 'flex';
        inputField.focus();
    });

    closeButton.addEventListener('click', function() {
        chatbotContainer.style.display = 'none';
    });

    inputField.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !sendButton.disabled && inputField.value.trim()) {
            handleUserMessage();
        }
    });

    sendButton.addEventListener('click', function() {
        if (!sendButton.disabled && inputField.value.trim()) {
            handleUserMessage();
        }
    });

    // Handle user message
    function handleUserMessage() {
        const userMessage = inputField.value.trim();
        
        // Disable input while processing
        sendButton.disabled = true;
        inputField.disabled = true;
        
        // Add user message to chat
        addMessage(userMessage, 'user');
        
        // Clear input field
        inputField.value = '';
        
        // Show typing indicator
        typingIndicator.style.display = 'block';
        
        // Scroll to bottom
        scrollToBottom();
        
        // Send to backend
        sendToChatbot(userMessage);
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // Scroll chat to bottom
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send message to backend
    function sendToChatbot(message) {
        fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
            
            // Add bot response
            if (data.success) {
                addMessage(data.response, 'bot');
            } else {
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
                console.error('Chatbot error:', data.error);
            }
            
            // Re-enable input
            sendButton.disabled = false;
            inputField.disabled = false;
            inputField.focus();
        })
        .catch(error => {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
            
            // Add error message
            addMessage('Sorry, I encountered a connection error. Please try again.', 'bot');
            console.error('Fetch error:', error);
            
            // Re-enable input
            sendButton.disabled = false;
            inputField.disabled = false;
            inputField.focus();
        });
    }
} 