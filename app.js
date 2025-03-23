// تنظیمات اولیه
const API_ENDPOINTS = {
    GEMINI: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    OPENROUTER_MODELS: 'https://openrouter.ai/api/v1/models',
    OPENROUTER_CHAT: 'https://openrouter.ai/api/v1/chat/completions'
};

// متغیرهای عمومی
let currentTheme = localStorage.getItem('theme') || 'light';
let chats = JSON.parse(localStorage.getItem('chats')) || [{
    id: 'default',
    title: 'چت پیش‌فرض',
    messages: [],
    timestamp: new Date().toISOString()
}];
let currentChatId = localStorage.getItem('currentChatId') || 'default';
let selectedModel = localStorage.getItem('selectedModel') || 'gemini';
let selectedOpenRouterModel = localStorage.getItem('selectedOpenRouterModel') || 'anthropic/claude-3-sonnet-20240229';
let apiKeys = {
    gemini: localStorage.getItem('geminiKey') || '',
    openrouter: localStorage.getItem('openrouterKey') || ''
};
let selectedProvider = localStorage.getItem('selectedProvider') || 'gemini';
let GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || '';
let OPENROUTER_API_KEY = localStorage.getItem('OPENROUTER_API_KEY') || '';
let currentTone = localStorage.getItem('currentTone') || 'normal';
let contextWindow = 5; // تعداد پیام‌های قبلی که در هر درخواست ارسال می‌شوند

// المان‌های DOM
const themeToggle = document.querySelector('.theme-toggle');
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.querySelector('.send-btn');
const attachButton = document.querySelector('.attach-btn');
const settingsModal = document.getElementById('settings-modal');
const historyModal = document.getElementById('history-modal');
const settingsBtn = document.querySelector('.settings-btn');
const historyBtn = document.querySelector('.history-btn');
const closeModalBtns = document.querySelectorAll('.close-modal');
const searchInput = document.querySelector('.search-box input');
const geminiKeyInput = document.getElementById('gemini-key');
const openrouterKeyInput = document.getElementById('openrouter-key');
const saveSettingsBtn = document.querySelector('.save-settings');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');
const toneSelect = document.getElementById('tone-select');
const newChatBtn = document.querySelector('.new-chat-btn');

// تنظیمات لحن
const tonePrompts = {
    normal: 'لطفاً به صورت عادی و معمولی پاسخ دهید.',
    formal: 'لطفاً با لحن رسمی و اداری پاسخ دهید. از کلمات و اصطلاحات رسمی استفاده کنید.',
    casual: 'لطفاً با لحن غیر رسمی و دوستانه پاسخ دهید. می‌توانید از اصطلاحات عامیانه استفاده کنید.',
    friendly: 'لطفاً با لحن صمیمی و دوستانه پاسخ دهید. از کلمات محبت‌آمیز استفاده کنید.',
    professional: 'لطفاً با لحن حرفه‌ای و تخصصی پاسخ دهید. از اصطلاحات تخصصی استفاده کنید.',
    humorous: 'لطفاً با لحن طنزگونه و شوخ‌طبعانه پاسخ دهید. می‌توانید از جوک و شوخی استفاده کنید.',
    childish: 'لطفاً با لحن کودکانه و ساده پاسخ دهید. از کلمات ساده و قابل فهم برای کودکان استفاده کنید.',
    poetic: 'لطفاً با لحن شاعرانه و ادبی پاسخ دهید. از تشبیهات و استعارات استفاده کنید.'
};

// تنظیم مقادیر اولیه
document.addEventListener('DOMContentLoaded', () => {
    // تنظیم تم
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = currentTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : 
        '<i class="fas fa-sun"></i>';

    // تنظیم لحن
    toneSelect.value = currentTone;

    // تنظیم کلیدهای API
    if (apiKeys.gemini) geminiKeyInput.value = apiKeys.gemini;
    if (apiKeys.openrouter) openrouterKeyInput.value = apiKeys.openrouter;

    // تنظیم ارائه‌دهنده فعال
    const activeProviderBtn = document.querySelector(`.provider-btn[data-provider="${selectedProvider}"]`);
    if (activeProviderBtn) {
        activeProviderBtn.classList.add('active');
    }

    // بارگذاری چت فعلی
    const currentChat = chats.find(c => c.id === currentChatId);
    if (currentChat) {
        messagesContainer.innerHTML = '';
        currentChat.messages.forEach(msg => {
            addMessageToChat(msg);
        });
    }

    // به‌روزرسانی لیست چت‌ها
    updateChatList();

    // بررسی وضعیت API ها
    updateAPIStatus();
});

