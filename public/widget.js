/**
 * Hotel Sherpa Soul - Embeddable Web Chat Widget
 * Embed on ANY website using:
 * <script src="https://your-chatbot-domain.com/widget.js" data-api="https://your-chatbot-domain.com"></script>
 */
(function () {
  if (window.HotelSherpaSoulWidgetLoaded) return;
  window.HotelSherpaSoulWidgetLoaded = true;

  // Determine API base URL
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  let apiUrl = '';
  if (currentScript && currentScript.getAttribute('data-api')) {
    apiUrl = currentScript.getAttribute('data-api').replace(/\/$/, '');
  } else if (window.HOTEL_CHATBOT_API) {
    apiUrl = window.HOTEL_CHATBOT_API.replace(/\/$/, '');
  } else if (currentScript && currentScript.src) {
    try {
      const url = new URL(currentScript.src);
      if (url.origin !== window.location.origin) {
        apiUrl = url.origin;
      }
    } catch (e) {
      apiUrl = '';
    }
  }

  // Automatic localhost fallback: If running locally on another port (e.g. Vite 5173), default to http://localhost:3000
  if (!apiUrl && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    apiUrl = 'http://localhost:3000';
  }

  const STORAGE_KEY = 'hss_chat_session';
  let customerId = null;
  let isOpen = false;
  let messages = [
    {
      id: 'welcome_1',
      sender: 'bot',
      text: 'Hi! Welcome to Hotel Sherpa Soul 😊\nHow can I help you today?',
      buttons: ['Check Room Availability', 'Room Prices', 'Hotel Information', 'Talk to Staff'],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ];

  // Try to restore session
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.customerId) customerId = parsed.customerId;
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        messages = parsed.messages;
      }
    }
  } catch (e) {}

  function saveSession() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customerId, messages: messages.slice(-20) })
      );
    } catch (e) {}
  }

  // Inject Styles
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    #hss-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    #hss-widget-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .hss-launcher-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #334155;
      padding: 12px 18px;
      border-radius: 9999px;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2);
      transition: all 0.2s ease;
    }
    .hss-launcher-btn:hover {
      background: #1e293b;
      transform: scale(1.04);
    }
    .hss-launcher-icon {
      position: relative;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hss-launcher-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 9px;
      height: 9px;
      background: #10b981;
      border: 2px solid #0f172a;
      border-radius: 50%;
    }
    .hss-launcher-text {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .hss-window {
      position: fixed;
      bottom: 85px;
      right: 20px;
      width: 375px;
      max-width: calc(100vw - 32px);
      height: 560px;
      max-height: calc(100vh - 110px);
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06);
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: hss-slide-in 0.22s ease-out;
    }
    @keyframes hss-slide-in {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .hss-header {
      background: #090d16;
      color: #ffffff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
    }
    .hss-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hss-logo {
      width: 34px;
      height: 34px;
      background: #f59e0b;
      color: #0f172a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
    }
    .hss-brand-info h4 {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.2;
    }
    .hss-brand-info p {
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .hss-brand-info p span.dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      display: inline-block;
    }
    .hss-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hss-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .hss-close-btn:hover {
      background: #1e293b;
      color: #ffffff;
    }
    .hss-notice-bar {
      background: #fef3c7;
      color: #92400e;
      font-size: 11px;
      padding: 6px 12px;
      border-bottom: 1px solid #fde68a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hss-notice-bar a {
      color: #047857;
      font-weight: 700;
      text-decoration: none;
    }
    .hss-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hss-msg-row {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }
    .hss-msg-row.guest {
      align-self: flex-end;
      align-items: flex-end;
    }
    .hss-msg-row.bot {
      align-self: flex-start;
      align-items: flex-start;
    }
    .hss-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .hss-msg-row.guest .hss-bubble {
      background: #0f172a;
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .hss-msg-row.bot .hss-bubble {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .hss-timestamp {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
      padding: 0 4px;
    }
    .hss-buttons-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .hss-chip-btn {
      background: #f1f5f9;
      color: #1e293b;
      border: 1px solid #cbd5e1;
      padding: 6px 11px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .hss-chip-btn:hover {
      background: #fef3c7;
      color: #b45309;
      border-color: #f59e0b;
    }
    .hss-typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      border-bottom-left-radius: 4px;
    }
    .hss-typing-dot {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: hss-pulse 1s infinite alternate;
    }
    .hss-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .hss-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes hss-pulse {
      from { opacity: 0.3; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1.2); }
    }
    .hss-input-area {
      padding: 10px 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hss-input {
      flex: 1;
      padding: 9px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }
    .hss-input:focus {
      border-color: #f59e0b;
    }
    .hss-send-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 9px 12px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .hss-send-btn:hover:not(:disabled) {
      background: #1e293b;
    }
    .hss-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .hss-footer-note {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      padding: 4px;
      background: #ffffff;
    }
    @media (max-width: 480px) {
      .hss-window {
        bottom: 0;
        right: 0;
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Create Container DOM
  const container = document.createElement('div');
  container.id = 'hss-widget-container';
  container.innerHTML = `
    <!-- Launcher Button -->
    <button class="hss-launcher-btn" id="hss-open-btn" aria-label="Open Chat">
      <div class="hss-launcher-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
        </svg>
        <span class="hss-launcher-badge"></span>
      </div>
      <span class="hss-launcher-text">Chat with us</span>
    </button>

    <!-- Chat Modal -->
    <div class="hss-window" id="hss-window">
      <div class="hss-header">
        <div class="hss-brand">
          <div class="hss-logo">SS</div>
          <div class="hss-brand-info">
            <h4>Hotel Sherpa Soul</h4>
            <p><span class="dot"></span> Online • Thamel, Kathmandu</p>
          </div>
        </div>
        <div class="hss-header-actions">
          <button class="hss-close-btn" id="hss-close-btn" aria-label="Close Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="hss-notice-bar">
        <span>Quick answer or prefer WhatsApp?</span>
        <a href="https://wa.me/9779818259472" target="_blank" rel="noopener">WhatsApp Us ↗</a>
      </div>

      <div class="hss-messages" id="hss-messages-list"></div>

      <div class="hss-input-area">
        <input type="text" class="hss-input" id="hss-input" placeholder="Type a message (e.g. Room price?)..." autocomplete="off" />
        <button class="hss-send-btn" id="hss-send-btn" aria-label="Send Message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      <div class="hss-footer-note">
        Hotel Sherpa Soul • 26 Thamel Bhagwati Marg
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // DOM references
  const openBtn = document.getElementById('hss-open-btn');
  const closeBtn = document.getElementById('hss-close-btn');
  const windowEl = document.getElementById('hss-window');
  const messagesList = document.getElementById('hss-messages-list');
  const inputEl = document.getElementById('hss-input');
  const sendBtn = document.getElementById('hss-send-btn');

  let isSubmitting = false;

  function renderMessages() {
    messagesList.innerHTML = '';
    messages.forEach((msg) => {
      const row = document.createElement('div');
      row.className = 'hss-msg-row ' + msg.sender;

      const bubble = document.createElement('div');
      bubble.className = 'hss-bubble';
      bubble.textContent = msg.text;
      row.appendChild(bubble);

      if (msg.time) {
        const timeEl = document.createElement('div');
        timeEl.className = 'hss-timestamp';
        timeEl.textContent = msg.time;
        row.appendChild(timeEl);
      }

      if (msg.buttons && msg.buttons.length > 0) {
        const btnsBox = document.createElement('div');
        btnsBox.className = 'hss-buttons-container';
        msg.buttons.forEach((btnText) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'hss-chip-btn';
          b.textContent = btnText;
          b.onclick = () => {
            if (btnText.toLowerCase().includes('whatsapp')) {
              window.open('https://wa.me/9779818259472?text=Hi%2C%20I%20would%20like%20to%20inquire%20about%20Hotel%20Sherpa%20Soul', '_blank');
              return;
            }
            handleSendMessage(btnText);
          };
          btnsBox.appendChild(b);
        });
        row.appendChild(btnsBox);
      }

      messagesList.appendChild(row);
    });

    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function toggleChat(open) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    if (isOpen) {
      windowEl.style.display = 'flex';
      openBtn.style.display = 'none';
      renderMessages();
      setTimeout(() => inputEl.focus(), 150);
    } else {
      windowEl.style.display = 'none';
      openBtn.style.display = 'flex';
    }
  }

  openBtn.addEventListener('click', () => toggleChat(true));
  closeBtn.addEventListener('click', () => toggleChat(false));

  async function handleSendMessage(text) {
    const trimmed = (text || inputEl.value || '').trim();
    if (!trimmed || isSubmitting) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append guest message
    messages.push({
      id: 'guest_' + Date.now(),
      sender: 'guest',
      text: trimmed,
      time: timeStr,
    });
    inputEl.value = '';
    renderMessages();

    // Show typing indicator
    isSubmitting = true;
    sendBtn.disabled = true;

    const typingEl = document.createElement('div');
    typingEl.className = 'hss-msg-row bot';
    typingEl.id = 'hss-typing-indicator';
    typingEl.innerHTML = `
      <div class="hss-typing">
        <span class="hss-typing-dot"></span>
        <span class="hss-typing-dot"></span>
        <span class="hss-typing-dot"></span>
      </div>
    `;
    messagesList.appendChild(typingEl);
    messagesList.scrollTop = messagesList.scrollHeight;

    const endpoint = (apiUrl ? apiUrl : '') + '/api/chat/website';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          message: trimmed,
        }),
      });

      const data = await res.json();
      if (data.customerId) {
        customerId = data.customerId;
      }

      // Remove typing indicator
      const ind = document.getElementById('hss-typing-indicator');
      if (ind) ind.remove();

      messages.push({
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: data.reply || 'Thanks for reaching out. Our front desk will assist you shortly 😊',
        buttons: data.suggestedReplies || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      saveSession();
    } catch (err) {
      console.error('Hotel Sherpa Soul Chatbot error:', err);
      const ind = document.getElementById('hss-typing-indicator');
      if (ind) ind.remove();

      messages.push({
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text: 'Thank you for reaching out! If our live chat is experiencing a delay, please feel free to message our front desk directly on WhatsApp at +977-9818259472 😊',
        buttons: ['WhatsApp Us', 'Hotel Information'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      saveSession();
    } finally {
      isSubmitting = false;
      sendBtn.disabled = false;
      renderMessages();
    }
  }

  sendBtn.addEventListener('click', () => handleSendMessage());
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Global helper API
  window.HotelSherpaSoulChat = {
    open: () => toggleChat(true),
    close: () => toggleChat(false),
    sendMessage: (msg) => handleSendMessage(msg),
  };
})();
