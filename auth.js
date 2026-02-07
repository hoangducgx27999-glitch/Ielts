// Client-side Authentication with Cloudflare D1 Backend
// API URL sẽ tự động cập nhật sau khi bạn deploy Worker

const AUTH_CONFIG = {
    // ⚠️ SAU KHI DEPLOY WORKER, THAY URL NÀY:
    // Ví dụ: 'https://ielts-game-api.your-subdomain.workers.dev'
    API_URL: 'https://ielts-6k8.pages.dev/',
    
    FREE_QUESTION_LIMIT: 100,
    STORAGE_KEYS: {
        TOKEN: 'ielts_token',
        USER_DATA: 'ielts_user_data',
        QUESTION_COUNT: 'ielts_question_count',
        IS_VIP: 'ielts_is_vip',
        THEME_UNLOCKED: 'ielts_theme_unlocked'
    }
};

// User management
const UserManager = {
    // Đăng ký
    async register(username, password) {
        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Lỗi kết nối! Vui lòng thử lại.' };
        }
    },

    // Đăng nhập
    async login(username, password) {
        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Lưu token và user data
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN, data.token);
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, data.user.questionCount.toString());
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.IS_VIP, data.user.isVIP.toString());
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Lỗi kết nối! Vui lòng thử lại.' };
        }
    },

    // Đăng xuất
    logout() {
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.IS_VIP);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.THEME_UNLOCKED);
    },

    // Kiểm tra đăng nhập
    isLoggedIn() {
        const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN);
        return token !== null;
    },

    // Lấy user hiện tại
    getCurrentUser() {
        const userData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    },

    // Kiểm tra VIP
    isVIP() {
        const isVIP = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.IS_VIP);
        return isVIP === 'true';
    },

    // Lấy token
    getToken() {
        return localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN);
    },

    // Refresh user data từ server
    async refreshUserData() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/api/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, data.user.questionCount.toString());
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.IS_VIP, data.user.isVIP.toString());
                return data.user;
            }
        } catch (error) {
            console.error('Refresh user data error:', error);
        }

        return null;
    },

    // Cập nhật stats
    async updateStats(stats) {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/api/user/stats`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ stats })
            });

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Update stats error:', error);
            return false;
        }
    },

    // Cập nhật question count
    async updateQuestionCount(count) {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/api/user/question-count`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ count })
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, count.toString());
            }
            return data.success;
        } catch (error) {
            console.error('Update question count error:', error);
            return false;
        }
    },

    // Nâng cấp VIP
    async upgradeToVIP() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/api/user/upgrade`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.IS_VIP, 'true');
                await this.refreshUserData();
            }

            return data.success;
        } catch (error) {
            console.error('Upgrade VIP error:', error);
            return false;
        }
    }
};

// Question limit manager
const QuestionLimitManager = {
    // Tăng số câu đã chơi
    async incrementQuestionCount() {
        if (UserManager.isVIP()) {
            return true; // VIP không giới hạn
        }

        let count = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
        count++;
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, count.toString());

        // Sync với server
        if (UserManager.isLoggedIn()) {
            await UserManager.updateQuestionCount(count);
        }

        return count <= AUTH_CONFIG.FREE_QUESTION_LIMIT;
    },

    // Kiểm tra còn câu hỏi không
    canPlayMore() {
        if (UserManager.isVIP()) {
            return true;
        }

        const count = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
        return count < AUTH_CONFIG.FREE_QUESTION_LIMIT;
    },

    // Lấy số câu còn lại
    getRemainingQuestions() {
        if (UserManager.isVIP()) {
            return Infinity;
        }

        const count = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
        return Math.max(0, AUTH_CONFIG.FREE_QUESTION_LIMIT - count);
    },

    // Lấy số câu đã chơi
    getPlayedQuestions() {
        return parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
    },

    // KHÔNG CÓ RESET - CHỈ DÀNH CHO ADMIN TEST
    async adminResetCount() {
        console.warn('⚠️ ADMIN ONLY: Resetting question count');
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, '0');
        
        if (UserManager.isLoggedIn()) {
            await UserManager.updateQuestionCount(0);
        }
    }
};

// Payment Manager
const PaymentManager = {
    // Tạo yêu cầu thanh toán
    async createPayment(amount, method = 'bank_transfer') {
        const token = UserManager.getToken();
        if (!token) {
            return { success: false, message: 'Vui lòng đăng nhập!' };
        }

        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/api/payment/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount, method })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Create payment error:', error);
            return { success: false, message: 'Lỗi kết nối!' };
        }
    },

    // Hiển thị popup thanh toán
    async showPaymentPopup(amount = 99000) {
        const result = await this.createPayment(amount);

        if (!result.success) {
            alert(result.message);
            return;
        }

        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            max-width: 90%;
            width: 450px;
        `;

        popup.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 15px;">💳</div>
            <h3 style="color: #1e3c72; margin-bottom: 15px; font-size: 1.4rem;">Thông tin chuyển khoản</h3>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
                <div style="margin-bottom: 12px;">
                    <strong>🏦 Ngân hàng:</strong> ${result.paymentInfo.bank}
                </div>
                <div style="margin-bottom: 12px;">
                    <strong>📱 Số tài khoản:</strong> 
                    <span style="color: #1e3c72; font-weight: 700; font-size: 1.1rem;">${result.paymentInfo.accountNumber}</span>
                    <button onclick="navigator.clipboard.writeText('${result.paymentInfo.accountNumber}')" 
                        style="margin-left: 10px; padding: 5px 10px; border: none; background: #667eea; color: white; border-radius: 8px; cursor: pointer;">
                        Copy
                    </button>
                </div>
                <div style="margin-bottom: 12px;">
                    <strong>👤 Tên tài khoản:</strong> ${result.paymentInfo.accountName}
                </div>
                <div style="margin-bottom: 12px;">
                    <strong>💰 Số tiền:</strong> 
                    <span style="color: #e74c3c; font-weight: 700; font-size: 1.2rem;">${amount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <strong>✉️ Nội dung:</strong> 
                    <span style="color: #1e3c72; font-weight: 700;">${result.paymentInfo.content}</span>
                    <button onclick="navigator.clipboard.writeText('${result.paymentInfo.content}')" 
                        style="margin-left: 10px; padding: 5px 10px; border: none; background: #667eea; color: white; border-radius: 8px; cursor: pointer;">
                        Copy
                    </button>
                </div>
            </div>

            <p style="color: #666; margin-bottom: 15px; font-size: 0.9rem;">
                Sau khi chuyển khoản, vui lòng liên hệ Zalo để xác nhận thanh toán.
            </p>

            <div style="display: flex; gap: 10px; justify-content: center;">
                <a href="https://zalo.me/0343767490" target="_blank" style="
                    display: inline-block;
                    background: linear-gradient(135deg, #0068ff, #0084ff);
                    color: white;
                    padding: 12px 25px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: 600;
                ">💬 Xác nhận qua Zalo</a>
                
                <button onclick="this.closest('div').parentElement.remove()" style="
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 600;
                ">Đóng</button>
            </div>

            <p style="margin-top: 15px; font-size: 0.85rem; color: #999;">
                Mã thanh toán: <strong>${result.paymentId}</strong>
            </p>
        `;

        document.body.appendChild(popup);
    }
};

// Theme manager
const ThemeManager = {
    FREE_THEME: 'gradient',
    VIP_THEMES: ['space', 'ocean', 'sunset', 'forest'],

    isThemeUnlocked(theme) {
        if (theme === this.FREE_THEME) {
            return true;
        }

        if (UserManager.isVIP()) {
            return true;
        }

        return false;
    },

    getAvailableThemes() {
        if (UserManager.isVIP()) {
            return [this.FREE_THEME, ...this.VIP_THEMES];
        }
        return [this.FREE_THEME];
    },

    applyTheme(theme) {
        if (!this.isThemeUnlocked(theme)) {
            theme = this.FREE_THEME;
        }

        document.body.classList.remove('theme-gradient', 'theme-space', 'theme-ocean', 'theme-sunset', 'theme-forest');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('ielts_selected_theme', theme);

        return theme;
    },

    getCurrentTheme() {
        const saved = localStorage.getItem('ielts_selected_theme');
        return saved || this.FREE_THEME;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserManager, QuestionLimitManager, ThemeManager, PaymentManager, AUTH_CONFIG };
}