// مدیریت تم
themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    themeToggle.innerHTML = currentTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : 
        '<i class="fas fa-sun"></i>';
});

// مدیریت لحن
toneSelect.addEventListener('change', () => {
    currentTone = toneSelect.value;
    localStorage.setItem('currentTone', currentTone);
});

// مدیریت ارائه‌دهنده
document.querySelectorAll('.provider-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        selectedProvider = provider;
        localStorage.setItem('selectedProvider', provider);
        
        document.querySelectorAll('.provider-btn').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.provider === provider) {
                b.classList.add('active');
            }
        });
        
        if (provider === 'openrouter') {
            updateSelectedModelName(selectedOpenRouterModel);
        } else {
            updateSelectedModelName(null);
        }
    });
});

// مدیریت نمایش/مخفی کردن کلیدها
togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    });
});

// بررسی وضعیت API ها
async function checkAPIStatus(apiKey, endpoint, statusElement) {
    if (!apiKey) {
        statusElement.className = 'status-indicator disconnected';
        return false;
    }

    statusElement.className = 'status-indicator connecting';
    
    try {
        const response = await fetch(endpoint, {
            method: 'OPTIONS',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            statusElement.className = 'status-indicator connected';
            return true;
        } else {
            statusElement.className = 'status-indicator disconnected';
            return false;
        }
    } catch (error) {
        statusElement.className = 'status-indicator disconnected';
        return false;
    }
}

// دریافت مدل‌های OpenRouter
async function fetchOpenRouterModels() {
    try {
        const response = await fetch(API_ENDPOINTS.OPENROUTER_MODELS, {
            headers: {
                'Authorization': `Bearer ${apiKeys.openrouter}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'AI Chat Application'
            }
        });
        
        if (!response.ok) {
            throw new Error('خطا در دریافت مدل‌ها');
        }
        
        const data = await response.json();
        const modelSelect = document.getElementById('openrouter-model');
        modelSelect.innerHTML = ''; // پاک کردن مدل‌های قبلی
        
        data.data.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.max_tokens})`;
            modelSelect.appendChild(option);
        });
        
        // ذخیره مدل انتخاب شده قبلی
        if (selectedOpenRouterModel) {
            modelSelect.value = selectedOpenRouterModel;
        }
        
        return true;
    } catch (error) {
        console.error('خطا در دریافت مدل‌ها:', error);
        return false;
    }
}

// به‌روزرسانی وضعیت API ها
async function updateAPIStatus() {
    const geminiStatus = document.getElementById('gemini-status');
    const openrouterStatus = document.getElementById('openrouter-status');
    
    if (geminiStatus && openrouterStatus) {
        const [geminiResult, openrouterResult] = await Promise.all([
            checkAPIStatus(apiKeys.gemini, API_ENDPOINTS.GEMINI, geminiStatus),
            checkAPIStatus(apiKeys.openrouter, API_ENDPOINTS.OPENROUTER_MODELS, openrouterStatus)
        ]);
        
        if (openrouterResult) {
            await fetchOpenRouterModels();
        }
    }
}

// ذخیره تنظیمات
saveSettingsBtn.addEventListener('click', async () => {
    const geminiKey = geminiKeyInput.value.trim();
    const openrouterKey = openrouterKeyInput.value.trim();
    const openrouterModel = document.getElementById('openrouter-model').value;
    
    apiKeys.gemini = geminiKey;
    apiKeys.openrouter = openrouterKey;
    selectedOpenRouterModel = openrouterModel;
    
    localStorage.setItem('geminiKey', geminiKey);
    localStorage.setItem('openrouterKey', openrouterKey);
    localStorage.setItem('selectedOpenRouterModel', openrouterModel);
    
    await updateAPIStatus();
    
    const notification = document.createElement('div');
    notification.className = 'settings-saved';
    notification.textContent = 'تنظیمات با موفقیت ذخیره شد';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
    
    settingsModal.style.display = 'none';
});

// مدیریت مودال‌ها
settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
    updateAPIStatus();
});

