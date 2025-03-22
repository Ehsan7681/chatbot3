// تنظیمات اولیه
const API_ENDPOINTS = {
    GEMINI: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    OPENROUTER_MODELS: 'https://openrouter.ai/api/v1/models',
    OPENROUTER_CHAT: 'https://openrouter.ai/api/v1/chat/completions'
};

// متغیرهای عمومی
let currentTheme = 'light';
let chatHistory = [];
let selectedModel = localStorage.getItem('selectedModel') || null;
let conversationHistory = {};
let GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || '';
let OPENROUTER_API_KEY = localStorage.getItem('OPENROUTER_API_KEY') || '';
let currentTone = localStorage.getItem('currentTone') || 'normal';

// المان‌های DOM
const themeToggle = document.querySelector('.theme-toggle');
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.querySelector('.send-btn');
const attachButton = document.querySelector('.attach-btn');
const settingsModal = document.getElementById('settings-modal');
const modelModal = document.getElementById('model-modal');
const historyModal = document.getElementById('history-modal');
const settingsBtn = document.querySelector('.settings-btn');
const modelSelectBtn = document.querySelector('.model-select-btn');
const historyBtn = document.querySelector('.history-btn');
const closeModalBtns = document.querySelectorAll('.close-modal');
const searchInput = document.querySelector('.search-box input');
const geminiKeyInput = document.getElementById('gemini-key');
const openrouterKeyInput = document.getElementById('openrouter-key');
const saveSettingsBtn = document.querySelector('.save-settings');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');
const toneSelect = document.getElementById('tone-select');

// نمایش مقادیر ذخیره شده در فرم
if (GEMINI_API_KEY) {
    geminiKeyInput.value = GEMINI_API_KEY;
}
if (OPENROUTER_API_KEY) {
    openrouterKeyInput.value = OPENROUTER_API_KEY;
}

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

// بررسی وضعیت اتصال API ها
async function checkAPIStatus(apiKey, endpoint, statusElement) {
    if (!apiKey) {
        statusElement.className = 'status-indicator disconnected';
        return false;
    }

    statusElement.className = 'status-indicator connecting';
    
    try {
        // یک درخواست ساده برای بررسی وضعیت
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

// به‌روزرسانی وضعیت API ها
async function updateAPIStatus() {
    const geminiStatus = document.getElementById('gemini-status');
    const openrouterStatus = document.getElementById('openrouter-status');
    
    if (geminiStatus && openrouterStatus) {
        await Promise.all([
            checkAPIStatus(GEMINI_API_KEY, API_ENDPOINTS.GEMINI, geminiStatus),
            checkAPIStatus(OPENROUTER_API_KEY, API_ENDPOINTS.OPENROUTER_MODELS, openrouterStatus)
        ]);
    }
}

// نمایش مودال تنظیمات
settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
    updateAPIStatus();
});

// ذخیره تنظیمات
saveSettingsBtn.addEventListener('click', async () => {
    const geminiKey = geminiKeyInput.value.trim();
    const openrouterKey = openrouterKeyInput.value.trim();
    
    if (geminiKey) {
        GEMINI_API_KEY = geminiKey;
        localStorage.setItem('GEMINI_API_KEY', geminiKey);
    }
    
    if (openrouterKey) {
        OPENROUTER_API_KEY = openrouterKey;
        localStorage.setItem('OPENROUTER_API_KEY', openrouterKey);
    }
    
    // بررسی وضعیت API ها
    await updateAPIStatus();
    
    // نمایش پیام موفقیت
    const notification = document.createElement('div');
    notification.className = 'settings-saved';
    notification.textContent = 'تنظیمات با موفقیت ذخیره شد';
    document.body.appendChild(notification);
    
    // حذف پیام بعد از اتمام انیمیشن
    setTimeout(() => {
        notification.remove();
    }, 3000);
});

// تغییر تم
themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.innerHTML = currentTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : 
        '<i class="fas fa-sun"></i>';
});

// دریافت لیست مدل‌ها از OpenRouter
async function fetchOpenRouterModels() {
    try {
        const response = await fetch(API_ENDPOINTS.OPENROUTER_MODELS, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'AI Chat Application'
            }
        });
        
        if (!response.ok) {
            throw new Error('خطا در دریافت مدل‌ها');
        }
        
        const data = await response.json();
        return data.data.map(model => ({
            id: model.id,
            name: model.name,
            context_length: model.context_length,
            max_tokens: model.max_tokens
        }));
    } catch (error) {
        console.error('خطا در دریافت مدل‌ها:', error);
        return [];
    }
}

// به‌روزرسانی نام مدل انتخاب شده
function updateSelectedModelName(modelId) {
    const modelNameElement = document.getElementById('selected-model-name');
    if (modelId) {
        modelNameElement.textContent = modelId;
        modelNameElement.style.color = 'var(--primary-color)';
    } else {
        modelNameElement.textContent = 'انتخاب نشده';
        modelNameElement.style.color = 'var(--text-color)';
        modelNameElement.style.opacity = '0.7';
    }
}

