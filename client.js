// Local Storage based chat system
// State management
const state = {
  userId: null,
  username: null,
  conversationId: null,
  isConnected: false,
  rating: null,
};

// Generate unique ID
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// DOM Elements
const splashScreen = document.getElementById('splashScreen');
const chatScreen = document.getElementById('chatScreen');
const feedbackScreen = document.getElementById('feedbackScreen');
const startBtn = document.getElementById('startBtn');
const chatUsername = document.getElementById('chatUsername');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const endChatBtn = document.getElementById('endChatBtn');
const feedbackComment = document.getElementById('feedbackComment');
const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
const skipFeedbackBtn = document.getElementById('skipFeedbackBtn');
const reportModal = document.getElementById('reportModal');
const closeReportBtn = document.getElementById('closeReportBtn');
const cancelReportBtn = document.getElementById('cancelReportBtn');
const confirmReportBtn = document.getElementById('confirmReportBtn');

let reportingMessageId = null;

// Event Listeners
startBtn.addEventListener('click', startChat);
sendBtn.addEventListener('click', sendMessage);
endChatBtn.addEventListener('click', endChat);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

submitFeedbackBtn.addEventListener('click', submitFeedback);
skipFeedbackBtn.addEventListener('click', skipFeedback);
closeReportBtn.addEventListener('click', closeReportModal);
cancelReportBtn.addEventListener('click', closeReportModal);
confirmReportBtn.addEventListener('click', submitReport);

