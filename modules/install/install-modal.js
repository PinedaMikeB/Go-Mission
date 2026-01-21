/**
 * Go Mission - Install Instructions Modal
 * Shows step-by-step install instructions and LOCKS the app until installed
 * 
 * The modal checks if the app is running as a PWA (installed).
 * If not installed, it shows the modal and prevents using the app.
 */

const InstallModal = {
    currentDevice: 'android',
    currentLang: 'en',
    isInstalled: false,
    
    translations: {
        en: {
            title: 'Install Go Mission',
            subtitle: 'Choose your device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            step: 'Step',
            done: 'Done!',
            doneMsg: 'After installing, open the app from your home screen to continue.',
            refresh: 'I\'ve Installed - Open App',
            skip: 'Continue in Browser',
            skipNote: '(Notifications may not work)',
            langToggle: '🇵🇭 Tagalog',
            // Windows steps
            win1: 'Look for the install icon',
            win1sub: 'In the address bar (right side), click this icon:',
            win2: 'Click "Install"',
            win2sub: 'A popup will appear, click Install',
            win3: 'Open from desktop',
            win3sub: 'The app icon will appear on your desktop or taskbar',
            win4: 'Enable notifications',
            win4sub: 'Click "Enable" when the prompt appears',
            // Android steps
            and1: 'Tap the menu',
            and1sub: 'Tap the 3 dots at the top right corner',
            and2: 'Tap "Add to Home Screen"',
            and2sub: 'Or "Install App" if you see it',
            and3: 'Tap "Install"',
            and3sub: 'The app will be added to your home screen',
            and4: 'Open from home screen',
            and4sub: 'Find the Go Mission icon and tap it',
            and5: 'Enable notifications',
            and5sub: 'Tap "Enable" when prompted',
            // iPhone steps
            iph1: 'Tap the Share button',
            iph1sub: 'The square icon with arrow at the bottom',
            iph2: 'Scroll down and tap "Add to Home Screen"',
            iph2sub: 'You may need to scroll to find it',
            iph3: 'Tap "Add"',
            iph3sub: 'Located at the top right',
            iph4: 'Open from Home Screen',
            iph4sub: 'Important: Don\'t use Safari! Use the app icon',
            iph5: 'Enable notifications',
            iph5sub: 'Tap "Enable" when prompted',
            iphNote: 'Requires iOS 16.4 or newer for notifications',
            safariNote: 'You must use Safari browser to install on iPhone'
        },
        tl: {
            title: 'I-install ang Go Mission',
            subtitle: 'Piliin ang iyong device:',
            windows: 'Windows / Mac',
            android: 'Android',
            iphone: 'iPhone',
            step: 'Hakbang',
            done: 'Tapos na!',
            doneMsg: 'Pagkatapos mag-install, buksan ang app mula sa home screen.',
            refresh: 'Naka-install na - Buksan',
            skip: 'Magpatuloy sa Browser',
            skipNote: '(Maaaring hindi gumana ang notifications)',
            langToggle: '🇺🇸 English',
            // Windows steps
            win1: 'Hanapin ang install icon',
            win1sub: 'Sa address bar (kanang bahagi), i-click ito:',
            win2: 'I-click ang "Install"',
            win2sub: 'May lalabas na popup, i-click ang Install',
            win3: 'Buksan mula sa desktop',
            win3sub: 'Lalabas ang app icon sa desktop o taskbar',
            win4: 'I-enable ang notifications',
            win4sub: 'I-click ang "Enable" kapag lumabas ang prompt',
            // Android steps
            and1: 'Pindutin ang menu',
            and1sub: 'Pindutin ang 3 tuldok sa itaas na kanan',
            and2: 'Pindutin ang "Add to Home Screen"',
            and2sub: 'O "Install App" kung nakikita mo',
            and3: 'Pindutin ang "Install"',
            and3sub: 'Madadagdag ang app sa home screen mo',
            and4: 'Buksan mula sa home screen',
            and4sub: 'Hanapin ang Go Mission icon at pindutin',
            and5: 'I-enable ang notifications',
            and5sub: 'Pindutin ang "Enable" kapag lumabas',
            // iPhone steps
            iph1: 'Pindutin ang Share button',
            iph1sub: 'Yung icon na box na may arrow sa ibaba',
            iph2: 'Mag-scroll pababa at pindutin "Add to Home Screen"',
            iph2sub: 'Maaaring kailangang mag-scroll para makita',
            iph3: 'Pindutin ang "Add"',
            iph3sub: 'Nasa itaas na kanan',
            iph4: 'Buksan mula sa Home Screen',
            iph4sub: 'Importante: Huwag gamitin ang Safari! Gamitin ang app icon',
            iph5: 'I-enable ang notifications',
            iph5sub: 'Pindutin ang "Enable" kapag lumabas',
            iphNote: 'Kailangan iOS 16.4 o mas bago para sa notifications',
            safariNote: 'Kailangan Safari browser para mag-install sa iPhone'
        }
    },
    
    t(key) {
        return this.translations[this.currentLang][key] || key;
    },
    
    /**
     * Check if app is installed as PWA
     */
    checkIfInstalled() {
        // Check display-mode
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return true;
        }
        // iOS Safari standalone
        if (window.navigator.standalone === true) {
            return true;
        }
        // Check if launched from home screen (Android)
        if (document.referrer.includes('android-app://')) {
            return true;
        }
        return false;
    },
    
    /**
     * Initialize - check if should show install modal
     */
    init() {
        this.isInstalled = this.checkIfInstalled();
        
        // Check URL params
        const params = new URLSearchParams(window.location.search);
        const forceInstall = params.has('install');
        
        // Check if user has skipped before (stored in localStorage)
        const hasSkipped = localStorage.getItem('installSkipped') === 'true';
        
        // Show modal if: has ?install param OR (not installed AND not skipped)
        if (forceInstall || (!this.isInstalled && !hasSkipped)) {
            // Wait for page to load
            setTimeout(() => this.show(), 500);
        }
        
        // Remove ?install from URL
        if (forceInstall) {
            const url = new URL(window.location);
            url.searchParams.delete('install');
            window.history.replaceState({}, '', url);
        }
    },
    
    /**
     * Show the install modal
     */
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
        
        this.addStyles();
        document.body.appendChild(modal);
        
        // Prevent scrolling on body
        document.body.style.overflow = 'hidden';
    },
    
    getModalHTML() {
        const showSafariWarning = this.currentDevice === 'iphone' && !/Safari/i.test(navigator.userAgent);
        
        return `
            <div class="install-overlay"></div>
            <div class="install-content">
                <div class="install-header">
                    <h2>📱 ${this.t('title')}</h2>
                    <button class="lang-toggle" onclick="InstallModal.toggleLang()">${this.t('langToggle')}</button>
                </div>
                
                ${showSafariWarning ? `
                    <div class="safari-warning">
                        ⚠️ ${this.t('safariNote')}
                    </div>
                ` : ''}
                
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
                
                <button class="primary-btn" onclick="InstallModal.refresh()">
                    ${this.t('refresh')}
                </button>
                
                <button class="skip-btn" onclick="InstallModal.skip()">
                    ${this.t('skip')}<br>
                    <span class="skip-note">${this.t('skipNote')}</span>
                </button>
            </div>
        `;
    },
    
    renderSteps() {
        if (this.currentDevice === 'windows') {
            return `
                <div class="step-item">
                    <div class="step-num">1</div>
                    <div class="step-content">
                        <h4>${this.t('win1')}</h4>
                        <p>${this.t('win1sub')}</p>
                        <div class="step-icon">⊕</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">2</div>
                    <div class="step-content">
                        <h4>${this.t('win2')}</h4>
                        <p>${this.t('win2sub')}</p>
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
                        <div class="step-icon">⋮</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">2</div>
                    <div class="step-content">
                        <h4>${this.t('and2')}</h4>
                        <p>${this.t('and2sub')}</p>
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
                        <p>${this.t('iph1sub')}</p>
                        <div class="step-icon">📤</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">2</div>
                    <div class="step-content">
                        <h4>${this.t('iph2')}</h4>
                        <p>${this.t('iph2sub')}</p>
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
                        <p class="step-warning">${this.t('iph4sub')}</p>
                        <div class="step-icon">🔥</div>
                    </div>
                </div>
                <div class="step-item">
                    <div class="step-num">5</div>
                    <div class="step-content">
                        <h4>${this.t('iph5')}</h4>
                        <p>${this.t('iph5sub')}</p>
                    </div>
                </div>
                <div class="ios-note">
                    📱 ${this.t('iphNote')}
                </div>
            `;
        }
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
                border-radius: 20px;
                padding: 24px;
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                color: #fff;
            }
            #installModal .install-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
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
            }
            #installModal .safari-warning {
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.5);
                color: #fca5a5;
                padding: 12px;
                border-radius: 10px;
                margin-bottom: 16px;
                font-size: 14px;
                text-align: center;
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
                color: #fff;
            }
            #installModal .step-content p {
                font-size: 13px;
                color: #94a3b8;
                margin: 0;
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
            #installModal .primary-btn {
                width: 100%;
                padding: 16px;
                margin-top: 16px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                border-radius: 12px;
                color: #1a0505;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
            }
            #installModal .skip-btn {
                width: 100%;
                padding: 12px;
                margin-top: 12px;
                background: transparent;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: #64748b;
                font-size: 14px;
                cursor: pointer;
            }
            #installModal .skip-note {
                font-size: 11px;
                color: #475569;
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
    
    /**
     * User clicked "I've Installed" - refresh to check
     */
    refresh() {
        window.location.reload();
    },
    
    /**
     * User clicked "Skip" - allow using in browser
     */
    skip() {
        localStorage.setItem('installSkipped', 'true');
        this.close();
    },
    
    close() {
        const modal = document.getElementById('installModal');
        if (modal) modal.remove();
        const style = document.getElementById('installModalStyles');
        if (style) style.remove();
        document.body.style.overflow = '';
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => InstallModal.init());
} else {
    InstallModal.init();
}
