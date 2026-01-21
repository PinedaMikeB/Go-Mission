/**
 * Go Mission - PWA Update Handler (Force Update Version)
 * 
 * FORCE UPDATE FLOW:
 * 1. Service worker detects new version
 * 2. Shows FULL SCREEN lock (can't dismiss!)
 * 3. User must click "Update Now"
 * 4. Clears all caches → hard reload
 * 
 * To push update:
 * 1. Change CACHE_VERSION in firebase-messaging-sw.js
 * 2. Deploy to Netlify
 * 3. Users see force update screen on next app open
 */

const PWAUpdater = {
    registration: null,
    updateAvailable: false,
    currentVersion: null,
    
    /**
     * Initialize PWA and register service worker
     */
    async init() {
        console.log('[PWA] Initializing...');
        
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service workers not supported');
            return;
        }
        
        try {
            // Register service worker
            this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[PWA] Service worker registered:', this.registration.scope);
            
            // Check for waiting SW immediately (update was downloaded in background)
            if (this.registration.waiting) {
                console.log('[PWA] Found waiting SW on load - update available');
                this.showForceUpdateScreen('New version ready');
                return;
            }
            
            // Listen for new service worker installing
            this.registration.addEventListener('updatefound', () => {
                console.log('[PWA] Update found - new SW installing');
                const newWorker = this.registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    console.log('[PWA] New SW state:', newWorker.state);
                    
                    // When new SW is installed and we have an existing controller
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[PWA] New version installed - showing force update');
                        this.showForceUpdateScreen('New version ready');
                    }
                });
            });
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('[PWA] Message from SW:', event.data);
                
                if (event.data?.type === 'SW_UPDATED') {
                    console.log('[PWA] SW_UPDATED received, version:', event.data.version);
                    this.showForceUpdateScreen(event.data.version);
                }
            });
            
            // Check for updates every 5 minutes
            setInterval(() => this.checkForUpdates(), 5 * 60 * 1000);
            
            // Also check on visibility change (when user comes back to app)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.checkForUpdates();
                }
            });
            
            console.log('[PWA] Ready');
            
        } catch (error) {
            console.error('[PWA] Registration failed:', error);
        }
    },
    
    /**
     * Check for service worker updates
     */
    async checkForUpdates() {
        if (!this.registration) return;
        
        try {
            await this.registration.update();
            console.log('[PWA] Checked for updates');
            
            // Check if there's a waiting worker after update check
            if (this.registration.waiting) {
                console.log('[PWA] Found waiting SW after update check');
                this.showForceUpdateScreen('New version available');
            }
        } catch (error) {
            console.log('[PWA] Update check failed:', error);
        }
    },
    
    /**
     * Show FORCE update screen (blocks entire app)
     */
    showForceUpdateScreen(version) {
        if (this.updateAvailable) return; // Already showing
        this.updateAvailable = true;
        
        // Remove any existing
        const existing = document.getElementById('pwaForceUpdate');
        if (existing) existing.remove();
        
        const versionDisplay = this.extractVersion(version);
        
        const screen = document.createElement('div');
        screen.id = 'pwaForceUpdate';
        screen.innerHTML = `
            <div class="force-update-overlay"></div>
            <div class="force-update-content">
                <div class="force-update-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                </div>
                
                <h2>Update Available</h2>
                <p class="force-update-subtitle">A new version of Go Mission is ready!</p>
                
                <div class="force-update-version">
                    <span class="label">New Version</span>
                    <span class="value">${versionDisplay}</span>
                </div>
                
                <p class="force-update-note">
                    Please update to get the latest features, bug fixes, and improvements.
                </p>
                
                <button class="force-update-btn" onclick="PWAUpdater.applyUpdate()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Update Now
                </button>
                
                <p class="force-update-footer">This will refresh the app</p>
            </div>
        `;
        
        this.addForceUpdateStyles();
        document.body.appendChild(screen);
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Extract version from cache name
     */
    extractVersion(version) {
        if (!version) return 'Latest';
        
        // go-mission-v1.0.3 → v1.0.3
        const match = version.match(/v[\d.]+/);
        return match ? match[0] : version;
    },
    
    /**
     * Apply the update
     */
    async applyUpdate() {
        const btn = document.querySelector('.force-update-btn');
        if (btn) {
            btn.innerHTML = `
                <svg class="btn-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                Updating...
            `;
            btn.disabled = true;
        }
        
        try {
            // 1. Tell waiting SW to skip waiting
            if (this.registration?.waiting) {
                console.log('[PWA] Telling waiting SW to skip waiting');
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // 2. Clear ALL caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('[PWA] Clearing', cacheNames.length, 'caches');
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // 3. Wait a moment for SW to take over
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 4. Hard reload (bypass cache)
            console.log('[PWA] Reloading...');
            window.location.reload(true);
            
        } catch (error) {
            console.error('[PWA] Update error:', error);
            // Force reload anyway
            window.location.reload(true);
        }
    },
    
    /**
     * Force refresh (manual trigger)
     */
    async forceRefresh() {
        console.log('[PWA] Force refresh triggered');
        
        // Unregister and re-register SW
        if (this.registration) {
            await this.registration.unregister();
            console.log('[PWA] SW unregistered');
        }
        
        // Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[PWA] All caches cleared');
        }
        
        // Clear localStorage cache flags
        localStorage.removeItem('lastSWVersion');
        
        // Hard reload
        window.location.reload(true);
    },
    
    /**
     * Add styles for force update screen
     */
    addForceUpdateStyles() {
        if (document.getElementById('forceUpdateStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'forceUpdateStyles';
        style.textContent = `
            #pwaForceUpdate {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .force-update-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
            }
            
            .force-update-content {
                position: relative;
                background: linear-gradient(135deg, #1a0505 0%, #2a0505 100%);
                border: 2px solid rgba(251, 191, 36, 0.3);
                border-radius: 24px;
                padding: 40px 32px;
                max-width: 380px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }
            
            .force-update-icon {
                width: 80px;
                height: 80px;
                margin: 0 auto 24px;
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.05) 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .force-update-icon svg {
                width: 40px;
                height: 40px;
                color: #f59e0b;
                animation: rotate 2s linear infinite;
            }
            
            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .force-update-content h2 {
                font-size: 28px;
                font-weight: 800;
                color: #f59e0b;
                margin: 0 0 8px 0;
            }
            
            .force-update-subtitle {
                color: #94a3b8;
                font-size: 16px;
                margin: 0 0 24px 0;
            }
            
            .force-update-version {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
            }
            
            .force-update-version .label {
                color: #64748b;
                font-size: 14px;
            }
            
            .force-update-version .value {
                color: #4ade80;
                font-weight: 700;
                font-size: 18px;
            }
            
            .force-update-note {
                color: #e2e8f0;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 24px 0;
            }
            
            .force-update-btn {
                width: 100%;
                padding: 18px 32px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                border-radius: 14px;
                color: #1a0505;
                font-size: 18px;
                font-weight: 800;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
            }
            
            .force-update-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 30px rgba(245, 158, 11, 0.4);
            }
            
            .force-update-btn:disabled {
                opacity: 0.7;
                cursor: wait;
                transform: none;
            }
            
            .force-update-btn .btn-icon {
                width: 24px;
                height: 24px;
            }
            
            .force-update-btn .btn-icon.spinning {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .force-update-footer {
                color: #64748b;
                font-size: 12px;
                margin: 16px 0 0 0;
            }
        `;
        
        document.head.appendChild(style);
    },
    
    /**
     * Debug: Test the force update screen
     */
    testForceUpdate() {
        this.updateAvailable = false;
        this.showForceUpdateScreen('go-mission-v9.9.9');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWAUpdater.init());
} else {
    PWAUpdater.init();
}
