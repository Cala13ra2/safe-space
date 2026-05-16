// Admin Panel - LocalStorage based
const ADMIN_PASSWORD = 'Chika2001?'; // Change this to your desired password

const adminState = {
  selectedConversationId: null,
  conversations: [],
};

// Password Protection
function initializePasswordProtection() {
  const loginScreen = document.getElementById('loginScreen');
  const adminApp = document.getElementById('adminApp');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');

  // Check if already logged in (session-based)
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    loginScreen.classList.add('hidden');
    adminApp.classList.remove('hidden');
    return;
  }

  // Show login screen
  loginScreen.classList.remove('hidden');
  adminApp.classList.add('hidden');

  // Handle login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = passwordInput.value;

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminLoggedIn', 'true');
      loginError.style.display = 'none';
      loginScreen.classList.add('hidden');
      adminApp.classList.remove('hidden');
      passwordInput.value = '';
    } else {
      loginError.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });
}

// Initialize password protection on page load
document.addEventListener('DOMContentLoaded', initializePasswordProtection);

// DOM Elements
const activeCount = document.getElementById('activeCount');
const waitingCount = document.getElementById('waitingCount');
const adminStatus = document.getElementById('adminStatus');
const conversationsList = document.getElementById('conversationsList');
const chatMessagesContainer = document.getElementById('chatMessagesContainer');
const adminReplyInput = document.getElementById('adminReplyInput');
const adminReplyBtn = document.getElementById('adminReplyBtn');
const logoutBtn = document.getElementById('logoutBtn');
const reportsList = document.getElementById('reportsList');
const navItems = document.querySelectorAll('.sidebar-nav-item');
const conversationsView = document.getElementById('conversationsView');
const reportsView = document.getElementById('reportsView');
const analyticsView = document.getElementById('analyticsView');

// Event Listeners
adminReplyBtn.addEventListener('click', sendAdminReply);
adminReplyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    sendAdminReply();
  }
});

logoutBtn.addEventListener('click', () => {
  if (confirm('Logout?')) {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
  }
});

// Navigation
navItems.forEach((item) => {
  item.addEventListener('click', (e) => {
    navItems.forEach((i) => i.classList.remove('active'));
    e.target.classList.add('active');

    const view = e.target.dataset.view;
    showView(view);
  });
});

function showView(view) {
  conversationsView.style.display = 'none';
  reportsView.style.display = 'none';
  analyticsView.style.display = 'none';
  chatMessagesContainer.parentElement.style.display = 'none';

  if (view === 'conversations') {
    conversationsView.style.display = 'block';
    chatMessagesContainer.parentElement.style.display = 'flex';
    loadConversations();
  } else if (view === 'reports') {
    reportsView.style.display = 'block';
    loadReports();
  } else if (view === 'analytics') {
    analyticsView.style.display = 'block';
    loadAnalytics();
  }
}

// Functions
function sendAdminReply() {
  const message = adminReplyInput.value.trim();
  if (!message || !adminState.selectedConversationId) return;

  // Get conversation and add message
  const conversation = JSON.parse(localStorage.getItem(`chat_${adminState.selectedConversationId}`));
  if (!conversation) return;

  const msgObj = {
    id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    sender: 'admin',
    content: message,
    timestamp: new Date().toISOString(),
  };

  conversation.messages.push(msgObj);
  localStorage.setItem(`chat_${adminState.selectedConversationId}`, JSON.stringify(conversation));

  adminReplyInput.value = '';
  loadConversationMessages(adminState.selectedConversationId);
  adminReplyInput.focus();
}