historyBtn.addEventListener('click', () => {
    historyModal.style.display = 'block';
    searchHistory('');
});

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').style.display = 'none';
    });
});

// جستجو در تاریخچه
function searchHistory(query) {
    const historyList = document.querySelector('.history-list');
    historyList.innerHTML = ''; // پاک کردن لیست قبلی
    
    // گروه‌بندی پیام‌ها بر اساس زمان
    const groupedMessages = {};
    chats.forEach(chat => {
        chat.messages.forEach(msg => {
            const date = new Date(msg.timestamp).toLocaleDateString('fa-IR');
            if (!groupedMessages[date]) {
                groupedMessages[date] = [];
            }
            groupedMessages[date].push(msg);
        });
    });
    
    // نمایش پیام‌ها به صورت گروه‌بندی شده
    Object.entries(groupedMessages).forEach(([date, messages]) => {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'history-date';
        dateHeader.textContent = date;
        historyList.appendChild(dateHeader);
        
        messages.forEach(msg => {
            if (typeof msg.content === 'string' && 
                (query === '' || msg.content.toLowerCase().includes(query.toLowerCase()))) {
                const messageElement = document.createElement('div');
                messageElement.className = 'history-item';
                
                const content = msg.type === 'file' ? 
                    `<img src="${msg.content}" alt="تصویر" style="max-width: 100%;">` :
                    highlightText(msg.content, query);
                
                messageElement.innerHTML = `
                    <div class="history-content">
                        ${content}
                    </div>
                    <div class="history-time">${msg.timestamp}</div>
                    <div class="history-actions">
                        <button class="view-full-msg" title="مشاهده کل پیام">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="delete-history" title="حذف پیام">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                historyList.appendChild(messageElement);
            }
        });
    });

    // اضافه کردن event listener برای دکمه‌های تاریخچه
    document.querySelectorAll('.view-full-msg').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const historyItem = e.target.closest('.history-item');
            const content = historyItem.querySelector('.history-content').innerHTML;
            showFullMessage(content);
        });
    });

    document.querySelectorAll('.delete-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('آیا از حذف این پیام از تاریخچه اطمینان دارید؟')) {
                const historyItem = e.target.closest('.history-item');
                const index = Array.from(document.querySelectorAll('.history-item')).indexOf(historyItem);
                chats.splice(index, 1);
                localStorage.setItem('chats', JSON.stringify(chats));
                historyItem.remove();
            }
        });
    });
}

// نمایش کل پیام در مودال
function showFullMessage(content) {
    const fullMessageModal = document.createElement('div');
    fullMessageModal.className = 'modal';
    fullMessageModal.id = 'full-message-modal';
    fullMessageModal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>کل پیام</h2>
            <div class="full-message-content">${content}</div>
        </div>
    `;
    
    document.body.appendChild(fullMessageModal);
    fullMessageModal.style.display = 'block';
    
    const closeBtn = fullMessageModal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        fullMessageModal.remove();
    });
    
    fullMessageModal.addEventListener('click', (e) => {
        if (e.target === fullMessageModal) {
            fullMessageModal.remove();
        }
    });
}

// هایلایت کردن متن جستجو شده
function highlightText(text, query) {
    if (!query || typeof text !== 'string') return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// به‌روزرسانی نام مدل انتخاب شده
function updateSelectedModelName(modelId) {
    const modelNameElement = document.getElementById('selected-model-name');
    const confirmButton = document.querySelector('.confirm-model-btn') || addModelConfirmationButton();
    
    if (selectedProvider === 'openrouter' && modelId) {
        modelNameElement.textContent = modelId;
        modelNameElement.style.color = 'var(--primary-color)';
        modelNameElement.style.display = 'inline';
        confirmButton.style.display = 'inline';
    } else if (selectedProvider === 'gemini') {
        modelNameElement.textContent = 'Gemini Pro';
        modelNameElement.style.color = 'var(--primary-color)';
        modelNameElement.style.display = 'inline';
        confirmButton.style.display = 'none';
    } else {
        modelNameElement.textContent = 'انتخاب نشده';
        modelNameElement.style.color = 'var(--text-color)';
        modelNameElement.style.opacity = '0.7';
        modelNameElement.style.display = 'inline';
        confirmButton.style.display = 'none';
    }
}

// محاسبه آمار پیام
function getMessageStats(text) {
    if (typeof text !== 'string') {
        return { words: 0, chars: 0, sentences: 0, tokens: 0 };
    }
    return {
        words: text.trim().split(/\s+/).length,
        chars: text.length,
        sentences: text.split(/[.!?]+/).length - 1,
        tokens: Math.round(text.length / 4)
    };
}

// اضافه کردن پیام به چت
function addMessageToChat(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender} ${message.error ? 'error' : ''}`;
    
    const content = message.type === 'file' ? 
        `<img src="${message.content}" alt="تصویر آپلود شده" style="max-width: 100%;">` :
        message.content;
    
    const stats = getMessageStats(message.content);
    
    messageElement.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-stats">
            کلمات: ${stats.words} | کاراکترها: ${stats.chars} | 
            جملات: ${stats.sentences} | توکن‌ها: ${stats.tokens}
        </div>
        <div class="message-time">${message.timestamp}</div>
        ${message.sender === 'user' ? '<button class="delete-msg"><i class="fas fa-trash"></i></button>' : ''}
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // به‌روزرسانی چت در تاریخچه
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push(message);
        chat.timestamp = new Date().toISOString();
        if (chat.messages.length === 1 && message.sender === 'user') {
            chat.title = message.content.substring(0, 30) + '...';
        }
        localStorage.setItem('chats', JSON.stringify(chats));
        updateChatList();
    }
    
    return messageElement;
}

// آپلود و فشرده‌سازی تصویر
function handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
        alert('لطفاً فقط فایل تصویری آپلود کنید.');
        return;
    }
    
    try {
        new Compressor(file, {
            quality: 0.6,
            maxWidth: 1000,
            success(result) {
                const reader = new FileReader();
                reader.onload = (e) => sendMessage(e.target.result, true);
                reader.readAsDataURL(result);
            },
            error(err) {
                console.error('خطا در فشرده‌سازی تصویر:', err);
                alert('خطا در فشرده‌سازی تصویر. لطفاً دوباره تلاش کنید.');
            }
        });
    } catch (error) {
        console.error('خطا در فشرده‌سازی تصویر:', error);
        const reader = new FileReader();
        reader.onload = (e) => sendMessage(e.target.result, true);
        reader.readAsDataURL(file);
    }
}

// ارسال پیام
async function sendMessage(message, isFile = false) {
    if (!selectedModel) {
        alert('لطفاً ابتدا یک مدل هوش مصنوعی را انتخاب کنید.');
        return;
    }

    const timestamp = new Date().toLocaleString('fa-IR');
    const messageObj = {
        content: message,
        type: isFile ? 'file' : 'text',
        timestamp,
        sender: 'user',
        model: selectedModel,
        provider: selectedProvider,
        tone: currentTone
    };
    
    addMessageToChat(messageObj);
    
    if (!isFile) {
        try {
            let response;
            let botResponse = '';
            
            const toneInstruction = tonePrompts[currentTone];
            const fullMessage = `${toneInstruction}\n\nسوال: ${message}`;
            
            // ایجاد پیام خالی برای ربات
            const botMessageObj = {
                content: '',
                timestamp: new Date().toLocaleString('fa-IR'),
                sender: 'bot',
                model: selectedModel,
                provider: selectedProvider,
                tone: currentTone
            };
            
            const botMessageElement = addMessageToChat(botMessageObj);
            const messageContent = botMessageElement.querySelector('.message-content');
            
            if (selectedProvider === 'gemini') {
                if (!apiKeys.gemini) {
                    throw new Error('لطفاً API Key جمینای را در تنظیمات وارد کنید.');
                }

                response = await fetch(API_ENDPOINTS.GEMINI, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKeys.gemini}`
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: fullMessage
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024
                        }
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `خطای HTTP! وضعیت: ${response.status}`);
                }
                
                const data = await response.json();
                botResponse = data.candidates[0].content.parts[0].text;
                
                // نمایش تدریجی پاسخ
                const words = botResponse.split(' ');
                for (let i = 0; i < words.length; i++) {
                    messageContent.innerHTML += words[i] + ' ';
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            } else if (selectedProvider === 'openrouter') {
                if (!apiKeys.openrouter) {
                    throw new Error('لطفاً API Key اوپن‌روتر را در تنظیمات وارد کنید.');
                }

                response = await fetch(API_ENDPOINTS.OPENROUTER_CHAT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKeys.openrouter}`,
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'AI Chat Application'
                    },
                    body: JSON.stringify({
                        model: selectedOpenRouterModel,
                        messages: [
                            { role: 'system', content: toneInstruction },
                            { role: 'user', content: message }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000,
                        stream: true // فعال کردن حالت stream
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `خطای HTTP! وضعیت: ${response.status}`);
                }
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6);
                            if (dataStr === '[DONE]') continue;
                            
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.choices[0].delta.content) {
                                    messageContent.innerHTML += data.choices[0].delta.content;
                                }
                            } catch (error) {
                                console.error('خطا در پردازش پاسخ:', error);
                                continue;
                            }
                        }
                    }
                }
            } else {
                throw new Error('مدل انتخاب شده پشتیبانی نمی‌شود.');
            }
            
            // به‌روزرسانی محتوای نهایی پیام
            botMessageObj.content = messageContent.innerHTML;
            
        } catch (error) {
            console.error('خطا در ارسال پیام:', error);
            addMessageToChat({
                content: `متأسفانه خطایی رخ داد: ${error.message}`,
                timestamp: new Date().toLocaleString('fa-IR'),
                sender: 'bot',
                error: true,
                model: selectedModel,
                provider: selectedProvider,
                tone: currentTone
            });
        }
    }
}

// Event Listeners
sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        sendMessage(message);
        userInput.value = '';
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

attachButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };
    input.click();
});

// حذف پیام‌ها
document.addEventListener('click', (e) => {
    if (e.target.closest('.delete-msg')) {
        if (confirm('آیا از حذف این پیام اطمینان دارید؟')) {
            const message = e.target.closest('.message');
            const chat = chats.find(c => c.id === currentChatId);
            if (chat) {
                const index = Array.from(messagesContainer.children).indexOf(message);
                chat.messages.splice(index, 1);
                localStorage.setItem('chats', JSON.stringify(chats));
                message.remove();
                updateChatList();
            }
        }
    }
});

// اضافه کردن دکمه تأیید مدل
function addModelConfirmationButton() {
    const modelInfo = document.querySelector('.model-info');
    const confirmButton = document.createElement('button');
    confirmButton.className = 'confirm-model-btn';
    confirmButton.textContent = 'تأیید مدل';
    confirmButton.style.display = 'none';
    confirmButton.onclick = () => {
        selectedModel = selectedOpenRouterModel;
        localStorage.setItem('selectedModel', selectedModel);
        updateSelectedModelName(selectedModel);
        confirmButton.style.display = 'none';
    };
    modelInfo.appendChild(confirmButton);
    return confirmButton;
}

// اضافه کردن event listener برای تغییر مدل
document.getElementById('openrouter-model').addEventListener('change', (e) => {
    selectedOpenRouterModel = e.target.value;
    localStorage.setItem('selectedOpenRouterModel', selectedOpenRouterModel);
    updateSelectedModelName(selectedOpenRouterModel);
});

// به‌روزرسانی لیست چت‌ها در تاریخچه
function updateChatList() {
    const historyList = document.querySelector('.history-list');
    historyList.innerHTML = '';
    
    chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatElement.dataset.chatId = chat.id;
        
        const lastMessage = chat.messages[chat.messages.length - 1];
        const preview = lastMessage ? lastMessage.content.substring(0, 100) + '...' : 'چت خالی';
        
        chatElement.innerHTML = `
            <div class="chat-title">${chat.title}</div>
            <div class="chat-preview">${preview}</div>
            <div class="chat-time">${new Date(chat.timestamp).toLocaleString('fa-IR')}</div>
            <div class="chat-actions">
                <button class="open-chat" title="باز کردن چت">
                    <i class="fas fa-folder-open"></i>
                </button>
                <button class="delete-chat" title="حذف چت">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        historyList.appendChild(chatElement);
    });
    
    // اضافه کردن event listener برای دکمه‌ها
    document.querySelectorAll('.open-chat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chatId = e.target.closest('.history-item').dataset.chatId;
            openChat(chatId);
        });
    });
    
    document.querySelectorAll('.delete-chat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chatId = e.target.closest('.history-item').dataset.chatId;
            if (confirm('آیا از حذف این چت اطمینان دارید؟')) {
                deleteChat(chatId);
            }
        });
    });
}

