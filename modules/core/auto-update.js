/**
 * Go Mission - Auto Update System
 * Ensures elderly users get updates automatically without any prompts
 * 
 * Features:
 * - Silent service worker registration
 * - Automatic updates when app is idle
 * - Force refresh on major updates
 * - No user interaction required
 */

const AutoUpdate = {
    // Current app version - increment on major updates
    VERSION: '2.0.0',
    VERSION_KEY: 'goMission_appVersion',
    
    /**
     * Initialize auto-update system
     */
    async init() {
        console.log('[AutoUpdate] Initializing v' + this.VERSION);
        
        // Check for version mismatch (force update)
        this.checkVersionMismatch();
        
        // Register service worker
        await this.registerServiceWorker();
        
        // Setup periodic update checks
        this.setupPeriodicChecks();
        
        // Setup visibility-based updates
        this.setupVisibilityUpdate();
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
            
            // Unregister old service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(reg => {
                        console.log('[AutoUpdate] Unregistering SW:', reg.scope);
                        return reg.unregister();
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
     * Register service worker with auto-update
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[AutoUpdate] Service workers not supported');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });
            
            console.log('[AutoUpdate] SW registered:', registration.scope);
            
            // Check for updates immediately
            registration.update();
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
                console.log('[AutoUpdate] New SW found!');
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    console.log('[AutoUpdate] SW state:', newWorker.state);
                    
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New SW ready - activate it immediately
                        console.log('[AutoUpdate] New SW installed - activating...');
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
            
            // Listen for controller change (new SW activated)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[AutoUpdate] New SW controlling - reloading for fresh content');
                // Soft reload to get new content
                window.location.reload();
            });
            
            // Store registration for later use
            this.registration = registration;
            
        } catch (error) {
            console.error('[AutoUpdate] SW registration failed:', error);
        }
    },
    
    /**
     * Setup periodic update checks (every 5 minutes)
     */
    setupPeriodicChecks() {
        // Check for updates every 5 minutes
        setInterval(() => {
            if (this.registration) {
                console.log('[AutoUpdate] Periodic update check...');
                this.registration.update();
            }
        }, 5 * 60 * 1000);
    },
    
    /**
     * Check for updates when app becomes visible
     */
    setupVisibilityUpdate() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('[AutoUpdate] App visible - checking for updates...');
                
                // Check SW updates
                if (this.registration) {
                    this.registration.update();
                }
                
                // If there's a waiting worker, activate it
                if (this.registration?.waiting) {
                    console.log('[AutoUpdate] Activating waiting SW...');
                    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            }
        });
        
        // Also check on focus
        window.addEventListener('focus', () => {
            if (this.registration) {
                this.registration.update();
            }
        });
    },
    
    /**
     * Manual update check (can be called from settings)
     */
    async checkForUpdates() {
        console.log('[AutoUpdate] Manual update check...');
        
        if (this.registration) {
            await this.registration.update();
            
            if (this.registration.waiting) {
                // Update available - apply it
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * Get current version info
     */
    getVersionInfo() {
        return {
            app: this.VERSION,
            stored: localStorage.getItem(this.VERSION_KEY),
            sw: this.registration?.active?.scriptURL || 'none'
        };
    }
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AutoUpdate.init());
} else {
    AutoUpdate.init();
}

window.AutoUpdate = AutoUpdate;
