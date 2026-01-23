/**
 * Go Mission - PWA Silent Auto-Update Handler
 * 
 * SILENT UPDATE FLOW:
 * 1. Checks for updates every 5 minutes (silent)
 * 2. When update found → downloads new SW in background
 * 3. When user leaves app (blur/hidden) → activates new SW + clears cache
 * 4. When user returns → app is already updated (seamless!)
 * 
 * NO PROMPTS - Updates happen automatically when user isn't looking
 * 
 * To push update:
 * 1. Change CACHE_VERSION in firebase-messaging-sw.js
 * 2. Deploy to Netlify
 * 3. Users get silent update on next app blur/exit
 */

const PWAUpdater = {
    registration: null,
    updateReady: false,
    newWorker: null,
    isUpdating: false,
    
    /**
     * Initialize PWA and register service worker
     */
    async init() {
        console.log('[PWA] Initializing silent auto-updater...');
        
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
                console.log('[PWA] Found waiting SW on load - update ready');
                this.updateReady = true;
                this.newWorker = this.registration.waiting;
            }
            
            // Listen for new service worker installing
            this.registration.addEventListener('updatefound', () => {
                console.log('[PWA] Update found - new SW installing');
                const installingWorker = this.registration.installing;
                
                installingWorker.addEventListener('statechange', () => {
                    console.log('[PWA] New SW state:', installingWorker.state);
                    
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // New SW installed, existing one is active
                            console.log('[PWA] ✓ Update downloaded - will apply when user leaves app');
                            this.updateReady = true;
                            this.newWorker = installingWorker;
                        } else {
                            // First install, no need to update
                            console.log('[PWA] First install complete');
                        }
                    }
                });
            });
            
            // Listen for SW taking control (after skipWaiting)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (this.isUpdating) {
                    console.log('[PWA] Controller changed - reloading...');
                    window.location.reload();
                }
            });
            
            // Check for updates every 5 minutes
            setInterval(() => this.checkForUpdates(), 5 * 60 * 1000);
            
            // SILENT UPDATE: Apply update when user leaves/hides app
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && this.updateReady) {
                    console.log('[PWA] User left app - applying silent update');
                    this.applySilentUpdate();
                } else if (document.visibilityState === 'visible') {
                    // Check for updates when user returns
                    this.checkForUpdates();
                }
            });
            
            // Also handle page unload/beforeunload for mobile PWA
            window.addEventListener('pagehide', () => {
                if (this.updateReady) {
                    console.log('[PWA] Page hiding - applying silent update');
                    this.applySilentUpdate();
                }
            });
            
            // Handle blur event (user switches apps on mobile)
            window.addEventListener('blur', () => {
                if (this.updateReady) {
                    console.log('[PWA] Window blur - applying silent update');
                    this.applySilentUpdate();
                }
            });
            
            console.log('[PWA] Silent auto-updater ready');
            
        } catch (error) {
            console.error('[PWA] Registration failed:', error);
        }
    },
    
    /**
     * Check for service worker updates (silent)
     */
    async checkForUpdates() {
        if (!this.registration) return;
        
        try {
            await this.registration.update();
            console.log('[PWA] Checked for updates');
            
            // Check if there's a waiting worker after update check
            if (this.registration.waiting) {
                console.log('[PWA] Found waiting SW after update check');
                this.updateReady = true;
                this.newWorker = this.registration.waiting;
            }
        } catch (error) {
            console.log('[PWA] Update check failed:', error.message);
        }
    },
    
    /**
     * Apply update silently (no UI, happens in background)
     */
    async applySilentUpdate() {
        if (this.isUpdating || !this.updateReady) return;
        this.isUpdating = true;
        
        console.log('[PWA] Applying silent update...');
        
        try {
            // 1. Clear all caches first
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('[PWA] Clearing', cacheNames.length, 'caches');
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // 2. Tell waiting SW to skip waiting and take over
            if (this.newWorker) {
                this.newWorker.postMessage({ type: 'SKIP_WAITING' });
            } else if (this.registration?.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Note: controllerchange event will trigger reload
            console.log('[PWA] Silent update applied - will reload on next focus');
            
        } catch (error) {
            console.error('[PWA] Silent update error:', error);
            this.isUpdating = false;
        }
    },
    
    /**
     * Manual force refresh (for debugging/settings)
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
     * Get current version info (for settings/debug screen)
     */
    async getVersion() {
        if (!this.registration?.active) return 'Unknown';
        
        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
                resolve(event.data?.version || 'Unknown');
            };
            this.registration.active.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
            
            // Timeout fallback
            setTimeout(() => resolve('Unknown'), 1000);
        });
    },
    
    /**
     * Check if update is pending (for UI indicators)
     */
    isUpdatePending() {
        return this.updateReady;
    },
    
    /**
     * Debug: Manually trigger update check and apply
     */
    async debugUpdate() {
        console.log('[PWA Debug] Checking for updates...');
        await this.checkForUpdates();
        
        if (this.updateReady) {
            console.log('[PWA Debug] Update ready - applying now');
            this.isUpdating = true;
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            if (this.newWorker) {
                this.newWorker.postMessage({ type: 'SKIP_WAITING' });
            } else if (this.registration?.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        } else {
            console.log('[PWA Debug] No update available');
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWAUpdater.init());
} else {
    PWAUpdater.init();
}