// باز کردن چت
function openChat(chatId) {
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        messagesContainer.innerHTML = '';
        chat.messages.forEach(msg => {
            addMessageToChat(msg);
        });
    }
    
    historyModal.style.display = 'none';
}

// حذف چت
function deleteChat(chatId) {
    if (chatId === 'default') {
        alert('نمی‌توانید چت پیش‌فرض را حذف کنید.');
        return;
    }
    
    chats = chats.filter(c => c.id !== chatId);
    localStorage.setItem('chats', JSON.stringify(chats));
    
    if (currentChatId === chatId) {
        currentChatId = 'default';
        localStorage.setItem('currentChatId', 'default');
        openChat('default');
    }
    
    updateChatList();
}

// ایجاد چت جدید
function createNewChat() {
    // ذخیره چت فعلی
    const currentChat = chats.find(c => c.id === currentChatId);
    if (currentChat && currentChat.messages.length > 0) {
        currentChat.timestamp = new Date().toISOString();
        currentChat.title = currentChat.messages[0].content.substring(0, 30) + '...';
        localStorage.setItem('chats', JSON.stringify(chats));
    }
    
    // ایجاد چت جدید
    const chatId = Date.now().toString();
    const newChat = {
        id: chatId,
        title: 'چت جدید',
        messages: [],
        timestamp: new Date().toISOString()
    };
    
    chats.push(newChat);
    currentChatId = chatId;
    
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('currentChatId', chatId);
    
    messagesContainer.innerHTML = '';
    updateChatList();
}

