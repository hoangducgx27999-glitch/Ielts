// ========================================
// IELTS VOCABULARY GAME - AUTHENTICATION SYSTEM
// FREE vs PRO (VIP) Management
// ========================================

const AUTH_CONFIG = {
    FREE_QUESTION_LIMIT: 200,  // FREE: 200 câu
    PRO_UNLIMITED: true,        // PRO: Không giới hạn
    STORAGE_KEYS: {
        USER_DATA: 'ielts_user_data',
        USERS_DB: 'ielts_users_db',
        AUTO_LOGIN: 'ielts_auto_login',
        QUESTION_COUNT: 'ielts_question_count',
        IS_PRO: 'ielts_is_pro',
        THEME: 'ielts_selected_theme',
        AVATAR: 'ielts_user_avatar'
    }
};

// ========================================
// USER MANAGER
// ========================================
const UserManager = {
    
    // Đăng ký tài khoản mới
    register(username, password) {
        const users = this.getAllUsers();
        
        // Kiểm tra username đã tồn tại
        if (users[username]) {
            return { 
                success: false, 
                message: 'Tên đăng nhập đã tồn tại!' 
            };
        }

        // Validation
        if (username.length < 3 || username.length > 20) {
            return { 
                success: false, 
                message: 'Tên đăng nhập phải từ 3-20 ký tự!' 
            };
        }

        if (password.length < 6) {
            return { 
                success: false, 
                message: 'Mật khẩu phải có ít nhất 6 ký tự!' 
            };
        }

        // Tạo user mới - MỌI USER ĐỀU LÀ FREE
        users[username] = {
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            isPro: false,  // Mặc định FREE
            questionCount: 0,
            avatar: '👨‍🚀',
            stats: {
                totalWords: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                accuracy: 0,
                streak: 0,
                lastPlayedDate: null
            }
        };

        this.saveUsersDB(users);
        
        return { 
            success: true, 
            message: 'Đăng ký thành công! Vui lòng đăng nhập.' 
        };
    },

    // Đăng nhập
    login(username, password, rememberMe = false) {
        const users = this.getAllUsers();
        const user = users[username];

        if (!user) {
            return { 
                success: false, 
                message: 'Tên đăng nhập hoặc mật khẩu không đúng!' 
            };
        }

        if (user.password !== this.hashPassword(password)) {
            return { 
                success: false, 
                message: 'Tên đăng nhập hoặc mật khẩu không đúng!' 
            };
        }

        // Tạo session
        const session = {
            username: username,
            isPro: user.isPro || false,
            loginAt: new Date().toISOString(),
            avatar: user.avatar || '👨‍🚀'
        };

        // Lưu session
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(session));
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, user.questionCount.toString());
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.IS_PRO, user.isPro.toString());
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AVATAR, user.avatar || '👨‍🚀');
        
        // Tự động đăng nhập nếu chọn "Ghi nhớ"
        if (rememberMe) {
            localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AUTO_LOGIN, 'true');
        } else {
            localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.AUTO_LOGIN);
        }

        return { 
            success: true, 
            message: 'Đăng nhập thành công!',
            user: session
        };
    },

    // Chơi với tài khoản khách (GUEST = FREE)
    playAsGuest() {
        // Tạo session guest
        const guestSession = {
            username: 'Khách',
            isPro: false,  // Guest = FREE
            loginAt: new Date().toISOString(),
            avatar: '👤',
            isGuest: true
        };

        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(guestSession));
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, '0');
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.IS_PRO, 'false');
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AVATAR, '👤');
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.AUTO_LOGIN);  // Guest không tự động login

        return { 
            success: true, 
            message: 'Chơi với tài khoản khách',
            user: guestSession
        };
    },

    // Đăng xuất
    logout() {
        // Lưu lại questionCount nếu là user thật
        const currentUser = this.getCurrentUser();
        if (currentUser && !currentUser.isGuest) {
            const users = this.getAllUsers();
            const questionCount = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
            
            if (users[currentUser.username]) {
                users[currentUser.username].questionCount = questionCount;
                this.saveUsersDB(users);
            }
        }

        // Xóa session
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.IS_PRO);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.AUTO_LOGIN);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.THEME);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.AVATAR);
    },

    // Kiểm tra đăng nhập
    isLoggedIn() {
        const userData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
        return userData !== null;
    },

    // Lấy user hiện tại
    getCurrentUser() {
        const userData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    },

    // Kiểm tra PRO
    isPro() {
        const isPro = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.IS_PRO);
        return isPro === 'true';
    },

    // Legacy: Kiểm tra VIP (alias cho isPro)
    isVIP() {
        return this.isPro();
    },

    // Nâng cấp PRO
    upgradeToPro(username) {
        const users = this.getAllUsers();
        
        if (!users[username]) {
            return { success: false, message: 'User không tồn tại!' };
        }

        // Nâng cấp
        users[username].isPro = true;
        users[username].upgradedAt = new Date().toISOString();
        this.saveUsersDB(users);

        // Cập nhật session nếu đang đăng nhập
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            currentUser.isPro = true;
            localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(currentUser));
            localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.IS_PRO, 'true');
        }

        return { 
            success: true, 
            message: 'Nâng cấp PRO thành công!' 
        };
    },

    // Legacy: upgradeToVIP (alias)
    upgradeToVIP() {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.isGuest) {
            return { success: false, message: 'Vui lòng đăng nhập!' };
        }
        return this.upgradeToPro(currentUser.username);
    },

    // Lấy tất cả users
    getAllUsers() {
        const usersData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USERS_DB);
        return usersData ? JSON.parse(usersData) : {};
    },

    // Lưu users DB
    saveUsersDB(users) {
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USERS_DB, JSON.stringify(users));
    },

    // Hash password đơn giản (demo only - production nên dùng bcrypt)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    },

    // Cập nhật avatar
    updateAvatar(emoji) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        // Lưu vào localStorage
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AVATAR, emoji);
        
        // Cập nhật session
        currentUser.avatar = emoji;
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(currentUser));

        // Lưu vào database nếu không phải guest
        if (!currentUser.isGuest) {
            const users = this.getAllUsers();
            if (users[currentUser.username]) {
                users[currentUser.username].avatar = emoji;
                this.saveUsersDB(users);
            }
        }

        return true;
    },

    // Cập nhật stats
    updateStats(stats) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.isGuest) return;

        const users = this.getAllUsers();
        if (users[currentUser.username]) {
            users[currentUser.username].stats = stats;
            this.saveUsersDB(users);
        }
    }
};