// Rating stars
document.querySelectorAll('.star').forEach((star) => {
  star.addEventListener('click', (e) => {
    const rating = e.target.dataset.rating;
    state.rating = parseInt(rating);
    document.querySelectorAll('.star').forEach((s, index) => {
      if (index < state.rating) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  });
});

// Functions
function generateUsername() {
  const adjectives = ['Bright', 'Swift', 'Calm', 'Bold', 'Wise', 'Kind', 'Noble', 'Free', 'Clear', 'Pure'];
  const nouns = ['Phoenix', 'Eagle', 'Spark', 'Wave', 'Star', 'Stone', 'River', 'Wind', 'Sun', 'Moon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

function startChat() {
  state.userId = generateId();
  state.username = generateUsername();
  state.conversationId = generateId();

  // Create conversation object
  const conversation = {
    id: state.conversationId,
    userId: state.userId,
    username: state.username,
    status: 'active',
    messages: [],
    rating: null,
    feedback: null,
    createdAt: new Date().toISOString(),
    endedAt: null,
  };
  
  saveConversation(conversation);

  chatUsername.textContent = `@${state.username}`;
  messagesContainer.innerHTML = '';
  addMessageToChat({
    message: `Welcome, <strong>${state.username}</strong>! Send your message and wait for an admin response.`,
    sender: 'system',
    timestamp: new Date().toISOString(),
  });

  splashScreen.classList.remove('active');
  chatScreen.classList.add('active');
  messageInput.focus();
  
  // Start monitoring for admin responses
  monitorForResponses();
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  messageInput.value = '';

  // Add to conversation messages
  const msgObj = {
    id: generateId(),
    sender: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };

  const conversation = getConversation();
  conversation.messages.push(msgObj);
  localStorage.setItem(`chat_${state.conversationId}`, JSON.stringify(conversation));

  addMessageToChat({
    message,
    sender: 'user',
    timestamp: msgObj.timestamp,
    messageId: msgObj.id,
    isFlagged: false,
  });

  updateStatus(false, 'Waiting for response...');
}

function addMessageToChat(data) {
  const messageGroup = document.createElement('div');
  messageGroup.className = `message-group ${data.sender || 'system'}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = data.message;

  messageGroup.appendChild(bubble);

  if (data.sender !== 'system') {
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';

    const time = new Date(data.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    timeDiv.textContent = time;

    if (data.isFlagged) {
      const flagged = document.createElement('span');
      flagged.className = 'message-flagged-indicator';
      flagged.textContent = 'Flagged';
      timeDiv.appendChild(flagged);
    }

    if (data.sender === 'admin' && data.messageId) {
      const reportBtn = document.createElement('button');
      reportBtn.className = 'message-report-btn';
      reportBtn.textContent = 'Report';
      reportBtn.addEventListener('click', () => openReportModal(data.messageId));
      timeDiv.appendChild(reportBtn);
    }

    messageGroup.appendChild(timeDiv);
  }

  messagesContainer.appendChild(messageGroup);
  scrollToBottom();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function endChat() {
  if (confirm('End this conversation? You will be asked to provide feedback.')) {
    const conversation = getConversation();
    conversation.status = 'ended';
    conversation.endedAt = new Date().toISOString();
    localStorage.setItem(`chat_${state.conversationId}`, JSON.stringify(conversation));

    chatScreen.classList.remove('active');
    feedbackScreen.classList.add('active');
    state.rating = null;
    document.querySelectorAll('.star').forEach((s) => s.classList.remove('active'));
    feedbackComment.value = '';
  }
}

function openReportModal(messageId) {
  reportingMessageId = messageId;
  reportModal.classList.remove('hidden');
}

function closeReportModal() {
  reportModal.classList.add('hidden');
  reportingMessageId = null;
  document.querySelectorAll('input[name="report-reason"]').forEach((r) => (r.checked = false));
}

function submitReport() {
  const reason = document.querySelector('input[name="report-reason"]:checked')?.value;
  if (!reason) {
    alert('Please select a reason');
    return;
  }

  // Store report
  const reports = JSON.parse(localStorage.getItem('all_reports') || '[]');
  reports.push({
    id: generateId(),
    conversationId: state.conversationId,
    messageId: reportingMessageId,
    reason,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem('all_reports', JSON.stringify(reports));

  closeReportModal();
  alert('Thank you for reporting. Our team will review this message.');
}

function submitFeedback() {
  const comment = feedbackComment.value.trim();

  if (!state.rating) {
    alert('Please rate the conversation');
    return;
  }

  const conversation = getConversation();
  conversation.rating = state.rating;
  conversation.feedback = comment || null;
  localStorage.setItem(`chat_${state.conversationId}`, JSON.stringify(conversation));

  showThankYou();
}

function skipFeedback() {
  showThankYou();
}

function showThankYou() {
  feedbackScreen.innerHTML = `
    <div class="feedback-container">
      <div class="feedback-content" style="text-align: center;">
        <h2>Thank You!</h2>
        <p style="margin-bottom: 30px;">Your feedback has been recorded. It helps us improve.</p>
        <button onclick="location.reload()" class="btn btn-primary">Start New Chat</button>
      </div>
    </div>
  `;
}

// Storage Functions
function saveConversation(conversation) {
  localStorage.setItem(`chat_${conversation.id}`, JSON.stringify(conversation));
  
  // Add to all conversations list
  const allConvs = JSON.parse(localStorage.getItem('all_conversations') || '[]');
  allConvs.push({
    id: conversation.id,
    username: conversation.username,
    createdAt: conversation.createdAt,
  });
  localStorage.setItem('all_conversations', JSON.stringify(allConvs));
}

function getConversation() {
  const data = localStorage.getItem(`chat_${state.conversationId}`);
  return data ? JSON.parse(data) : null;
}

function monitorForResponses() {
  const monitor = setInterval(() => {
    if (!state.conversationId || chatScreen.classList.contains('active') === false) {
      clearInterval(monitor);
      return;
    }

    const conversation = getConversation();
    if (!conversation) return;

    // Check for new admin messages
    const displayedMessages = Array.from(document.querySelectorAll('.message-group.admin')).map(
      (el) => el.dataset.timestamp
    );
    const lastDisplayedTime = displayedMessages.length > 0 ? displayedMessages[displayedMessages.length - 1] : null;

    conversation.messages.forEach(msg => {
      if (msg.sender === 'admin' && (!lastDisplayedTime || msg.timestamp > lastDisplayedTime)) {
        addMessageToChat({
          message: msg.content,
          sender: 'admin',
          timestamp: msg.timestamp,
          messageId: msg.id,
        });
      }
    });
  }, 500);
}

// Initialize
messageInput.focus();
