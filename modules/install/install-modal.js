/**
 * Go Mission - Install Instructions Modal (Step-by-Step Wizard)
 * Shows ONE step at a time with large visuals
 */

const InstallModal = {
    currentDevice: null,
    currentStep: 0,
    currentLang: 'en',
    isInstalled: false,
    
    steps: {
        android: [
            { key: 'and1', icon: '⋮', iconSize: '80px' },
            { key: 'and2', icon: '➕', iconSize: '60px' },
            { key: 'and3', icon: '✓', iconSize: '60px' },
            { key: 'and4', icon: '🔥', iconSize: '80px' },
            { key: 'and5', icon: '🔔', iconSize: '80px' }
        ],
        iphone: [
            { key: 'iph1', icon: 'share', iconSize: '80px' },
            { key: 'iph2', icon: '➕', iconSize: '60px' },
            { key: 'iph3', icon: '✓', iconSize: '60px' },
            { key: 'iph4', icon: '🔥', iconSize: '80px' },
            { key: 'iph5', icon: '🔔', iconSize: '80px' }
        ],
        windows: [
            { key: 'win1', icon: '⊕', iconSize: '80px' },
            { key: 'win2', icon: '✓', iconSize: '60px' },
            { key: 'win3', icon: '🔥', iconSize: '80px' },
            { key: 'win4', icon: '🔔', iconSize: '80px' }
        ]
    },
    
    translations: {
        en: {
            chooseDevice: 'Choose your device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            next: 'Next',
            back: 'Back',
            done: 'Done! Open App',
            skip: 'Skip for now',
            step: 'Step',
            of: 'of',
            langToggle: '🇵🇭 Tagalog',
            
            // Android steps
            and1_title: 'Tap the menu button',
            and1_desc: 'Look for the 3 dots at the top right corner of Chrome',
            and2_title: 'Tap "Add to Home Screen"',
            and2_desc: 'Or "Install App" if you see it in the menu',
            and3_title: 'Tap "Install" or "Add"',
            and3_desc: 'Confirm to add the app to your home screen',
            and4_title: 'Open from Home Screen',
            and4_desc: 'Find the Go Mission icon and tap it to open',
            and5_title: 'Enable Notifications',
            and5_desc: 'Tap "Enable" to receive updates from your group',
            
            // iPhone steps  
            iph1_title: 'Tap the Share button',
            iph1_desc: 'Look for this icon at the bottom of Safari',
            iph2_title: 'Tap "Add to Home Screen"',
            iph2_desc: 'Scroll down in the menu to find it',
            iph3_title: 'Tap "Add"',
            iph3_desc: 'Located at the top right corner',
            iph4_title: 'Open from Home Screen',
            iph4_desc: 'Find the Go Mission icon and tap it to open',
            iph5_title: 'Enable Notifications',
            iph5_desc: 'Tap "Enable" to receive updates from your group',
            
            // Windows steps
            win1_title: 'Click the Install icon',
            win1_desc: 'Look for this icon in the address bar (right side)',
            win2_title: 'Click "Install"',
            win2_desc: 'Confirm the installation popup',
            win3_title: 'Open the App',
            win3_desc: 'Find Go Mission in your apps or desktop',
            win4_title: 'Enable Notifications',
            win4_desc: 'Click "Enable" to receive updates from your group'
        },
        tl: {
            chooseDevice: 'Piliin ang iyong device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            next: 'Susunod',
            back: 'Bumalik',
            done: 'Tapos na! Buksan',
            skip: 'Laktawan muna',
            step: 'Hakbang',
            of: 'ng',
            langToggle: '🇺🇸 English',
            
            // Android steps
            and1_title: 'Pindutin ang menu button',
            and1_desc: 'Hanapin ang 3 tuldok sa itaas na kanan ng Chrome',
            and2_title: 'Pindutin "Add to Home Screen"',
            and2_desc: 'O "Install App" kung nakikita mo',
            and3_title: 'Pindutin "Install" o "Add"',
            and3_desc: 'Kumpirmahin para idagdag sa home screen',
            and4_title: 'Buksan mula sa Home Screen',
            and4_desc: 'Hanapin ang Go Mission icon at pindutin',
            and5_title: 'I-enable ang Notifications',
            and5_desc: 'Pindutin "Enable" para makatanggap ng updates',
            
            // iPhone steps
            iph1_title: 'Pindutin ang Share button',
            iph1_desc: 'Hanapin ang icon na ito sa ibaba ng Safari',
            iph2_title: 'Pindutin "Add to Home Screen"',
            iph2_desc: 'Mag-scroll pababa sa menu para makita',
            iph3_title: 'Pindutin "Add"',
            iph3_desc: 'Nasa itaas na kanang bahagi',
            iph4_title: 'Buksan mula sa Home Screen',
            iph4_desc: 'Hanapin ang Go Mission icon at pindutin',
            iph5_title: 'I-enable ang Notifications',
            iph5_desc: 'Pindutin "Enable" para makatanggap ng updates',
            
            // Windows steps
            win1_title: 'I-click ang Install icon',
            win1_desc: 'Hanapin ang icon na ito sa address bar (kanan)',
            win2_title: 'I-click "Install"',
            win2_desc: 'Kumpirmahin ang installation popup',
            win3_title: 'Buksan ang App',
            win3_desc: 'Hanapin ang Go Mission sa apps o desktop',
            win4_title: 'I-enable ang Notifications',
            win4_desc: 'I-click "Enable" para makatanggap ng updates'
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
    
    init() {
        this.isInstalled = this.checkIfInstalled();
        const params = new URLSearchParams(window.location.search);
        const forceInstall = params.has('install');
        const hasSkipped = localStorage.getItem('installSkipped') === 'true';
        
        if (forceInstall || (!this.isInstalled && !hasSkipped)) {
            setTimeout(() => this.show(), 500);
        }
        
        if (forceInstall) {
            const url = new URL(window.location);
            url.searchParams.delete('install');
            window.history.replaceState({}, '', url);
        }
    },
    
    show() {
        this.currentDevice = null;
        this.currentStep = 0;
        this.render();
    },
    
    render() {
        const existing = document.getElementById('installModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'installModal';
        
        if (!this.currentDevice) {
            modal.innerHTML = this.renderDeviceSelection();
        } else {
            modal.innerHTML = this.renderStep();
        }
        
        this.addStyles();
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    },
    
    renderDeviceSelection() {
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        
        let detected = '';
        if (isIOS) detected = 'iphone';
        else if (isAndroid) detected = 'android';
        else detected = 'windows';
        
        return `
            <div class="install-overlay"></div>
            <div class="install-content">
                <div class="install-header">
                    <h2>📱 Install Go Mission</h2>
                    <button class="lang-toggle" onclick="InstallModal.toggleLang()">${this.t('langToggle')}</button>
                </div>
                
                <p class="install-subtitle">${this.t('chooseDevice')}</p>
                
                <div class="device-buttons">
                    <button class="device-btn ${detected === 'windows' ? 'detected' : ''}" onclick="InstallModal.selectDevice('windows')">
                        <span class="device-icon">💻</span>
                        <span class="device-name">${this.t('windows')}</span>
                    </button>
                    <button class="device-btn ${detected === 'android' ? 'detected' : ''}" onclick="InstallModal.selectDevice('android')">
                        <span class="device-icon">🤖</span>
                        <span class="device-name">${this.t('android')}</span>
                    </button>
                    <button class="device-btn ${detected === 'iphone' ? 'detected' : ''}" onclick="InstallModal.selectDevice('iphone')">
                        <span class="device-icon">🍎</span>
                        <span class="device-name">${this.t('iphone')}</span>
                    </button>
                </div>
                
                <button class="skip-btn" onclick="InstallModal.skip()">
                    ${this.t('skip')}
                </button>
            </div>
        `;
    },
    
    renderStep() {
        const deviceSteps = this.steps[this.currentDevice];
        const step = deviceSteps[this.currentStep];
        const totalSteps = deviceSteps.length;
        const isLastStep = this.currentStep === totalSteps - 1;
        
        const title = this.t(step.key + '_title');
        const desc = this.t(step.key + '_desc');
        
        let iconHtml = '';
        if (step.icon === 'share') {
            // iOS Share icon SVG
            iconHtml = `
                <svg class="share-icon" viewBox="0 0 50 50" width="80" height="80">
                    <rect x="5" y="20" width="40" height="28" rx="5" fill="none" stroke="#007AFF" stroke-width="3"/>
                    <line x1="25" y1="5" x2="25" y2="32" stroke="#007AFF" stroke-width="3" stroke-linecap="round"/>
                    <polyline points="15,15 25,5 35,15" fill="none" stroke="#007AFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        } else if (step.icon === '🔥') {
            // Go Mission logo
            iconHtml = `
                <div class="app-icon-preview">
                    <svg viewBox="0 0 512 512" width="100" height="100">
                        <rect width="512" height="512" rx="96" fill="#8B4513"/>
                        <text x="256" y="320" text-anchor="middle" font-size="280" font-weight="bold" fill="#f59e0b">G</text>
                    </svg>
                    <span class="app-name">Go Mission</span>
                </div>
            `;
        } else {
            iconHtml = `<span class="step-icon-large" style="font-size: ${step.iconSize}">${step.icon}</span>`;
        }
        
        return `
            <div class="install-overlay"></div>
            <div class="install-content step-view">
                <div class="step-header">
                    <button class="back-btn" onclick="InstallModal.prevStep()">← ${this.t('back')}</button>
                    <span class="step-counter">${this.t('step')} ${this.currentStep + 1} ${this.t('of')} ${totalSteps}</span>
                    <button class="lang-toggle-small" onclick="InstallModal.toggleLang()">${this.currentLang === 'en' ? '🇵🇭' : '🇺🇸'}</button>
                </div>
                
                <div class="step-progress">
                    ${Array.from({length: totalSteps}, (_, i) => `
                        <div class="progress-dot ${i <= this.currentStep ? 'active' : ''}"></div>
                    `).join('')}
                </div>
                
                <div class="step-visual">
                    ${iconHtml}
                </div>
                
                <h2 class="step-title">${title}</h2>
                <p class="step-desc">${desc}</p>
                
                <div class="step-actions">
                    ${isLastStep ? `
                        <button class="primary-btn" onclick="InstallModal.complete()">
                            🎉 ${this.t('done')}
                        </button>
                    ` : `
                        <button class="primary-btn" onclick="InstallModal.nextStep()">
                            ${this.t('next')} →
                        </button>
                    `}
                </div>
            </div>
        `;
    },
    
    selectDevice(device) {
        this.currentDevice = device;
        this.currentStep = 0;
        this.render();
    },
    
    nextStep() {
        const deviceSteps = this.steps[this.currentDevice];
        if (this.currentStep < deviceSteps.length - 1) {
            this.currentStep++;
            this.render();
        }
    },
    
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.render();
        } else {
            this.currentDevice = null;
            this.render();
        }
    },
    
    complete() {
        window.location.reload();
    },
    
    skip() {
        localStorage.setItem('installSkipped', 'true');
        this.close();
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
                padding: 16px;
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
                max-width: 400px;
                width: 100%;
                color: #fff;
                text-align: center;
            }
            #installModal .install-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            #installModal .install-header h2 {
                font-size: 20px;
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
            }
            #installModal .install-subtitle {
                color: #94a3b8;
                margin-bottom: 24px;
                font-size: 16px;
            }
            #installModal .device-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 24px;
            }
            #installModal .device-btn {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 20px;
                background: rgba(255,255,255,0.05);
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                color: #fff;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.2s;
            }
            #installModal .device-btn.detected {
                border-color: #f59e0b;
                background: rgba(251, 191, 36, 0.1);
            }
            #installModal .device-btn:hover {
                border-color: #f59e0b;
                background: rgba(251, 191, 36, 0.15);
            }
            #installModal .device-icon {
                font-size: 32px;
            }
            #installModal .device-name {
                font-weight: 600;
            }
            #installModal .skip-btn {
                background: transparent;
                border: none;
                color: #64748b;
                font-size: 14px;
                cursor: pointer;
                padding: 12px;
            }
            
            /* Step View */
            #installModal .step-view {
                padding: 20px;
            }
            #installModal .step-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
            }
            #installModal .back-btn {
                background: transparent;
                border: none;
                color: #f59e0b;
                font-size: 14px;
                cursor: pointer;
                padding: 8px;
            }
            #installModal .step-counter {
                color: #94a3b8;
                font-size: 14px;
            }
            #installModal .lang-toggle-small {
                background: transparent;
                border: none;
                font-size: 20px;
                cursor: pointer;
                padding: 4px;
            }
            #installModal .step-progress {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 32px;
            }
            #installModal .progress-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                transition: all 0.3s;
            }
            #installModal .progress-dot.active {
                background: #f59e0b;
            }
            #installModal .step-visual {
                height: 140px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 24px;
            }
            #installModal .step-icon-large {
                display: block;
                color: #f59e0b;
            }
            #installModal .share-icon {
                filter: drop-shadow(0 0 10px rgba(0, 122, 255, 0.3));
            }
            #installModal .app-icon-preview {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            #installModal .app-icon-preview svg {
                border-radius: 22px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            #installModal .app-name {
                color: #94a3b8;
                font-size: 14px;
            }
            #installModal .step-title {
                font-size: 24px;
                font-weight: 800;
                color: #fff;
                margin: 0 0 12px 0;
            }
            #installModal .step-desc {
                color: #94a3b8;
                font-size: 16px;
                line-height: 1.5;
                margin: 0 0 32px 0;
            }
            #installModal .step-actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            #installModal .primary-btn {
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                border-radius: 14px;
                color: #1a0505;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s;
            }
            #installModal .primary-btn:active {
                transform: scale(0.98);
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