// ========================================
// QUESTION LIMIT MANAGER
// ========================================
const QuestionLimitManager = {
    
    // Tăng số câu đã chơi
    incrementQuestionCount() {
        if (UserManager.isPro()) {
            return true; // PRO không giới hạn
        }

        let count = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
        count++;
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, count.toString());

        // Tự động lưu vào user database
        const currentUser = UserManager.getCurrentUser();
        if (currentUser && !currentUser.isGuest) {
            const users = UserManager.getAllUsers();
            if (users[currentUser.username]) {
                users[currentUser.username].questionCount = count;
                UserManager.saveUsersDB(users);
            }
        }

        return count <= AUTH_CONFIG.FREE_QUESTION_LIMIT;
    },

    // Kiểm tra còn câu hỏi không
    canPlayMore() {
        if (UserManager.isPro()) {
            return true;  // PRO không giới hạn
        }

        const count = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
        return count < AUTH_CONFIG.FREE_QUESTION_LIMIT;
    },

    // Lấy số câu còn lại
    getRemainingQuestions() {
        if (UserManager.isPro()) {
            return Infinity;  // PRO không giới hạn
        }

        const count = parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
        return Math.max(0, AUTH_CONFIG.FREE_QUESTION_LIMIT - count);
    },

    // Lấy số câu đã chơi
    getPlayedQuestions() {
        return parseInt(localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT) || '0');
    },

    // ADMIN ONLY: Reset count
    adminResetCount() {
        console.warn('⚠️ ADMIN ONLY: Resetting question count');
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.QUESTION_COUNT, '0');
        
        const currentUser = UserManager.getCurrentUser();
        if (currentUser && !currentUser.isGuest) {
            const users = UserManager.getAllUsers();
            if (users[currentUser.username]) {
                users[currentUser.username].questionCount = 0;
                UserManager.saveUsersDB(users);
            }
        }
    }
};

// ========================================
// THEME MANAGER
// ========================================
const ThemeManager = {
    FREE_THEME: 'gradient',  // Theme duy nhất cho FREE
    
    PRO_THEMES: ['space', 'ocean', 'sunset', 'forest'],  // CHỈ PRO

    // Kiểm tra theme có unlock không
    isThemeUnlocked(theme) {
        if (theme === this.FREE_THEME) {
            return true;  // Gradient - FREE được dùng
        }

        if (UserManager.isPro()) {
            return true;  // PRO unlock TẤT CẢ
        }

        return false;  // FREE chỉ dùng Gradient
    },

    // Lấy danh sách themes khả dụng
    getAvailableThemes() {
        if (UserManager.isPro()) {
            return [this.FREE_THEME, ...this.PRO_THEMES];
        }
        return [this.FREE_THEME];
    },

    // Apply theme
    applyTheme(theme) {
        if (!this.isThemeUnlocked(theme)) {
            theme = this.FREE_THEME;
        }

        document.body.classList.remove('theme-gradient', 'theme-space', 'theme-ocean', 'theme-sunset', 'theme-forest');
        document.body.classList.add(`theme-${theme}`);
        
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.THEME, theme);

        return theme;
    },

    // Get current theme
    getCurrentTheme() {
        const saved = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.THEME);
        return saved || this.FREE_THEME;
    }
};

// ========================================
// EXPORT (nếu dùng modules)
// ========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        UserManager, 
        QuestionLimitManager, 
        ThemeManager, 
        AUTH_CONFIG 
    };
}

// ========================================
// CONSOLE HELPERS (cho dev/admin)
// ========================================
console.log('%c🎮 IELTS Vocabulary Game', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%cAuth System Loaded', 'color: #22c55e; font-weight: bold;');
console.log('%cAdmin Commands:', 'color: #f59e0b; font-weight: bold;');
console.log('  UserManager.upgradeToPro("username") - Nâng cấp PRO');
console.log('  QuestionLimitManager.adminResetCount() - Reset số câu');
console.log('  UserManager.getAllUsers() - Xem tất cả users');