function selectConversation(conversationId) {
  adminState.selectedConversationId = conversationId;
  adminReplyInput.disabled = false;
  adminReplyBtn.disabled = false;

  // Update UI
  document.querySelectorAll('.conversation-item').forEach((item) => {
    item.classList.remove('active');
  });
  const selectedItem = document.querySelector(`[data-conv-id="${conversationId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }

  loadConversationMessages(conversationId);
}

function loadConversations() {
  const allConvs = JSON.parse(localStorage.getItem('all_conversations') || '[]');
  conversationsList.innerHTML = '';

  if (allConvs.length === 0) {
    conversationsList.innerHTML =
      '<p style="color: #8b92a1; text-align: center;">No conversations yet</p>';
    return;
  }

  allConvs.slice().reverse().forEach((convRef) => {
    const conv = JSON.parse(localStorage.getItem(`chat_${convRef.id}`));
    if (!conv) return;

    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.dataset.convId = conv.id;
    if (conv.id === adminState.selectedConversationId) {
      item.classList.add('active');
    }

    const statusClass =
      conv.status === 'active' ? 'status-connected' : 'status-ended';

    item.innerHTML = `
      <div class="conversation-username">${conv.username}</div>
      <div class="conversation-meta">
        <span class="${statusClass} conversation-status">${conv.status.toUpperCase()}</span>
        ${conv.rating ? `<span style="color: #4ade80;">★ ${conv.rating}/5</span>` : ''}
      </div>
      <div class="conversation-meta" style="font-size: 11px; margin-top: 4px;">
        ${new Date(conv.createdAt).toLocaleString()}
      </div>
    `;

    item.addEventListener('click', () => selectConversation(conv.id));
    conversationsList.appendChild(item);
  });

  updateStats();
}

function loadConversationMessages(conversationId) {
  const conv = JSON.parse(localStorage.getItem(`chat_${conversationId}`));
  chatMessagesContainer.innerHTML = '';

  if (!conv || conv.messages.length === 0) {
    chatMessagesContainer.innerHTML =
      '<p class="no-selection">No messages yet</p>';
    return;
  }

  conv.messages.forEach((msg) => {
    const msgItem = document.createElement('div');
    msgItem.className = `admin-message-item ${msg.sender === 'user' ? 'user-msg' : ''}`;

    const role = msg.sender === 'user' ? 'User' : 'Admin (You)';
    const time = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    msgItem.innerHTML = `
      <div class="admin-message-meta">
        <span class="admin-message-role">${role}</span> • ${time}
      </div>
      <div class="admin-message-text">${escapeHtml(msg.content)}</div>
    `;

    chatMessagesContainer.appendChild(msgItem);
  });

  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function loadReports() {
  const reports = JSON.parse(localStorage.getItem('all_reports') || '[]');
  reportsList.innerHTML = '';

  if (reports.length === 0) {
    reportsList.innerHTML =
      '<p style="color: #8b92a1; text-align: center;">No reports yet</p>';
    return;
  }

  reports.slice().reverse().forEach((report) => {
    const conv = JSON.parse(localStorage.getItem(`chat_${report.conversationId}`));
    if (!conv) return;

    const reportItem = document.createElement('div');
    reportItem.style.cssText = `
      background: #0f1419;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 3px solid #ef4444;
    `;

    const time = new Date(report.createdAt).toLocaleString();
    const message = conv.messages.find(m => m.id === report.messageId);
    const messageContent = message ? message.content : '[Message not found]';

    reportItem.innerHTML = `
      <div style="font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">
        User: <strong style="color: #4ade80;">${conv.username}</strong>
      </div>
      <div style="font-size: 13px; color: #8b92a1; margin-bottom: 8px;">
        ${time}
      </div>
      <div style="background: #1a1f26; padding: 10px; border-radius: 4px; margin-bottom: 8px; border-left: 2px solid #6b7280;">
        <div style="font-size: 12px; color: #8b92a1; margin-bottom: 4px;">Reported message:</div>
        <div style="color: #e0e6ed;">${escapeHtml(messageContent)}</div>
      </div>
      <div style="font-size: 13px; color: #e0e6ed;">
        <strong>Reason:</strong> ${report.reason}
      </div>
    `;

    reportsList.appendChild(reportItem);
  });
}

function loadAnalytics() {
  const allConvs = JSON.parse(localStorage.getItem('all_conversations') || '[]');
  let totalRating = 0;
  let ratedCount = 0;
  let activeCount = 0;

  allConvs.forEach((convRef) => {
    const conv = JSON.parse(localStorage.getItem(`chat_${convRef.id}`));
    if (conv) {
      if (conv.status === 'active') activeCount++;
      if (conv.rating) {
        totalRating += conv.rating;
        ratedCount++;
      }
    }
  });

  document.getElementById('statTotal').textContent = allConvs.length;
  document.getElementById('statActive').textContent = activeCount;
  document.getElementById('statRating').textContent =
    ratedCount > 0 ? (totalRating / ratedCount).toFixed(2) : '-';
  document.getElementById('statRated').textContent = ratedCount;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function updateStats() {
  const allConvs = JSON.parse(localStorage.getItem('all_conversations') || '[]');
  let activeCount = 0;

  allConvs.forEach((convRef) => {
    const conv = JSON.parse(localStorage.getItem(`chat_${convRef.id}`));
    if (conv && conv.status === 'active') {
      activeCount++;
    }
  });

  activeCount.textContent = activeCount;
  adminStatus.textContent = 'Connected';
  adminStatus.style.color = '#4ade80';
}

// Auto-refresh conversations every 1 second
setInterval(() => {
  if (document.querySelector('[data-view="conversations"]')?.classList.contains('active')) {
    loadConversations();
  }
}, 1000);

// Initialize
document.querySelector('[data-view="conversations"]').classList.add('active');
showView('conversations');