// جستجو در مدل‌ها
function searchModels(query) {
    const modelItems = document.querySelectorAll('.model-item');
    query = query.toLowerCase();
    
    modelItems.forEach(item => {
        const modelName = item.querySelector('h3').textContent.toLowerCase();
        const modelDetails = item.querySelector('.model-details').textContent.toLowerCase();
        
        if (modelName.includes(query) || modelDetails.includes(query)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// نمایش مدل‌ها در مودال
async function displayModels() {
    const modelList = document.querySelector('.model-list');
    const modelSearch = document.querySelector('.model-search');
    modelList.innerHTML = 'در حال بارگذاری...';
    
    try {
        const models = await fetchOpenRouterModels();
        
        if (!models || models.length === 0) {
            modelList.innerHTML = 'هیچ مدلی یافت نشد. لطفاً از صحت API Key خود اطمینان حاصل کنید.';
            return;
        }
        
        modelList.innerHTML = models.map(model => `
            <div class="model-item ${model.id === selectedModel ? 'selected' : ''}" data-model-id="${model.id}">
                <h3>${model.name}</h3>
                <div class="model-details">
                    <span>حداکثر طول متن ورودی: ${model.context_length} کاراکتر</span>
                    <span>حداکثر طول پاسخ: ${model.max_tokens} کاراکتر</span>
                </div>
            </div>
        `).join('');
        
        // اضافه کردن event listener برای جستجو
        modelSearch.addEventListener('input', (e) => {
            searchModels(e.target.value);
        });
        
        // اضافه کردن event listener برای انتخاب مدل
        document.querySelectorAll('.model-item').forEach(item => {
            item.addEventListener('click', () => {
                selectedModel = item.dataset.modelId;
                localStorage.setItem('selectedModel', selectedModel);
                updateSelectedModelName(selectedModel);
                modelModal.style.display = 'none';
                
                // به‌روزرسانی کلاس selected
                document.querySelectorAll('.model-item').forEach(m => m.classList.remove('selected'));
                item.classList.add('selected');
            });
        });
    } catch (error) {
        modelList.innerHTML = 'خطا در دریافت لیست مدل‌ها. لطفاً API Key خود را بررسی کنید.';
    }
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
        <div class="message-content"></div>
        <div class="message-stats">
            کلمات: ${stats.words} | کاراکترها: ${stats.chars} | 
            جملات: ${stats.sentences} | توکن‌ها: ${stats.tokens}
        </div>
        <div class="message-time">${message.timestamp}</div>
        ${message.sender === 'user' ? '<button class="delete-msg"><i class="fas fa-trash"></i></button>' : ''}
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatHistory.push(message);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));

    // نمایش متن به صورت کلمه به کلمه
    if (message.sender === 'bot' && !message.error) {
        const messageContent = messageElement.querySelector('.message-content');
        const words = content.split(' ');
        let currentIndex = 0;
        
        function addNextWord() {
            if (currentIndex < words.length) {
                messageContent.innerHTML += words[currentIndex] + ' ';
                currentIndex++;
                messageContent.scrollIntoView({ behavior: 'smooth', block: 'end' });
                setTimeout(addNextWord, 50); // سرعت نمایش کلمات (میلی‌ثانیه)
            }
        }
        
        addNextWord();
    } else {
        messageElement.querySelector('.message-content').innerHTML = content;
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
        // اگر کتابخانه compressor در دسترس نیست، مستقیماً فایل را آپلود کنیم
        const reader = new FileReader();
        reader.onload = (e) => sendMessage(e.target.result, true);
        reader.readAsDataURL(file);
    }
}

// جستجو در تاریخچه
function searchHistory(query) {
    const historyList = document.querySelector('.history-list');
    const filteredHistory = chatHistory.filter(msg => 
        typeof msg.content === 'string' && msg.content.toLowerCase().includes(query.toLowerCase())
    );
    
    historyList.innerHTML = filteredHistory.map(msg => `
        <div class="history-item">
            <div class="history-content">
                ${highlightText(msg.content, query)}
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
        </div>
    `).join('');

    // اضافه کردن event listener برای دکمه مشاهده کل پیام
    document.querySelectorAll('.view-full-msg').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const historyItem = e.target.closest('.history-item');
            const content = historyItem.querySelector('.history-content').textContent;
            showFullMessage(content);
        });
    });

    // اضافه کردن event listener برای دکمه حذف
    document.querySelectorAll('.delete-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('آیا از حذف این پیام از تاریخچه اطمینان دارید؟')) {
                const historyItem = e.target.closest('.history-item');
                const index = Array.from(document.querySelectorAll('.history-item')).indexOf(historyItem);
                chatHistory.splice(index, 1);
                localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
                historyItem.remove();
            }
        });
    });
}

