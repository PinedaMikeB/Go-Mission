/**
 * Go Mission - Install Instructions Modal
 * Shows step-by-step install instructions based on device type
 * 
 * Usage:
 * - Add ?install=true to URL to show modal automatically
 * - Or call InstallModal.show() manually
 */

const InstallModal = {
    currentDevice: 'android',
    currentLang: 'en',
    
    translations: {
        en: {
            title: 'Install Go Mission',
            subtitle: 'Choose your device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            step: 'Step',
            done: 'Done!',
            doneMsg: 'You can now receive notifications from your group!',
            close: 'Close',
            langToggle: '🇵🇭 Tagalog',
            // Windows steps
            win1: 'Open Chrome browser',
            win1sub: 'Go to:',
            win2: 'Click the install icon',
            win2sub: 'Look for this icon in the address bar (right side)',
            win3: 'Click "Install"',
            win3sub: 'A popup will appear, click Install',
            win4: 'Enable notifications',
            win4sub: 'Click "Enable" when the prompt appears after signing in',
            // Android steps
            and1: 'Open Chrome browser',
            and1sub: 'Go to:',
            and2: 'Tap the 3 dots menu',
            and2sub: 'Located at the top right corner',
            and3: 'Tap "Add to Home Screen"',
            and3sub: 'Scroll down if you don\'t see it',
            and4: 'Tap "Install"',
            and4sub: 'The app will be added to your home screen',
            and5: 'Enable notifications',
            and5sub: 'Open the app and tap "Enable" when prompted',
            // iPhone steps
            iph1: 'Open Safari browser',
            iph1sub: 'Important: Use Safari, not Chrome!',
            iph2: 'Tap the Share button',
            iph2sub: 'The square icon with arrow at the bottom',
            iph3: 'Tap "Add to Home Screen"',
            iph3sub: 'Scroll down to find it',
            iph4: 'Tap "Add"',
            iph4sub: 'Located at the top right',
            iph5: 'Open from Home Screen',
            iph5sub: 'Important: Don\'t open in Safari! Use the app icon',
            iph6: 'Enable notifications',
            iph6sub: 'Sign in and tap "Enable" when prompted',
            iphNote: 'Requires iOS 16.4 or newer'
        },
        tl: {
            title: 'I-install ang Go Mission',
            subtitle: 'Piliin ang iyong device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            step: 'Hakbang',
            done: 'Tapos na!',
            doneMsg: 'Makakatanggap ka na ng notifications mula sa iyong grupo!',
            close: 'Isara',
            langToggle: '🇺🇸 English',
            // Windows steps
            win1: 'Buksan ang Chrome browser',
            win1sub: 'Pumunta sa:',
            win2: 'I-click ang install icon',
            win2sub: 'Hanapin ito sa address bar (kanang bahagi)',
            win3: 'I-click ang "Install"',
            win3sub: 'May lalabas na popup, i-click ang Install',
            win4: 'I-enable ang notifications',
            win4sub: 'I-click ang "Enable" pagkatapos mag-sign in',
            // Android steps
            and1: 'Buksan ang Chrome browser',
            and1sub: 'Pumunta sa:',
            and2: 'Pindutin ang 3 tuldok',
            and2sub: 'Nasa itaas na kanang bahagi',
            and3: 'Pindutin ang "Add to Home Screen"',
            and3sub: 'Mag-scroll pababa kung hindi mo makita',
            and4: 'Pindutin ang "Install"',
            and4sub: 'Madadagdag ang app sa home screen mo',
            and5: 'I-enable ang notifications',
            and5sub: 'Buksan ang app at pindutin ang "Enable"',
            // iPhone steps
            iph1: 'Buksan ang Safari browser',
            iph1sub: 'Importante: Safari lang, hindi Chrome!',
            iph2: 'Pindutin ang Share button',
            iph2sub: 'Yung icon na box na may arrow sa ibaba',
            iph3: 'Pindutin ang "Add to Home Screen"',
            iph3sub: 'Mag-scroll pababa para makita',
            iph4: 'Pindutin ang "Add"',
            iph4sub: 'Nasa itaas na kanan',
            iph5: 'Buksan mula sa Home Screen',
            iph5sub: 'Importante: Huwag buksan sa Safari! Gamitin ang app icon',
            iph6: 'I-enable ang notifications',
            iph6sub: 'Mag-sign in at pindutin ang "Enable"',
            iphNote: 'Kailangan iOS 16.4 o mas bago'
        }
    },
    
    t(key) {
        return this.translations[this.currentLang][key] || key;
    },
    
    show() {
        // Detect device
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod/i.test(ua)) {
            this.currentDevice = 'iphone';
        } else if (/Android/i.test(ua)) {
            this.currentDevice = 'android';
        } else {
            this.currentDevice = 'windows';
        }
        
        this.render();
    },
    
    render() {
        // Remove existing modal
        const existing = document.getElementById('installModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'installModal';
        modal.innerHTML = this.getModalHTML();
        
        // Add styles
        this.addStyles();
        document.body.appendChild(modal);
        
        // Remove ?install=true from URL
        const url = new URL(window.location);
        url.searchParams.delete('install');
        window.history.replaceState({}, '', url);
    },
    
    getModalHTML() {
        return `
            <div class="install-overlay" onclick="InstallModal.close()"></div>
            <div class="install-content">
                <div class="install-header">
                    <h2>📱 ${this.t('title')}</h2>
                    <button class="lang-toggle" onclick="InstallModal.toggleLang()">${this.t('langToggle')}</button>
                </div>
                
                <p class="install-subtitle">${this.t('subtitle')}</p>
                
                <div class="device-tabs">
                    <button class="device-tab ${this.currentDevice === 'windows' ? 'active' : ''}" onclick="InstallModal.setDevice('windows')">
                        💻 ${this.t('windows')}
                    </button>
                    <button class="device-tab ${this.currentDevice === 'android' ? 'active' : ''}" onclick="InstallModal.setDevice('android')">
                        🤖 ${this.t('android')}
                    </button>
                    <button class="device-tab ${this.currentDevice === 'iphone' ? 'active' : ''}" onclick="InstallModal.setDevice('iphone')">
                        🍎 ${this.t('iphone')}
                    </button>
                </div>
                
                <div class="steps-container">
                    ${this.renderSteps()}
                </div>
                
                <div class="install-done">
                    <span class="done-icon">🎉</span>
                    <h3>${this.t('done')}</h3>
                    <p>${this.t('doneMsg')}</p>
                </div>
                
                <button class="close-btn" onclick="InstallModal.close()">
                    ${this.t('close')}
                </button>
            </div>
        `;
    },
    
    renderSteps() {
        const url = 'gomission.netlify.app';
        
        if (this.currentDevice === 'windows') {
            return `
                <div class="step-item">
                    <div class="step-num">1</div>
                    <div class="step-content">
                        <h4>${this.t('win1')}</h4>
                        <p>${this.t('win1sub')}</p>
                        <span class="step-highlight">${url}</span>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">2</div>
                    <div class="step-content">
                        <h4>${this.t('win2')}</h4>
                        <p>${this.t('win2sub')}</p>
                        <div class="step-icon">⊕</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">3</div>
                    <div class="step-content">
                        <h4>${this.t('win3')}</h4>
                        <p>${this.t('win3sub')}</p>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">4</div>
                    <div class="step-content">
                        <h4>${this.t('win4')}</h4>
                        <p>${this.t('win4sub')}</p>
                    </div>
                </div>
            `;
        } else if (this.currentDevice === 'android') {
            return `
                <div class="step-item">
                    <div class="step-num">1</div>
                    <div class="step-content">
                        <h4>${this.t('and1')}</h4>
                        <p>${this.t('and1sub')}</p>
                        <span class="step-highlight">${url}</span>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">2</div>
                    <div class="step-content">
                        <h4>${this.t('and2')}</h4>
                        <p>${this.t('and2sub')}</p>
                        <div class="step-icon">⋮</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">3</div>
                    <div class="step-content">
                        <h4>${this.t('and3')}</h4>
                        <p>${this.t('and3sub')}</p>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">4</div>
                    <div class="step-content">
                        <h4>${this.t('and4')}</h4>
                        <p>${this.t('and4sub')}</p>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">5</div>
                    <div class="step-content">
                        <h4>${this.t('and5')}</h4>
                        <p>${this.t('and5sub')}</p>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="step-item">
                    <div class="step-num">1</div>
                    <div class="step-content">
                        <h4>${this.t('iph1')}</h4>
                        <p class="step-warning">${this.t('iph1sub')}</p>
                        <span class="step-highlight">${url}</span>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">2</div>
                    <div class="step-content">
                        <h4>${this.t('iph2')}</h4>
                        <p>${this.t('iph2sub')}</p>
                        <div class="step-icon">📤</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">3</div>
                    <div class="step-content">
                        <h4>${this.t('iph3')}</h4>
                        <p>${this.t('iph3sub')}</p>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">4</div>
                    <div class="step-content">
                        <h4>${this.t('iph4')}</h4>
                        <p>${this.t('iph4sub')}</p>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">5</div>
                    <div class="step-content">
                        <h4>${this.t('iph5')}</h4>
                        <p class="step-warning">${this.t('iph5sub')}</p>
                        <div class="step-icon">🔥</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">6</div>
                    <div class="step-content">
                        <h4>${this.t('iph6')}</h4>
                        <p>${this.t('iph6sub')}</p>
                    </div>
                </div>
                <div class="ios-note">
                    📱 ${this.t('iphNote')}
                </div>
            `;
        }
    },
    
    addStyles() {
        // Remove old styles
        const oldStyle = document.getElementById('installModalStyles');
        if (oldStyle) oldStyle.remove();
        
        const style = document.createElement('style');
        style.id = 'installModalStyles';
        style.textContent = `
            #installModal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            #installModal .install-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(4px);
            }
            #installModal .install-content {
                position: relative;
                background: var(--card-bg-solid, #1a0505);
                border: 1px solid rgba(251, 191, 36, 0.3);
                border-radius: 20px;
                padding: 24px;
                max-width: 500px;
                width: 100%;
                max-height: 85vh;
                overflow-y: auto;
                color: var(--text-color, #fff);
            }
            #installModal .install-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            #installModal .install-header h2 {
                font-size: 22px;
                font-weight: 800;
                color: #f59e0b;
                margin: 0;
            }
            #installModal .lang-toggle {
                background: transparent;
                border: 1px solid rgba(251, 191, 36, 0.3);
                color: #f59e0b;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            #installModal .lang-toggle:hover {
                background: rgba(251, 191, 36, 0.1);
            }
            #installModal .install-subtitle {
                color: #94a3b8;
                margin-bottom: 16px;
            }
            #installModal .device-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
            }
            #installModal .device-tab {
                flex: 1;
                padding: 12px 8px;
                background: rgba(255,255,255,0.05);
                border: 2px solid transparent;
                border-radius: 12px;
                color: #94a3b8;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            #installModal .device-tab.active {
                background: rgba(251, 191, 36, 0.15);
                border-color: #f59e0b;
                color: #f59e0b;
            }
            #installModal .steps-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            #installModal .step-item {
                display: flex;
                gap: 12px;
                padding: 14px;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.08);
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
                font-size: 14px;
                flex-shrink: 0;
            }
            #installModal .step-content h4 {
                font-size: 15px;
                font-weight: 700;
                margin: 0 0 4px 0;
                color: var(--text-color, #fff);
            }
            #installModal .step-content p {
                font-size: 13px;
                color: #94a3b8;
                margin: 0;
            }
            #installModal .step-highlight {
                display: inline-block;
                background: rgba(251, 191, 36, 0.2);
                color: #fcd34d;
                padding: 4px 10px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 13px;
                margin-top: 8px;
            }
            #installModal .step-icon {
                font-size: 28px;
                margin-top: 8px;
            }
            #installModal .step-warning {
                color: #f87171;
                font-weight: 600;
            }
            #installModal .install-done {
                text-align: center;
                padding: 20px;
                margin-top: 16px;
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 12px;
            }
            #installModal .done-icon {
                font-size: 40px;
            }
            #installModal .install-done h3 {
                color: #4ade80;
                margin: 8px 0 4px;
                font-size: 18px;
            }
            #installModal .install-done p {
                color: #94a3b8;
                font-size: 14px;
                margin: 0;
            }
            #installModal .close-btn {
                width: 100%;
                padding: 14px;
                margin-top: 16px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                border-radius: 12px;
                color: #1a0505;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
            }
            #installModal .close-btn:hover {
                transform: translateY(-1px);
            }
            #installModal .ios-note {
                background: rgba(234, 179, 8, 0.15);
                border: 1px solid rgba(234, 179, 8, 0.3);
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                color: #fcd34d;
                font-size: 13px;
                margin-top: 12px;
            }
        `;
        
        document.head.appendChild(style);
    },
    
    setDevice(device) {
        this.currentDevice = device;
        this.render();
    },
    
    toggleLang() {
        this.currentLang = this.currentLang === 'en' ? 'tl' : 'en';
        this.render();
    },
    
    close() {
        const modal = document.getElementById('installModal');
        if (modal) modal.remove();
        const style = document.getElementById('installModalStyles');
        if (style) style.remove();
    },
    
    // Check URL on page load
    checkUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('install')) {
            setTimeout(() => this.show(), 300);
        }
    }
};

// Auto-check URL when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => InstallModal.checkUrl());
} else {
    InstallModal.checkUrl();
}
