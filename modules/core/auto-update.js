/**
 * Go Mission - Auto Update System
 * Ensures elderly users get updates automatically without any prompts
 * 
 * Features:
 * - Silent service worker updates
 * - Updates ONLY when app is opened (not during active use)
 * - No refresh while user is actively using the app
 * - Force refresh on major version mismatch at app open
 * 
 * NOTE: Service worker registration is handled by push-notifications.js
 * This module focuses on update detection and activation
 */

const AutoUpdate = {
    // Version is auto-generated from build timestamp - no manual changes needed!
    VERSION: BUILD_TIMESTAMP || Date.now().toString(),
    VERSION_KEY: 'goMission_appVersion',
    UPDATE_PENDING_KEY: 'goMission_updatePending',
    registration: null,
    updatePending: false,
    
    /**
     * Initialize auto-update system
     * Called when app opens - this is when we apply updates
     */
    init() {
        console.log('[AutoUpdate] Initializing v' + this.VERSION);
        
        // Check for version mismatch (force update on app open)
        this.checkVersionMismatch();
        
        // Check if there's a pending update from last session
        this.applyPendingUpdate();
        
        // Setup update listeners (SW is registered by push-notifications.js)
        this.setupServiceWorkerListeners();
        
        // Setup background update checks (no refresh during use)
        this.setupBackgroundChecks();
        
        console.log('[AutoUpdate] Ready - updates apply on next app open');
    },
    
    /**
     * Check if app version changed (requires hard refresh)
     * Only called at app initialization (app open)
     */
    checkVersionMismatch() {
        const storedVersion = localStorage.getItem(this.VERSION_KEY);
        
        if (storedVersion && storedVersion !== this.VERSION) {
            console.log('[AutoUpdate] Version mismatch! Stored:', storedVersion, 'Current:', this.VERSION);
            // Clear old caches and reload - this is at app open so it's safe
            this.forceUpdate();
        } else {
            localStorage.setItem(this.VERSION_KEY, this.VERSION);
            console.log('[AutoUpdate] Version OK:', this.VERSION);
        }
    },
    
    /**
     * Apply any pending update from previous session
     * Called at app open
     */
    applyPendingUpdate() {
        const pending = localStorage.getItem(this.UPDATE_PENDING_KEY);
        if (pending === 'true') {
            console.log('[AutoUpdate] Pending update found - applying now...');
            localStorage.removeItem(this.UPDATE_PENDING_KEY);
            
            // Activate waiting service worker if any
            if (this.registration?.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
    },
    
    /**
     * Force clear caches and reload
     * Only called at app initialization
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
            localStorage.removeItem(this.UPDATE_PENDING_KEY);
            
            // Hard reload
            console.log('[AutoUpdate] Reloading page...');
            window.location.reload(true);
            
        } catch (error) {
            console.error('[AutoUpdate] Force update error:', error);
            window.location.reload(true);
        }
    },
    
    /**
     * Setup listeners for service worker updates
     * Updates are detected but NOT applied until next app open
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
            
            // If there's a waiting worker at app open, activate it now
            if (registration.waiting) {
                console.log('[AutoUpdate] Found waiting SW at startup - activating...');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Listen for new workers (but don't auto-refresh during use)
            registration.addEventListener('updatefound', () => {
                console.log('[AutoUpdate] New SW found!');
                const newWorker = registration.installing;
                
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        console.log('[AutoUpdate] SW state:', newWorker.state);
                        
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New SW ready - mark as pending, don't refresh now
                            console.log('[AutoUpdate] New SW installed - will apply on next app open');
                            this.updatePending = true;
                            localStorage.setItem(this.UPDATE_PENDING_KEY, 'true');
                            // DO NOT call skipWaiting or reload here - user is active
                        }
                    });
                }
            });
        }).catch(err => {
            console.log('[AutoUpdate] SW ready error:', err);
        });
        
        // Listen for controller change - only reload if this is app initialization
        let isInitialLoad = true;
        setTimeout(() => { isInitialLoad = false; }, 5000); // 5 second grace period
        
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (isInitialLoad) {
                console.log('[AutoUpdate] New SW controlling at startup - refreshing...');
                window.location.reload();
            } else {
                console.log('[AutoUpdate] New SW controlling - will refresh on next app open');
                localStorage.setItem(this.UPDATE_PENDING_KEY, 'true');
            }
        });
    },
    
    /**
     * Setup background update checks
     * Checks for updates but NEVER refreshes during active use
     */
    setupBackgroundChecks() {
        // Check for updates when app becomes visible (returning to app)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('[AutoUpdate] App visible - checking for updates...');
                this.checkForUpdatesOnly();
                
                // If there's a pending update and user just opened app, apply it
                if (this.updatePending || localStorage.getItem(this.UPDATE_PENDING_KEY) === 'true') {
                    console.log('[AutoUpdate] Applying pending update on app return...');
                    localStorage.removeItem(this.UPDATE_PENDING_KEY);
                    this.updatePending = false;
                    
                    if (this.registration?.waiting) {
                        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        // This will trigger controllerchange and reload
                    }
                }
            }
        });
        
        // Check on page show (opening app from background)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                console.log('[AutoUpdate] App restored from cache - checking updates...');
                this.checkForUpdatesOnly();
                
                // Apply pending update
                if (this.updatePending || localStorage.getItem(this.UPDATE_PENDING_KEY) === 'true') {
                    console.log('[AutoUpdate] Applying pending update...');
                    localStorage.removeItem(this.UPDATE_PENDING_KEY);
                    this.updatePending = false;
                    
                    if (this.registration?.waiting) {
                        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
            }
        });
        
        // Periodic background check (every 10 minutes) - just check, don't apply
        setInterval(() => {
            this.checkForUpdatesOnly();
        }, 10 * 60 * 1000); // 10 minutes
        
        console.log('[AutoUpdate] Background checks enabled');
    },
    
    /**
     * Check for updates only (no refresh)
     * Just downloads new SW, doesn't activate it
     */
    async checkForUpdatesOnly() {
        if (!this.registration) {
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
                console.log('[AutoUpdate] Update check complete');
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
            hasSW: !!this.registration,
            updatePending: this.updatePending || localStorage.getItem(this.UPDATE_PENDING_KEY) === 'true'
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
