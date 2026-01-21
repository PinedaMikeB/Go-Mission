/**
 * Go Mission - PWA Update Handler
 * Handles service worker registration and auto-updates
 */

const PWAUpdater = {
    registration: null,
    updateAvailable: false,
    
    /**
     * Initialize PWA and register service worker
     */
    async init() {
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service workers not supported');
            return;
        }
        
        try {
            // Register service worker
            this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[PWA] Service worker registered:', this.registration.scope);
            
            // Check for updates immediately
            this.checkForUpdates();
            
            // Check for updates every 5 minutes
            setInterval(() => this.checkForUpdates(), 5 * 60 * 1000);
            
            // Listen for new service worker
            this.registration.addEventListener('updatefound', () => {
                console.log('[PWA] Update found!');
                const newWorker = this.registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[PWA] New version ready');
                        this.updateAvailable = true;
                        this.showUpdateNotification();
                    }
                });
            });
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_UPDATED') {
                    console.log('[PWA] Service worker updated to:', event.data.version);
                    // Reload to get new content
                    window.location.reload();
                }
            });
            
            // Handle controller change (when new SW takes over)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[PWA] Controller changed, reloading...');
                window.location.reload();
            });
            
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
        } catch (error) {
            console.log('[PWA] Update check failed:', error);
        }
    },
    
    /**
     * Show update notification to user
     */
    showUpdateNotification() {
        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'pwaUpdateNotification';
        notification.innerHTML = `
            <div class="pwa-update-content">
                <span class="pwa-update-icon">🔄</span>
                <div class="pwa-update-text">
                    <strong>Update Available</strong>
                    <p>A new version is ready</p>
                </div>
                <button class="pwa-update-btn" onclick="PWAUpdater.applyUpdate()">
                    Update Now
                </button>
                <button class="pwa-update-close" onclick="PWAUpdater.dismissUpdate()">✕</button>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #pwaUpdateNotification {
                position: fixed;
                bottom: 80px;
                left: 16px;
                right: 16px;
                z-index: 99998;
                animation: slideUp 0.3s ease-out;
            }
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .pwa-update-content {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
                border: 1px solid rgba(59, 130, 246, 0.5);
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            .pwa-update-icon {
                font-size: 28px;
            }
            .pwa-update-text {
                flex: 1;
            }
            .pwa-update-text strong {
                color: #fff;
                font-size: 14px;
                display: block;
            }
            .pwa-update-text p {
                color: #94a3b8;
                font-size: 12px;
                margin: 2px 0 0 0;
            }
            .pwa-update-btn {
                padding: 8px 16px;
                background: #3b82f6;
                border: none;
                border-radius: 8px;
                color: #fff;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }
            .pwa-update-close {
                background: transparent;
                border: none;
                color: #64748b;
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(notification);
    },
    
    /**
     * Apply the update (reload with new version)
     */
    applyUpdate() {
        if (this.registration && this.registration.waiting) {
            // Tell the waiting service worker to skip waiting
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            // Just reload
            window.location.reload();
        }
    },
    
    /**
     * Dismiss update notification
     */
    dismissUpdate() {
        const notification = document.getElementById('pwaUpdateNotification');
        if (notification) {
            notification.style.animation = 'slideDown 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }
    },
    
    /**
     * Force refresh (clear cache and reload)
     */
    async forceRefresh() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[PWA] All caches cleared');
        }
        window.location.reload(true);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWAUpdater.init());
} else {
    PWAUpdater.init();
}
