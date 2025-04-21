// تنظیمات اولیه
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// آدرس PDF در گیتهاب (این آدرس را با آدرس واقعی فایل خود جایگزین کنید)
const PDF_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/g1.pdf';

// متغیرهای全局
let pdfText = '';
let chatHistory = [];

// عناصر DOM
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loadingIndicator = document.getElementById('loading-indicator');

// هنگامی که DOM کاملاً بارگذاری شد
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // نمایش نشانگر بارگذاری
        showLoading(true);
        
        // دریافت PDF از گیتهاب
        const response = await fetch(PDF_URL);
        const pdfData = await response.arrayBuffer();
        
        // پردازش PDF
        const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
        let fullText = '';
        
        // استخراج متن از تمام صفحات
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
        }
        
        pdfText = fullText;
        
        // مخفی کردن نشانگر بارگذاری
        showLoading(false);
        
        // فعال کردن ورودی کاربر
        userInput.disabled = false;
        sendBtn.disabled = false;
        
        // نمایش پیام خوشامدگویی
        displayMessage('سلام! من چت بات ghanon.m.y هستم. می‌توانید سوالات حقوقی خود را از من بپرسید.', 'bot');
        displayMessage('من از محتوای فایل PDF که در گیتهاب آپلود کرده‌اید برای پاسخگویی استفاده می‌کنم.', 'bot');
        
        // بارگذاری تاریخچه چت از localStorage
        loadChatHistory();
        
    } catch (error) {
        console.error('خطا در بارگذاری PDF:', error);
        displayMessage('خطا در بارگذاری منابع از گیتهاب. لطفاً بعداً تلاش کنید.', 'bot');
        showLoading(false);
    }
});

// مدیریت ارسال سوالات
sendBtn.addEventListener('click', handleQuestion);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuestion();
});

async function handleQuestion() {
    const question = userInput.value.trim();
    if (!question || !pdfText) return;
    
    // نمایش سوال کاربر
    displayMessage(question, 'user');
    userInput.value = '';
    
    // ایجاد تأخیر برای شبیه‌سازی پردازش
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // یافتن پاسخ در متن PDF
    const answer = findAnswerInText(question, pdfText);
    
    // نمایش پاسخ
    displayMessage(answer, 'bot');
    
    // ذخیره تاریخچه چت
    saveChatHistory();
}

// تابع پیشرفته برای یافتن پاسخ در متن
function findAnswerInText(question, text) {
    // تبدیل به حروف کوچک برای جستجوی بهتر
    const lowerQuestion = question.toLowerCase();
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    
    // کلیدواژه‌های حقوقی پرکاربرد
    const legalKeywords = {
        'تعریف': ['تعریف', 'معنی', 'منظور از', 'چه مفهومی دارد'],
        'شرایط': ['شرایط', 'نیازهای', 'مقررات', 'چگونه', 'چطور'],
        'مجازات': ['مجازات', 'جریمه', 'تنبیه', 'کیفر', 'حکم'],
        'ماده': ['ماده', 'بند', 'اصل', 'تبصره'],
        'اثبات': ['اثبات', 'دلیل', 'سند', 'مدرک']
    };
    
    // محاسبه امتیاز هر پاراگراف
    const scoredParagraphs = paragraphs.map(paragraph => {
        let score = 0;
        const lowerPara = paragraph.toLowerCase();
        
        // امتیاز بر اساس تطابق کلمات
        question.split(' ').forEach(word => {
            if (word.length > 3 && lowerPara.includes(word.toLowerCase())) {
                score += 2;
            }
        });
        
        // امتیاز بیشتر برای کلیدواژه‌های مهم
        Object.entries(legalKeywords).forEach(([key, synonyms]) => {
            synonyms.forEach(synonym => {
                if (lowerQuestion.includes(synonym) && lowerPara.includes(key)) {
                    score += 5;
                }
            });
        });
        
        // امتیاز بیشتر برای پاراگراف‌های کوتاه‌تر (احتمالاً دقیق‌تر)
        score += Math.max(0, 10 - paragraph.length / 30);
        
        return { paragraph, score };
    });
    
    // مرتب‌سازی بر اساس امتیاز
    scoredParagraphs.sort((a, b) => b.score - a.score);
    
    // انتخاب بهترین پاسخ
    const bestMatch = scoredParagraphs[0];
    
    if (bestMatch.score > 5) {
        return bestMatch.paragraph;
    } else {
        return 'پاسخی برای این سوال در منابع یافت نشد. لطفاً سوال خود را دقیق‌تر بیان کنید.';
    }
}

// نمایش پیام‌ها در چت
function displayMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // اضافه کردن به تاریخچه چت
    chatHistory.push({ sender, message });
}

// نمایش/مخفی کردن نشانگر بارگذاری
function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// ذخیره تاریخچه چت در localStorage
function saveChatHistory() {
    localStorage.setItem('ghanonChatHistory', JSON.stringify(chatHistory));
}

// بارگذاری تاریخچه چت از localStorage
function loadChatHistory() {
    const savedHistory = localStorage.getItem('ghanonChatHistory');
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
        chatHistory.forEach(item => {
            displayMessage(item.message, item.sender);
        });
    }
}