// هایلایت کردن متن جستجو شده
function highlightText(text, query) {
    if (!query || typeof text !== 'string') return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
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
    
    // بستن مودال
    const closeBtn = fullMessageModal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        fullMessageModal.remove();
    });
    
    // بستن مودال با کلیک بیرون از آن
    fullMessageModal.addEventListener('click', (e) => {
        if (e.target === fullMessageModal) {
            fullMessageModal.remove();
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // بارگذاری تاریخچه مکالمات
        const savedConversationHistory = localStorage.getItem('conversationHistory');
        if (savedConversationHistory) {
            conversationHistory = JSON.parse(savedConversationHistory);
        }
        
        // بارگذاری تاریخچه چت
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            // نمایش پیام‌های مدل انتخاب شده
            const modelMessages = chatHistory.filter(msg => msg.model === selectedModel);
            modelMessages.forEach(msg => {
                if (msg.sender === 'user') {
                    if (!conversationHistory[selectedModel]) {
                        conversationHistory[selectedModel] = [];
                    }
                    conversationHistory[selectedModel].push({ role: 'user', content: msg.content });
                } else if (msg.sender === 'bot') {
                    if (!conversationHistory[selectedModel]) {
                        conversationHistory[selectedModel] = [];
                    }
                    conversationHistory[selectedModel].push({ role: 'assistant', content: msg.content });
                }
            });
        }
        
        // به‌روزرسانی نام مدل انتخاب شده در بارگذاری صفحه
        updateSelectedModelName(selectedModel);
        
        // بررسی وضعیت API ها
        await updateAPIStatus();
    } catch (error) {
        console.error('خطا در بارگذاری تاریخچه:', error);
    }
    
    document.documentElement.setAttribute('data-theme', currentTheme);
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        sendMessage(message);
        userInput.value = '';
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

modelSelectBtn.addEventListener('click', () => {
    modelModal.style.display = 'block';
    displayModels();
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

searchInput.addEventListener('input', (e) => {
    searchHistory(e.target.value);
});

// برای بستن مودال با کلیک بیرون از آن
window.addEventListener('click', (e) => {
    if (e.target === modelModal) {
        modelModal.style.display = 'none';
    }
    if (e.target === historyModal) {
        historyModal.style.display = 'none';
    }
});

// حذف پیام‌ها
function handleDeleteClick(e) {
    if (e.target.closest('.delete-msg')) {
        if (confirm('آیا از حذف این پیام اطمینان دارید؟')) {
            const message = e.target.closest('.message');
            const index = Array.from(messagesContainer.children).indexOf(message);
            
            // حذف پیام از تاریخچه
            chatHistory.splice(index, 1);
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            
            message.remove();
        }
    }
}

document.addEventListener('click', handleDeleteClick);

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

// ذخیره لحن انتخاب شده
toneSelect.addEventListener('change', () => {
    currentTone = toneSelect.value;
    localStorage.setItem('currentTone', currentTone);
});

// تنظیم لحن اولیه
toneSelect.value = currentTone;

// ارسال پیام به API
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
        tone: currentTone
    };
    
    addMessageToChat(messageObj);
    
    // اضافه کردن پیام به تاریخچه مدل انتخاب شده
    if (!conversationHistory[selectedModel]) {
        conversationHistory[selectedModel] = [];
    }
    conversationHistory[selectedModel].push({ role: 'user', content: message });
    
    if (!isFile) {
        try {
            let response;
            let botResponse = '';
            
            // اضافه کردن دستورالعمل لحن به پیام
            const toneInstruction = tonePrompts[currentTone];
            const fullMessage = `${toneInstruction}\n\nسوال: ${message}`;
            
            if (selectedModel.includes('gemini')) {
                response = await fetch(API_ENDPOINTS.GEMINI, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GEMINI_API_KEY}`
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: fullMessage
                            }]
                        }]
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `خطای HTTP! وضعیت: ${response.status}`);
                }
                
                const data = await response.json();
                botResponse = data.candidates[0].content.parts[0].text;
            } else {
                response = await fetch(API_ENDPOINTS.OPENROUTER_CHAT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': window.location.href,
                        'X-Title': 'AI Chat Application'
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: [
                            { role: 'system', content: toneInstruction },
                            ...conversationHistory[selectedModel].slice(-10), // فقط 10 پیام آخر
                            { role: 'user', content: message }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000,
                        stream: false
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || `خطای HTTP! وضعیت: ${response.status}`);
                }
                
                const data = await response.json();
                botResponse = data.choices[0].message.content;
            }
            
            const botMessageObj = {
                content: botResponse,
                timestamp: new Date().toLocaleString('fa-IR'),
                sender: 'bot',
                model: selectedModel,
                tone: currentTone
            };
            
            addMessageToChat(botMessageObj);
            conversationHistory[selectedModel].push({ role: 'assistant', content: botResponse });
            
            // ذخیره تاریخچه در localStorage
            localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
            
        } catch (error) {
            console.error('خطا در ارسال پیام:', error);
            addMessageToChat({
                content: `متأسفانه خطایی رخ داد: ${error.message}`,
                timestamp: new Date().toLocaleString('fa-IR'),
                sender: 'bot',
                error: true,
                model: selectedModel,
                tone: currentTone
            });
        }
    }
} 