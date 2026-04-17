// Chatbot functionality
class LibraryChatbot {
    constructor() {
        this.isOpen = false;
        this.userName = null;
        this.init();
    }

    init() {
        // Get user info from localStorage
        const user = this.getUser();
        if (user && user.name) {
            this.userName = user.name;
        }

        // DOM elements
        this.chatToggle = document.getElementById('chatToggle');
        this.chatContainer = document.getElementById('chatContainer');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendMessage');
        this.closeButton = document.getElementById('closeChat');
        this.greetingMessage = document.getElementById('greetingMessage');

        // Event listeners
        this.chatToggle.addEventListener('click', () => this.toggleChat());
        this.closeButton.addEventListener('click', () => this.closeChat());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Update greeting with user name
        this.updateGreeting();
    }

    getUser() {
        // Try to get user from localStorage (adjust based on your auth system)
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    updateGreeting() {
        if (this.userName) {
            this.greetingMessage.textContent = `Welcome back, ${this.userName}! 👋`;
        } else {
            this.greetingMessage.textContent = `Welcome! How can I help you today?`;
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.chatContainer.style.display = 'flex';
            this.chatToggle.querySelector('.chat-icon').style.display = 'none';
            this.chatToggle.querySelector('.close-icon').style.display = 'flex';
            this.chatInput.focus();
        } else {
            this.closeChat();
        }
    }

    closeChat() {
        this.isOpen = false;
        this.chatContainer.style.display = 'none';
        this.chatToggle.querySelector('.chat-icon').style.display = 'flex';
        this.chatToggle.querySelector('.close-icon').style.display = 'none';
    }

    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.chatInput.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Get bot response after short delay
        setTimeout(() => {
            this.removeTypingIndicator();
            const response = this.getBotResponse(message);
            this.addMessage(response, 'bot');
        }, 500);
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = text;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typingIndicator';
        
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'typing-indicator';
        indicatorDiv.innerHTML = '<span></span><span></span><span></span>';
        
        typingDiv.appendChild(indicatorDiv);
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    getBotResponse(message) {
        const msg = message.toLowerCase();
        
        // Greeting responses
        if (this.userName) {
            if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
                return `Hello ${this.userName}! 👋 How can I assist you with the library today?`;
            }
        } else {
            if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
                return `Hello! 👋 Welcome to LibraryHub. How can I help you today?`;
            }
        }

        // Book-related queries
        if (msg.includes('book') && (msg.includes('find') || msg.includes('search') || msg.includes('look for'))) {
            return `📖 To find books, you can:<br>
                    • Use the search bar on the homepage<br>
                    • Browse by category or author<br>
                    • Check availability in real-time<br>
                    Would you like me to help you search for a specific book?`;
        }
        
        if (msg.includes('borrow') || msg.includes('loan')) {
            return `📚 To borrow books:<br>
                    1. Find the book using our search system<br>
                    2. Check if it's available<br>
                    3. Visit the library counter with your student ID<br>
                    4. Books can be borrowed for 14 days<br>
                    Need help with anything specific?`;
        }
        
        if (msg.includes('return') || msg.includes('returning')) {
            return `🔄 To return books:<br>
                    • Bring books to the library counter<br>
                    • Use the self-return kiosk (available 24/7)<br>
                    • Late returns may incur fees<br>
                    Need to know your due dates?`;
        }

        // Seat booking queries
        if (msg.includes('seat') || msg.includes('booking') || msg.includes('reserve')) {
            return `🪑 Seat Booking Information:<br>
                    • Total seats available: 32<br>
                    • Book seats through the "Book New Seat" button<br>
                    • Each booking lasts 30 minutes to 4 hours<br>
                    • View real-time availability on the dashboard<br>
                    Would you like to book a seat now?`;
        }

        // Library hours
        if (msg.includes('hour') || msg.includes('timing') || msg.includes('open') || msg.includes('close')) {
            return `⏰ Library Hours:<br>
                    Monday - Friday: 8:00 AM - 10:00 PM<br>
                    Saturday: 9:00 AM - 8:00 PM<br>
                    Sunday: 10:00 AM - 6:00 PM<br>
                    *Hours may vary during holidays*`;
        }

        // Location
        if (msg.includes('location') || msg.includes('where') || msg.includes('address')) {
            return `📍 Our Location:<br>
                    Main Library Building, 2nd Floor<br>
                    University Campus, Block C<br>
                    Near the Student Center<br>
                    Need directions?`;
        }

        // Membership
        if (msg.includes('member') || msg.includes('register') || msg.includes('sign up') || msg.includes('join')) {
            return `💳 Library Membership:<br>
                    • All students and staff are automatically members<br>
                    • Use your student/staff ID to borrow books<br>
                    • Need to renew your membership? Visit the library counter<br>
                    For more details, contact the library office.`;
        }

        // Help
        if (msg.includes('help') || msg.includes('what can you do') || msg.includes('support')) {
            return `🆓 I can help you with:<br>
                    • 📖 Finding and borrowing books<br>
                    • 🪑 Booking library seats<br>
                    • ⏰ Library hours and location<br>
                    • 💳 Membership information<br>
                    • 📅 Events and workshops<br>
                    • ❓ Answering any library-related questions<br>
                    Just ask me anything!`;
        }

        // About library
        if (msg.includes('about') || msg.includes('facility') || msg.includes('amenities')) {
            return `🏛️ Library Facilities:<br>
                    • Study areas (silent and group zones)<br>
                    • Computer lab with 50 PCs<br>
                    • Wi-Fi throughout the building<br>
                    • Printing and scanning services<br>
                    • Reading lounge with newspapers/magazines<br>
                    • 24/7 study area available<br>
                    Anything specific you'd like to know?`;
        }

        // Events
        if (msg.includes('event') || msg.includes('workshop') || msg.includes('seminar')) {
            return `📅 Upcoming Events:<br>
                    • Weekly book club meetings (Wednesdays, 4 PM)<br>
                    • Research writing workshop (Friday, 2 PM)<br>
                    • Digital literacy sessions (Tuesdays)<br>
                    Check the notice board or ask at the counter for more details!`;
        }

        // Fine/Fees
        if (msg.includes('fine') || msg.includes('fee') || msg.includes('penalty') || msg.includes('late')) {
            return `💰 Late Return Fees:<br>
                    • Books: $0.50 per day<br>
                    • Reference materials: $1.00 per day<br>
                    • Reserve items: $2.00 per hour<br>
                    Pay fines at the library counter or online through your account.`;
        }

        // Contact
        if (msg.includes('contact') || msg.includes('email') || msg.includes('phone') || msg.includes('call')) {
            return `📞 Contact Us:<br>
                    • Phone: +1 (555) 123-4567<br>
                    • Email: library@libraryhub.com<br>
                    • Instagram: @libraryhub<br>
                    • Facebook: LibraryHub Official<br>
                    Response time: Within 24 hours`;
        }

        // Default response
        return `I'm here to help with library-related questions! 📚<br><br>
                You can ask me about:<br>
                • 📖 Books (finding, borrowing, returning)<br>
                • 🪑 Seat booking and availability<br>
                • ⏰ Library hours and location<br>
                • 💳 Membership and registration<br>
                • 📅 Events and workshops<br>
                • 💰 Fines and fees<br>
                • 📞 Contact information<br><br>
                What would you like to know?`;
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new LibraryChatbot();
});