// Event Listeners
newChatBtn.addEventListener('click', createNewChat);

// ارسال به Gemini
async function sendToGemini(message, previousMessages) {
    const apiKey = apiKeys.gemini;
    if (!apiKey) {
        throw new Error('کلید API جمینای تنظیم نشده است');
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [
            ...previousMessages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
            {
                role: 'user',
                parts: [{ text: message }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        throw new Error(`خطای HTTP: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    let result = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.candidates && parsed.candidates[0].content.parts[0].text) {
                        result += parsed.candidates[0].content.parts[0].text;
                    }
                } catch (e) {
                    console.error('خطا در پردازش پاسخ:', e);
                }
            }
        }
    }
    
    return result;
}

// ارسال به OpenRouter
async function sendToOpenRouter(message, previousMessages) {
    const apiKey = apiKeys.openrouter;
    if (!apiKey) {
        throw new Error('کلید API اوپن‌روتر تنظیم نشده است');
    }
    
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    const requestBody = {
        model: selectedOpenRouterModel,
        messages: [
            ...previousMessages,
            {
                role: 'user',
                content: message
            }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Smart Chatbot'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        throw new Error(`خطای HTTP: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    let result = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices && parsed.choices[0].delta.content) {
                        result += parsed.choices[0].delta.content;
                    }
                } catch (e) {
                    console.error('خطا در پردازش پاسخ:', e);
                }
            }
        }
    }
    
    return result;
} 
