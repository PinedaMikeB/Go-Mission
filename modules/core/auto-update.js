/**
 * Go Mission - Auto Update System
 * Ensures elderly users get updates automatically without any prompts
 * 
 * Features:
 * - Silent service worker updates
 * - Automatic updates when app is idle
 * - Force refresh on major updates
 * - No user interaction required
 * 
 * NOTE: Service worker registration is handled by push-notifications.js
 * This module focuses on update detection and activation
 */

const AutoUpdate = {
    // Current app version - increment on major updates
    VERSION: '2.0.0',
    VERSION_KEY: 'goMission_appVersion',
    registration: null,
    
    /**
     * Initialize auto-update system
     */
    init() {
        console.log('[AutoUpdate] Initializing v' + this.VERSION);
        
        // Check for version mismatch (force update)
        this.checkVersionMismatch();
        
        // Setup update listeners (SW is registered by push-notifications.js)
        this.setupServiceWorkerListeners();
        
        // Setup periodic update checks
        this.setupPeriodicChecks();
        
        // Setup visibility-based updates
        this.setupVisibilityUpdate();
        
        console.log('[AutoUpdate] Ready');
    },
    
    /**
     * Check if app version changed (requires hard refresh)
     */
    checkVersionMismatch() {
        const storedVersion = localStorage.getItem(this.VERSION_KEY);
        
        if (storedVersion && storedVersion !== this.VERSION) {
            console.log('[AutoUpdate] Version mismatch! Stored:', storedVersion, 'Current:', this.VERSION);
            // Clear old caches and reload
            this.forceUpdate();
        } else {
            localStorage.setItem(this.VERSION_KEY, this.VERSION);
            console.log('[AutoUpdate] Version OK:', this.VERSION);
        }
    },
    
    /**
     * Force clear caches and reload
     */
    async forceUpdate() {
        console.log('[AutoUpdate] Forcing update...');
        
        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(name => {
                        console.log('[AutoUpdate] Deleting cache:', name);
                        return caches.delete(name);
                    })
                );
            }
            
            // Update version before reload
            localStorage.setItem(this.VERSION_KEY, this.VERSION);
            
            // Hard reload
            console.log('[AutoUpdate] Reloading page...');
            window.location.reload(true);
            
        } catch (error) {
            console.error('[AutoUpdate] Force update error:', error);
            // Still try to reload
            window.location.reload(true);
        }
    },
    
    /**
     * Setup listeners for service worker updates
     */
    setupServiceWorkerListeners() {
        if (!('serviceWorker' in navigator)) {
            console.log('[AutoUpdate] Service workers not supported');
            return;
        }
        
        // Get existing registration when ready
        navigator.serviceWorker.ready.then((registration) => {
            this.registration = registration;
            console.log('[AutoUpdate] Got SW registration:', registration.scope);
            
            // Check for waiting worker
            if (registration.waiting) {
                console.log('[AutoUpdate] Found waiting SW - activating...');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Listen for new workers
            registration.addEventListener('updatefound', () => {
                console.log('[AutoUpdate] New SW found!');
                const newWorker = registration.installing;
                
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        console.log('[AutoUpdate] SW state:', newWorker.state);
                        
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New SW ready - activate it immediately (no prompt)
                            console.log('[AutoUpdate] New SW installed - activating silently...');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                }
            });
        }).catch(err => {
            console.log('[AutoUpdate] SW ready error:', err);
        });
        
        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[AutoUpdate] New SW controlling - refreshing for updates...');
            // Reload to get new content
            window.location.reload();
        });
    },
    
    /**
     * Setup periodic update checks (every 5 minutes)
     */
    setupPeriodicChecks() {
        setInterval(() => {
            this.checkForUpdates();
        }, 5 * 60 * 1000); // 5 minutes
        
        console.log('[AutoUpdate] Periodic checks enabled (every 5 min)');
    },
    
    /**
     * Check for updates when app becomes visible
     */
    setupVisibilityUpdate() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('[AutoUpdate] App visible - checking for updates...');
                this.checkForUpdates();
            }
        });
        
        // Also check on focus (mobile apps)
        window.addEventListener('focus', () => {
            this.checkForUpdates();
        });
        
        // Check on page show (back/forward navigation)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                console.log('[AutoUpdate] Page restored from cache - checking updates...');
                this.checkForUpdates();
            }
        });
        
        console.log('[AutoUpdate] Visibility-based updates enabled');
    },
    
    /**
     * Check for updates
     */
    async checkForUpdates() {
        if (!this.registration) {
            // Try to get registration
            if ('serviceWorker' in navigator) {
                try {
                    this.registration = await navigator.serviceWorker.ready;
                } catch (e) {
                    return;
                }
            }
        }
        
        if (this.registration) {
            try {
                await this.registration.update();
                
                // If there's a waiting worker, activate it
                if (this.registration.waiting) {
                    console.log('[AutoUpdate] Activating waiting SW...');
                    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            } catch (e) {
                // Update check failed (offline?) - ignore
            }
        }
    },
    
    /**
     * Get current version info (for debugging)
     */
    getVersionInfo() {
        return {
            app: this.VERSION,
            stored: localStorage.getItem(this.VERSION_KEY),
            hasSW: !!this.registration
        };
    }
};

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AutoUpdate.init());
} else {
    AutoUpdate.init();
}

window.AutoUpdate = AutoUpdate;
