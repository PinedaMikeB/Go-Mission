/**
 * Go Mission - Install Instructions Modal
 * Flow: Device Selection → Read Instructions Notice → All Steps (Scrollable)
 * 
 * Updated: Shows "Already installed?" section with app icon
 */

const InstallModal = {
    currentDevice: null,
    currentScreen: 'language', // 'language', 'device', 'notice', 'steps'
    currentLang: 'en',
    isInstalled: false,
    
    steps: {
        android: [
            { key: 'and1', icon: '⋮' },
            { key: 'and2', icon: '➕' },
            { key: 'and3', icon: '✓' },
            { key: 'and4', icon: 'logo' },
            { key: 'and5', icon: '🔔' }
        ],
        iphone: [
            { key: 'iph1', icon: 'share' },
            { key: 'iph2', icon: '➕' },
            { key: 'iph3', icon: '✓' },
            { key: 'iph4', icon: 'logo' },
            { key: 'iph5', icon: '🔔' }
        ],
        windows: [
            { key: 'win1', icon: '⊕' },
            { key: 'win2', icon: '✓' },
            { key: 'win3', icon: 'logo' },
            { key: 'win4', icon: '🔔' }
        ]
    },
    
    translations: {
        en: {
            // Language selection
            chooseLanguage: 'Choose Language',
            
            // Device selection
            chooseDevice: 'Choose your device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            langToggle: '🇵🇭 Tagalog',
            
            // Notice screen
            noticeTitle: '📖 Before Installing',
            noticeText: 'Please READ ALL the instructions first before you begin. This will help you install the app correctly.',
            noticeTip: 'Tip: You can scroll down to see all the steps.',
            proceed: 'I Understand, Show Steps',
            
            // Steps screen
            stepsTitle: 'Installation Steps',
            beginTitle: 'Ready to Install!',
            beginText: 'Now tap the Share button below',
            beginTextAndroid: 'Now tap the Menu (⋮) button above and click "Add to Home Screen"',
            beginTextWindows: 'Now click the Install icon (⊕) above',
            beginTextIphone: 'Now tap the Share (📤) button below and click "Add to Home Screen"',
            backToSteps: '← Back to Instructions',
            
            // Android steps
            and1_title: 'Tap the Menu Button',
            and1_desc: 'Look for the 3 dots (⋮) at the top right corner of Chrome',
            and2_title: 'Tap "Add to Home Screen"',
            and2_desc: 'Or tap "Install App" if you see it in the menu',
            and3_title: 'Tap "Install" or "Add"',
            and3_desc: 'Confirm to add the app to your home screen',
            and4_title: 'Open from Home Screen',
            and4_desc: 'Find the Go Mission icon on your home screen and tap it',
            and5_title: 'Enable Notifications',
            and5_desc: 'Tap "Enable" when prompted to receive updates from your group',
            
            // iPhone steps  
            iph1_title: 'Tap the Share Button',
            iph1_desc: 'Look for this icon (📤) at the bottom of Safari',
            iph2_title: 'Tap "Add to Home Screen"',
            iph2_desc: 'Scroll down in the share menu to find this option',
            iph3_title: 'Tap "Add"',
            iph3_desc: 'Located at the top right corner of the screen',
            iph4_title: 'Open from Home Screen',
            iph4_desc: 'Find the Go Mission icon on your home screen and tap it',
            iph5_title: 'Enable Notifications',
            iph5_desc: 'Tap "Enable" when prompted to receive updates from your group',
            iphNote: '📱 Requires iOS 16.4 or newer for notifications',
            
            // Windows steps
            win1_title: 'Click the Install Icon',
            win1_desc: 'Look for this icon (⊕) in the address bar on the right side',
            win2_title: 'Click "Install"',
            win2_desc: 'Confirm the installation when the popup appears',
            win3_title: 'Open the App',
            win3_desc: 'Find Go Mission in your apps, taskbar, or desktop',
            win4_title: 'Enable Notifications',
            win4_desc: 'Click "Enable" when prompted to receive updates from your group'
        },
        tl: {
            // Language selection
            chooseLanguage: 'Piliin ang Wika',
            
            // Device selection
            chooseDevice: 'Piliin ang iyong device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            langToggle: '🇺🇸 English',
            
            // Notice screen
            noticeTitle: '📖 Bago Mag-install',
            noticeText: 'Mangyaring BASAHIN MUNA ANG LAHAT ng instructions bago ka magsimula. Makakatulong ito para ma-install ng tama ang app.',
            noticeTip: 'Tip: Pwede kang mag-scroll pababa para makita lahat ng steps.',
            proceed: 'Naintindihan Ko, Ipakita ang Steps',
            
            // Steps screen
            stepsTitle: 'Mga Hakbang sa Pag-install',
            beginTitle: 'Handa Nang I-install!',
            beginText: 'Pindutin ang Share button sa baba',
            beginTextAndroid: 'Pindutin ang Menu (⋮) button sa itaas at i-click ang "Add to Home Screen"',
            beginTextWindows: 'I-click ang Install icon (⊕) sa itaas',
            beginTextIphone: 'Pindutin ang Share (📤) button sa baba at i-click ang "Add to Home Screen"',
            backToSteps: '← Bumalik sa Instructions',
            
            // Android steps
            and1_title: 'Pindutin ang Menu Button',
            and1_desc: 'Hanapin ang 3 tuldok (⋮) sa itaas na kanang bahagi ng Chrome',
            and2_title: 'Pindutin "Add to Home Screen"',
            and2_desc: 'O pindutin "Install App" kung nakikita mo sa menu',
            and3_title: 'Pindutin "Install" o "Add"',
            and3_desc: 'Kumpirmahin para idagdag ang app sa home screen',
            and4_title: 'Buksan mula sa Home Screen',
            and4_desc: 'Hanapin ang Go Mission icon sa home screen at pindutin',
            and5_title: 'I-enable ang Notifications',
            and5_desc: 'Pindutin "Enable" kapag lumabas para makatanggap ng updates',
            
            // iPhone steps
            iph1_title: 'Pindutin ang Share Button',
            iph1_desc: 'Hanapin ang icon na ito (📤) sa ibaba ng Safari',
            iph2_title: 'Pindutin "Add to Home Screen"',
            iph2_desc: 'Mag-scroll pababa sa share menu para makita ito',
            iph3_title: 'Pindutin "Add"',
            iph3_desc: 'Nasa itaas na kanang bahagi ng screen',
            iph4_title: 'Buksan mula sa Home Screen',
            iph4_desc: 'Hanapin ang Go Mission icon sa home screen at pindutin',
            iph5_title: 'I-enable ang Notifications',
            iph5_desc: 'Pindutin "Enable" kapag lumabas para makatanggap ng updates',
            iphNote: '📱 Kailangan iOS 16.4 o mas bago para sa notifications',
            
            // Windows steps
            win1_title: 'I-click ang Install Icon',
            win1_desc: 'Hanapin ang icon na ito (⊕) sa address bar sa kanang bahagi',
            win2_title: 'I-click "Install"',
            win2_desc: 'Kumpirmahin kapag lumabas ang popup',
            win3_title: 'Buksan ang App',
            win3_desc: 'Hanapin ang Go Mission sa apps, taskbar, o desktop',
            win4_title: 'I-enable ang Notifications',
            win4_desc: 'I-click "Enable" kapag lumabas para makatanggap ng updates'
        }
    },
    
    t(key) {
        return this.translations[this.currentLang][key] || key;
    },
    
    checkIfInstalled() {
        if (window.matchMedia('(display-mode: standalone)').matches) return true;
        if (window.navigator.standalone === true) return true;
        return false;
    },
    
    /**
     * Check if this is the first time opening as installed PWA
     */
    isFirstLaunchAsPWA() {
        const hasSeenWelcome = localStorage.getItem('goMission_welcomeShown');
        return this.checkIfInstalled() && !hasSeenWelcome;
    },
    
    /**
     * Check if user is on desktop (Windows, Mac, Linux)
     */
    isDesktop() {
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        const isMobile = isIOS || isAndroid || /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        return !isMobile;
    },
    
    init() {
        this.isInstalled = this.checkIfInstalled();
        const params = new URLSearchParams(window.location.search);
        const forceInstall = params.has('install');
        
        // Check saved language preference
        const savedLang = localStorage.getItem('goMission_language');
        if (savedLang) {
            this.currentLang = savedLang;
        }
        
        // Skip install modal for desktop users - they don't need to install
        if (this.isDesktop()) {
            console.log('[InstallModal] Desktop detected - skipping install prompt');
            return;
        }
        
        // If first time opening as installed PWA, show welcome message!
        if (this.isFirstLaunchAsPWA()) {
            console.log('[InstallModal] First launch as PWA - showing welcome!');
            setTimeout(() => this.showWelcome(), 500);
            return;
        }
        
        // Only show install guide if NOT in standalone mode (PWA) for mobile
        if (forceInstall || !this.isInstalled) {
            setTimeout(() => this.show(), 500);
        }
        
        if (forceInstall) {
            const url = new URL(window.location);
            url.searchParams.delete('install');
            window.history.replaceState({}, '', url);
        }
    },
    
    /**
     * Show welcome message for first-time PWA launch
     */
    showWelcome() {
        const lang = this.currentLang;
        
        const welcomeText = {
            en: {
                title: '🎉 Welcome to Go Mission!',
                subtitle: 'The app is now installed on your device.',
                findApp: 'You can always find it on your home screen:',
                appName: 'Go Mission',
                journey: 'Your journey with God starts today!',
                button: "Let's Start! 🔥"
            },
            tl: {
                title: '🎉 Maligayang Pagdating sa Go Mission!',
                subtitle: 'Ang app ay naka-install na sa iyong device.',
                findApp: 'Makikita mo ito sa iyong home screen:',
                appName: 'Go Mission',
                journey: 'Ang iyong paglalakbay kasama ang Diyos ay nagsisimula ngayon!',
                button: 'Simulan Na! 🔥'
            }
        };
        
        const t = welcomeText[lang] || welcomeText.en;
        
        const modal = document.createElement('div');
        modal.id = 'welcomeModal';
        modal.innerHTML = `
            <div class="welcome-overlay"></div>
            <div class="welcome-content">
                <div class="welcome-icon">
                    <img src="/icons/icon-192.png" alt="Go Mission" class="welcome-logo">
                </div>
                
                <h1 class="welcome-title">${t.title}</h1>
                <p class="welcome-subtitle">${t.subtitle}</p>
                
                <div class="welcome-app-preview">
                    <p class="welcome-find-text">${t.findApp}</p>
                    <div class="welcome-app-icon">
                        <img src="/icons/icon-192.png" alt="Go Mission">
                        <span>${t.appName}</span>
                    </div>
                </div>
                
                <p class="welcome-journey">${t.journey}</p>
                
                <button class="welcome-btn" onclick="InstallModal.closeWelcome()">
                    ${t.button}
                </button>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.id = 'welcomeModalStyles';
        style.textContent = `
            #welcomeModal {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            #welcomeModal .welcome-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.95);
            }
            #welcomeModal .welcome-content {
                position: relative;
                background: linear-gradient(135deg, #1a0505 0%, #2a0a0a 100%);
                border: 2px solid rgba(251, 191, 36, 0.4);
                border-radius: 28px;
                padding: 32px 24px;
                max-width: 380px;
                width: 100%;
                text-align: center;
                color: #fff;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(251, 191, 36, 0.1);
            }
            #welcomeModal .welcome-icon {
                margin-bottom: 20px;
            }
            #welcomeModal .welcome-logo {
                width: 100px;
                height: 100px;
                border-radius: 24px;
                box-shadow: 0 8px 30px rgba(245, 158, 11, 0.4);
                animation: pulse-glow 2s infinite;
            }
            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 8px 30px rgba(245, 158, 11, 0.4); }
                50% { box-shadow: 0 8px 50px rgba(245, 158, 11, 0.6); }
            }
            #welcomeModal .welcome-title {
                font-size: 24px;
                font-weight: 800;
                color: #f59e0b;
                margin: 0 0 8px 0;
            }
            #welcomeModal .welcome-subtitle {
                font-size: 16px;
                color: #e2e8f0;
                margin: 0 0 24px 0;
            }
            #welcomeModal .welcome-app-preview {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 16px;
                margin-bottom: 20px;
            }
            #welcomeModal .welcome-find-text {
                font-size: 13px;
                color: #94a3b8;
                margin: 0 0 12px 0;
            }
            #welcomeModal .welcome-app-icon {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            #welcomeModal .welcome-app-icon img {
                width: 64px;
                height: 64px;
                border-radius: 16px;
            }
            #welcomeModal .welcome-app-icon span {
                font-size: 14px;
                font-weight: 600;
                color: #fff;
            }
            #welcomeModal .welcome-journey {
                font-size: 18px;
                font-weight: 600;
                color: #4ade80;
                margin: 0 0 24px 0;
                line-height: 1.4;
            }
            #welcomeModal .welcome-btn {
                width: 100%;
                padding: 18px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                border-radius: 16px;
                color: #1a0505;
                font-size: 18px;
                font-weight: 800;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
            }
            #welcomeModal .welcome-btn:active {
                transform: scale(0.98);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close welcome modal and mark as shown
     */
    closeWelcome() {
        localStorage.setItem('goMission_welcomeShown', 'true');
        
        const modal = document.getElementById('welcomeModal');
        const style = document.getElementById('welcomeModalStyles');
        if (modal) modal.remove();
        if (style) style.remove();
        
        document.body.style.overflow = '';
        
        // Navigate to home if not already there
        if (typeof App !== 'undefined' && App.showScreen) {
            App.showScreen('home');
        }
    },
    
    show() {
        // Double-check: Don't show for desktop
        if (this.isDesktop()) {
            console.log('[InstallModal] Desktop user - not showing install modal');
            return;
        }
        
        this.currentDevice = null;
        this.currentScreen = 'language';
        this.render();
    },
    
    render() {
        const existing = document.getElementById('installModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'installModal';
        
        if (this.currentScreen === 'language') {
            modal.innerHTML = this.renderLanguageSelection();
        } else if (this.currentScreen === 'device') {
            modal.innerHTML = this.renderDeviceSelection();
        } else if (this.currentScreen === 'notice') {
            modal.innerHTML = this.renderNotice();
        } else if (this.currentScreen === 'steps') {
            modal.innerHTML = this.renderAllSteps();
        }
        
        this.addStyles();
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    },
    
    renderLanguageSelection() {
        return `
            <div class="install-overlay"></div>
            <div class="install-content">
                <div class="install-logo">
                    <img src="/icons/icon-192.png" alt="Go Mission" class="logo-icon">
                </div>
                <h2 class="install-title">🔥 Go Mission</h2>
                <p class="install-tagline">Making Disciple-Makers</p>
                
                <p class="install-subtitle" style="margin-top: 24px;">Choose your language:</p>
                <p class="install-subtitle-small">Piliin ang iyong wika:</p>
                
                <div class="language-buttons">
                    <button class="lang-btn" onclick="InstallModal.selectLanguage('en')">
                        <span class="lang-flag">🇺🇸</span>
                        <span class="lang-name">English</span>
                    </button>
                    <button class="lang-btn" onclick="InstallModal.selectLanguage('tl')">
                        <span class="lang-flag">🇵🇭</span>
                        <span class="lang-name">Tagalog</span>
                    </button>
                </div>
            </div>
        `;
    },
    
    selectLanguage(lang) {
        this.currentLang = lang;
        
        // Save language preference to localStorage (same key as i18n module)
        localStorage.setItem('goMission_language', lang);
        
        // Also update i18n module if it's loaded
        if (typeof i18n !== 'undefined' && i18n.setLang) {
            i18n.setLang(lang);
        }
        
        console.log('[InstallModal] Language saved:', lang);
        
        this.currentScreen = 'device';
        this.render();
    },
    
    renderDeviceSelection() {
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        
        let detected = '';
        if (isIOS) detected = 'iphone';
        else if (isAndroid) detected = 'android';
        
        return `
            <div class="install-overlay"></div>
            <div class="install-content">
                <div class="install-header">
                    <button class="back-btn" onclick="InstallModal.backToLanguage()">← Back</button>
                    <h2>🔥 Install Go Mission</h2>
                    <div style="width: 50px;"></div>
                </div>
                
                <!-- Device Selection - Only Android and iPhone -->
                <p class="install-subtitle">${this.t('chooseDevice')}</p>
                
                <div class="device-buttons">
                    <button class="device-btn ${detected === 'android' ? 'detected' : ''}" onclick="InstallModal.selectDevice('android')">
                        <span class="device-icon">🤖</span>
                        <span class="device-name">${this.t('android')}</span>
                    </button>
                    <button class="device-btn ${detected === 'iphone' ? 'detected' : ''}" onclick="InstallModal.selectDevice('iphone')">
                        <span class="device-icon">🍎</span>
                        <span class="device-name">${this.t('iphone')}</span>
                    </button>
                </div>
            </div>
        `;
    },
    
    backToLanguage() {
        this.currentScreen = 'language';
        this.render();
    },
    
    renderNotice() {
        return `
            <div class="install-overlay"></div>
            <div class="install-content notice-content">
                <div class="notice-icon">📖</div>
                <h2 class="notice-title">${this.t('noticeTitle')}</h2>
                <p class="notice-text">${this.t('noticeText')}</p>
                <p class="notice-tip">💡 ${this.t('noticeTip')}</p>
                
                <button class="primary-btn" onclick="InstallModal.showSteps()">
                    ${this.t('proceed')} →
                </button>
                
                <button class="back-link" onclick="InstallModal.backToDevice()">
                    ← Back
                </button>
            </div>
        `;
    },
    
    renderAllSteps() {
        const deviceSteps = this.steps[this.currentDevice];
        
        let stepsHtml = deviceSteps.map((step, index) => {
            const title = this.t(step.key + '_title');
            const desc = this.t(step.key + '_desc');
            const iconHtml = this.getStepIcon(step.icon);
            
            return `
                <div class="step-card">
                    <div class="step-num">${index + 1}</div>
                    <div class="step-body">
                        <div class="step-icon-container">${iconHtml}</div>
                        <div class="step-text">
                            <h4>${title}</h4>
                            <p>${desc}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // iOS note
        if (this.currentDevice === 'iphone') {
            stepsHtml += `<div class="ios-note">${this.t('iphNote')}</div>`;
        }
        
        return `
            <div class="install-overlay"></div>
            <div class="install-content steps-content">
                <div class="steps-header">
                    <button class="back-btn" onclick="InstallModal.backToDevice()">← Back</button>
                    <h2>${this.t('stepsTitle')}</h2>
                    <button class="lang-toggle-small" onclick="InstallModal.toggleLang()">${this.currentLang === 'en' ? '🇵🇭' : '🇺🇸'}</button>
                </div>
                
                <div class="steps-scroll">
                    ${stepsHtml}
                    
                    <div class="begin-section">
                        <div class="begin-icon">✅</div>
                        <h3>${this.t('beginTitle')}</h3>
                        <p>${this.currentDevice === 'android' ? this.t('beginTextAndroid') : this.currentDevice === 'windows' ? this.t('beginTextWindows') : this.t('beginTextIphone')}</p>
                        <div class="point-${this.currentDevice === 'android' || this.currentDevice === 'windows' ? 'up' : 'down'}">
                            <span>${this.currentDevice === 'android' || this.currentDevice === 'windows' ? '☝️' : '👇'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    getStepIcon(icon) {
        if (icon === 'share') {
            return `
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
            `;
        } else if (icon === 'logo') {
            return `<img src="/icons/icon-192.png" alt="Go Mission" class="step-logo">`;
        } else {
            return `<span class="step-icon-text">${icon}</span>`;
        }
    },
    
    selectDevice(device) {
        this.currentDevice = device;
        this.currentScreen = 'notice';
        this.render();
    },
    
    showSteps() {
        this.currentScreen = 'steps';
        this.render();
    },
    
    backToDevice() {
        this.currentDevice = null;
        this.currentScreen = 'device';
        this.render();
    },
    
    close() {
        const modal = document.getElementById('installModal');
        if (modal) modal.remove();
        document.body.style.overflow = '';
    },
    
    toggleLang() {
        this.currentLang = this.currentLang === 'en' ? 'tl' : 'en';
        this.render();
    },
    
    addStyles() {
        const oldStyle = document.getElementById('installModalStyles');
        if (oldStyle) oldStyle.remove();
        
        const style = document.createElement('style');
        style.id = 'installModalStyles';
        style.textContent = `
            #installModal {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 12px;
            }
            #installModal .install-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.95);
            }
            #installModal .install-content {
                position: relative;
                background: #1a0505;
                border: 1px solid rgba(251, 191, 36, 0.3);
                border-radius: 24px;
                padding: 24px;
                max-width: 420px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                color: #fff;
                text-align: center;
            }
            
            /* Device Selection Screen */
            #installModal .install-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            #installModal .install-header h2 {
                font-size: 18px;
                font-weight: 800;
                color: #f59e0b;
                margin: 0;
            }
            #installModal .back-btn {
                background: transparent;
                border: none;
                color: #f59e0b;
                font-size: 14px;
                cursor: pointer;
                padding: 4px;
            }
            
            /* Language Selection Screen */
            #installModal .install-logo {
                margin-bottom: 16px;
            }
            #installModal .logo-icon {
                width: 80px;
                height: 80px;
                border-radius: 20px;
                box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
            }
            #installModal .install-title {
                font-size: 28px;
                font-weight: 800;
                color: #f59e0b;
                margin: 0 0 4px 0;
            }
            #installModal .install-tagline {
                font-size: 14px;
                color: #94a3b8;
                margin: 0;
            }
            #installModal .install-subtitle-small {
                font-size: 13px;
                color: #64748b;
                margin: 4px 0 20px 0;
            }
            #installModal .language-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            #installModal .lang-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 16px 20px;
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%);
                border: 2px solid rgba(251, 191, 36, 0.3);
                border-radius: 16px;
                color: #fff;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.2s;
            }
            #installModal .lang-btn:hover {
                border-color: #f59e0b;
                background: rgba(251, 191, 36, 0.2);
            }
            #installModal .lang-flag {
                font-size: 32px;
            }
            #installModal .lang-name {
                font-weight: 700;
            }
            #installModal .lang-toggle {
                background: transparent;
                border: 1px solid rgba(251, 191, 36, 0.3);
                color: #f59e0b;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
            }
            
            /* Already Installed Section */
            #installModal .already-installed-section {
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
            }
            #installModal .already-installed-badge {
                display: inline-block;
                background: rgba(34, 197, 94, 0.2);
                color: #4ade80;
                font-size: 14px;
                font-weight: 700;
                padding: 6px 14px;
                border-radius: 20px;
                margin-bottom: 12px;
            }
            #installModal .already-installed-text {
                color: #e2e8f0;
                font-size: 14px;
                line-height: 1.5;
                margin: 0 0 12px 0;
            }
            #installModal .find-icon-text {
                color: #94a3b8;
                font-size: 13px;
                margin: 0 0 12px 0;
            }
            #installModal .app-icon-preview {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            #installModal .preview-icon {
                width: 72px;
                height: 72px;
                border-radius: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            #installModal .preview-label {
                color: #fff;
                font-size: 13px;
                font-weight: 600;
            }
            
            /* Section Divider */
            #installModal .section-divider {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 20px 0;
            }
            #installModal .section-divider::before,
            #installModal .section-divider::after {
                content: '';
                flex: 1;
                height: 1px;
                background: rgba(255,255,255,0.1);
            }
            #installModal .section-divider span {
                color: #64748b;
                font-size: 13px;
                white-space: nowrap;
            }
            
            #installModal .install-subtitle {
                color: #94a3b8;
                margin-bottom: 16px;
                font-size: 14px;
            }
            #installModal .device-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #installModal .device-btn {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 14px 18px;
                background: rgba(255,255,255,0.05);
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 14px;
                color: #fff;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s;
            }
            #installModal .device-btn.detected {
                border-color: #f59e0b;
                background: rgba(251, 191, 36, 0.1);
            }
            #installModal .device-btn:hover {
                border-color: #f59e0b;
            }
            #installModal .device-icon {
                font-size: 28px;
            }
            #installModal .device-name {
                font-weight: 600;
            }
            
            /* Notice Screen */
            #installModal .notice-content {
                padding: 32px 24px;
            }
            #installModal .notice-icon {
                font-size: 64px;
                margin-bottom: 16px;
            }
            #installModal .notice-title {
                font-size: 24px;
                font-weight: 800;
                color: #f59e0b;
                margin: 0 0 16px 0;
            }
            #installModal .notice-text {
                color: #e2e8f0;
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 16px 0;
            }
            #installModal .notice-tip {
                color: #94a3b8;
                font-size: 14px;
                margin: 0 0 24px 0;
                padding: 12px;
                background: rgba(251, 191, 36, 0.1);
                border-radius: 12px;
            }
            #installModal .primary-btn {
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                border-radius: 14px;
                color: #1a0505;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                margin-bottom: 12px;
            }
            #installModal .back-link {
                background: transparent;
                border: none;
                color: #64748b;
                font-size: 14px;
                cursor: pointer;
            }
            
            /* Steps Screen */
            #installModal .steps-content {
                padding: 16px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            }
            #installModal .steps-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                margin-bottom: 12px;
                flex-shrink: 0;
            }
            #installModal .steps-header h2 {
                font-size: 16px;
                font-weight: 700;
                color: #f59e0b;
                margin: 0;
            }
            #installModal .back-btn {
                background: transparent;
                border: none;
                color: #f59e0b;
                font-size: 14px;
                cursor: pointer;
                padding: 4px;
            }
            #installModal .lang-toggle-small {
                background: transparent;
                border: none;
                font-size: 20px;
                cursor: pointer;
            }
            #installModal .steps-scroll {
                overflow-y: auto;
                flex: 1;
                padding-right: 4px;
            }
            #installModal .step-card {
                display: flex;
                gap: 12px;
                padding: 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                margin-bottom: 12px;
                text-align: left;
            }
            #installModal .step-num {
                width: 32px;
                height: 32px;
                background: #f59e0b;
                color: #1a0505;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 16px;
                flex-shrink: 0;
            }
            #installModal .step-body {
                flex: 1;
                display: flex;
                gap: 12px;
                align-items: flex-start;
            }
            #installModal .step-icon-container {
                flex-shrink: 0;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
            }
            #installModal .step-icon-text {
                font-size: 28px;
            }
            #installModal .step-logo {
                width: 40px;
                height: 40px;
                border-radius: 10px;
            }
            #installModal .share-icon {
                width: 36px;
                height: 36px;
            }
            #installModal .step-text {
                flex: 1;
            }
            #installModal .step-text h4 {
                font-size: 15px;
                font-weight: 700;
                color: #fff;
                margin: 0 0 4px 0;
            }
            #installModal .step-text p {
                font-size: 13px;
                color: #94a3b8;
                margin: 0;
                line-height: 1.4;
            }
            #installModal .ios-note {
                background: rgba(234, 179, 8, 0.15);
                border: 1px solid rgba(234, 179, 8, 0.3);
                padding: 12px;
                border-radius: 12px;
                text-align: center;
                color: #fcd34d;
                font-size: 13px;
                margin-bottom: 16px;
            }
            #installModal .begin-section {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
                border: 2px solid rgba(34, 197, 94, 0.3);
                border-radius: 20px;
                padding: 24px 20px;
                text-align: center;
                margin-top: 8px;
            }
            #installModal .begin-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
            #installModal .begin-section h3 {
                font-size: 20px;
                font-weight: 800;
                color: #4ade80;
                margin: 0 0 8px 0;
            }
            #installModal .begin-section p {
                font-size: 16px;
                color: #e2e8f0;
                margin: 0 0 16px 0;
                line-height: 1.5;
                font-weight: 600;
            }
            #installModal .point-down,
            #installModal .point-up {
                display: flex;
                justify-content: center;
            }
            #installModal .point-down {
                animation: bounce-down 1s infinite;
            }
            #installModal .point-up {
                animation: bounce-up 1s infinite;
            }
            #installModal .point-down span,
            #installModal .point-up span {
                font-size: 48px;
            }
            @keyframes bounce-down {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(10px); }
            }
            @keyframes bounce-up {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
        `;
        
        document.head.appendChild(style);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => InstallModal.init());
} else {
    InstallModal.init();
}
