package app.gomission.mobile;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import android.webkit.WebView;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String PENDING_NATIVE_PUSH_STORAGE_KEY = "goMission.pendingNativePushAction";
    private static final String PUSH_INTENT_HANDLED_FLAG = "_goMissionPushIntentHandled";

    private static final String INSTALL_GUARD_SCRIPT = String.join("\n",
        "(function() {",
        "  window.GO_MISSION_ENABLE_INSTALL_MODAL = false;",
        "  window.GoMissionRuntime = Object.assign({}, window.GoMissionRuntime || {}, { isNativeApp: true, platform: 'android' });",
        "  try { localStorage.setItem('goMission_nativePlatform', 'android'); } catch (e) {}",
        "",
        "  function removeInstallUi() {",
        "    ['installModal','installWelcomeModal','installWelcomeModalStyles'].forEach(function(id) {",
        "      var node = document.getElementById(id);",
        "      if (node && node.remove) node.remove();",
        "    });",
        "    document.querySelectorAll && document.querySelectorAll('#installModal, #installWelcomeModal').forEach(function(node) {",
        "      if (node && node.remove) node.remove();",
        "    });",
        "    if (document.body) {",
        "      document.body.style.overflow = '';",
        "    }",
        "  }",
        "",
        "  function injectHideStyle() {",
        "    if (document.getElementById('goMissionInstallGuardStyle')) return;",
        "    var style = document.createElement('style');",
        "    style.id = 'goMissionInstallGuardStyle';",
        "    style.textContent = '#installModal,#installWelcomeModal{display:none!important;visibility:hidden!important;pointer-events:none!important;}';",
        "    document.head && document.head.appendChild(style);",
        "  }",
        "",
        "  function neutralizeInstallModal() {",
        "    var modal = window.InstallModal;",
        "    if (!modal) return;",
        "    modal.init = function() { removeInstallUi(); };",
        "    modal.show = function() { removeInstallUi(); };",
        "    modal.showWelcome = function() { removeInstallUi(); };",
        "    modal.close = function() { removeInstallUi(); };",
        "    modal.closeWelcome = function() { removeInstallUi(); };",
        "  }",
        "",
        "  function patchGroupMeeting() {",
        "    var meeting = window.GroupMeeting;",
        "    if (!meeting || typeof meeting.joinMeeting !== 'function' || meeting.__goMissionNativePatched) return;",
        "    var originalJoinMeeting = meeting.joinMeeting.bind(meeting);",
        "    meeting.joinMeeting = async function() {",
        "      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {",
        "        var probes = [",
        "          { audio: true, video: false },",
        "          { audio: false, video: true }",
        "        ];",
        "        for (var i = 0; i < probes.length; i += 1) {",
        "          try {",
        "            var stream = await navigator.mediaDevices.getUserMedia(probes[i]);",
        "            if (stream && typeof stream.getTracks === 'function') {",
        "              stream.getTracks().forEach(function(track) { track.stop(); });",
        "            }",
        "          } catch (err) {",
        "            console.warn('[GoMissionAndroidApp] Media permission probe failed', err);",
        "          }",
        "        }",
        "      }",
        "      return originalJoinMeeting.apply(this, arguments);",
        "    };",
        "    meeting.__goMissionNativePatched = true;",
        "  }",
        "",
        "  function patchNativePush() {",
        "    var cap = window.Capacitor || window.capacitor || null;",
        "    var plugin = cap && cap.Plugins ? cap.Plugins.PushNotifications : null;",
        "    if (!plugin) return;",
        "",
        "    var state = window.__goMissionNativePushState || (window.__goMissionNativePushState = {",
        "      token: '',",
        "      permissionStatus: 'prompt',",
        "      listenersBound: false,",
        "      channelReady: false,",
        "      lifecycleBound: false,",
        "      bootstrapped: false",
        "    });",
        "",
        "    function syncPushObjectState() {",
        "      var push = window.PushNotifications;",
        "      if (!push || typeof push !== 'object') return;",
        "      push.isSupported = true;",
        "      push.nativePlugin = plugin;",
        "      push.permissionStatus = state.permissionStatus || push.permissionStatus || 'prompt';",
        "      if (state.token) push.token = state.token;",
        "    }",
        "",
        "    function rememberPendingToken(token) {",
        "      try {",
        "        localStorage.setItem('goMission.pendingPushToken', String(token || '').trim());",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Could not persist pending push token', error);",
        "      }",
        "    }",
        "",
        "    function clearPendingToken() {",
        "      try {",
        "        localStorage.removeItem('goMission.pendingPushToken');",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Could not clear pending push token', error);",
        "      }",
        "    }",
        "",
        "    function readPendingToken() {",
        "      try {",
        "        return String(localStorage.getItem('goMission.pendingPushToken') || '').trim();",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Could not read pending push token', error);",
        "        return '';",
        "      }",
        "    }",
        "",
        "    async function registerTokenWithBackend(token) {",
        "      var normalizedToken = String(token || '').trim();",
        "      if (!normalizedToken) return false;",
        "",
        "      var push = window.PushNotifications;",
        "      if (push && typeof push.registerTokenWithBackend === 'function' && !push.__goMissionNativeRuntimePatched) {",
        "        try {",
        "          return await push.registerTokenWithBackend(normalizedToken);",
        "        } catch (error) {",
        "          console.warn('[GoMissionAndroidApp] Existing registerTokenWithBackend failed', error);",
        "        }",
        "      }",
        "",
        "      if (!window.currentUser || !window.db) {",
        "        rememberPendingToken(normalizedToken);",
        "        return false;",
        "      }",
        "",
        "      try {",
        "        if (window.httpsCallable && window.functions) {",
        "          var callable = window.httpsCallable(window.functions, 'registerToken');",
        "          await callable({ token: normalizedToken });",
        "          clearPendingToken();",
        "          return true;",
        "        }",
        "",
        "        if (window.doc && window.setDoc && window.arrayUnion) {",
        "          var userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);",
        "          await window.setDoc(userRef, {",
        "            fcmTokens: window.arrayUnion(normalizedToken),",
        "            lastTokenUpdate: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),",
        "            lastTokenUpdateIso: new Date().toISOString(),",
        "            notificationPermission: state.permissionStatus || 'granted'",
        "          }, { merge: true });",
        "          clearPendingToken();",
        "          return true;",
        "        }",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Native token registration failed', error);",
        "      }",
        "",
        "      rememberPendingToken(normalizedToken);",
        "      return false;",
        "    }",
        "",
        "    async function unregisterTokenWithBackend(token) {",
        "      var normalizedToken = String(token || '').trim();",
        "      if (!normalizedToken || !window.currentUser || !window.db) return false;",
        "      try {",
        "        if (window.httpsCallable && window.functions) {",
        "          var callable = window.httpsCallable(window.functions, 'unregisterToken');",
        "          await callable({ token: normalizedToken });",
        "          return true;",
        "        }",
        "        if (window.doc && window.setDoc && window.arrayRemove) {",
        "          var userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);",
        "          await window.setDoc(userRef, {",
        "            fcmTokens: window.arrayRemove(normalizedToken),",
        "            lastTokenUpdate: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),",
        "            lastTokenUpdateIso: new Date().toISOString()",
        "          }, { merge: true });",
        "          return true;",
        "        }",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Native token unregister failed', error);",
        "      }",
        "      return false;",
        "    }",
        "",
        "    async function flushPendingTokenRegistration() {",
        "      var token = state.token || readPendingToken();",
        "      if (!token || !window.currentUser) return false;",
        "      return registerTokenWithBackend(token);",
        "    }",
        "",
        "    async function clearServerBadge() {",
        "      try {",
        "        if (window.currentUser && window.httpsCallable && window.functions) {",
        "          var clearBadgeFn = window.httpsCallable(window.functions, 'clearBadge');",
        "          await clearBadgeFn();",
        "        }",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Could not clear server badge', error);",
        "      }",
        "    }",
        "",
        "    function normalizeNotificationData(data, title, body) {",
        "      var normalized = (data && typeof data === 'object') ? Object.assign({}, data) : {};",
        "      if (title && !normalized.notificationTitle) normalized.notificationTitle = String(title);",
        "      if (body && !normalized.notificationBody) normalized.notificationBody = String(body);",
        "      return normalized;",
        "    }",
        "",
        "    function buildNotificationAction(data, title, body) {",
        "      var type = String((data && data.type) || '').trim();",
        "      if ((type === 'chat' || type === 'chat_mention') && data.groupId) {",
        "        return { kind: 'group', groupId: String(data.groupId), messageId: data.messageId ? String(data.messageId) : '' };",
        "      }",
        "      if ((type === 'dm' || type === 'direct_message' || type === 'friend_request_accepted') && (data.senderId || data.fromId || data.friendId)) {",
        "        return {",
        "          kind: 'dm',",
        "          senderId: String(data.senderId || data.fromId || data.friendId),",
        "          threadId: data.threadId ? String(data.threadId) : '',",
        "          messageId: data.messageId ? String(data.messageId) : ''",
        "        };",
        "      }",
        "      if (type === 'friend_request') return { kind: 'friend_requests' };",
        "      if (data.url) return { kind: 'url', url: String(data.url) };",
        "      if (type === 'announcement' || data.announcementId) {",
        "        return {",
        "          kind: 'announcement',",
        "          announcementId: data.announcementId ? String(data.announcementId) : '',",
        "          title: String(title || data.notificationTitle || 'Go Mission Update'),",
        "          body: String(body || data.notificationBody || 'You have a new announcement.')",
        "        };",
        "      }",
        "      if (type === 'devotion') return { kind: 'devotion' };",
        "      return { kind: 'general' };",
        "    }",
        "",
        "    function routeNotificationAction(payload) {",
        "      var notification = payload && typeof payload.notification === 'object' ? payload.notification : payload;",
        "      var title = String((notification && notification.title) || '').trim();",
        "      var body = String((notification && notification.body) || '').trim();",
        "      var data = normalizeNotificationData(notification && notification.data, title, body);",
        "      var action = buildNotificationAction(data, title, body);",
        "",
        "      if (typeof Notifications !== 'undefined' && typeof Notifications.openNotificationAction === 'function') {",
        "        Notifications.openNotificationAction(action);",
        "        return true;",
        "      }",
        "",
        "      try {",
        "        var url = new URL(window.location.href);",
        "        url.search = '';",
        "        if (action.kind === 'group' && action.groupId) {",
        "          url.searchParams.set('openChat', action.groupId);",
        "          if (action.messageId) url.searchParams.set('openChatMessage', action.messageId);",
        "        } else if (action.kind === 'dm' && action.senderId) {",
        "          url.searchParams.set('openMessages', 'direct');",
        "          url.searchParams.set('openDmWith', action.senderId);",
        "        } else if (action.kind === 'announcement') {",
        "          url.searchParams.set('openAnnouncement', '1');",
        "          url.searchParams.set('openMessages', 'groups');",
        "          if (action.announcementId) url.searchParams.set('announcementId', action.announcementId);",
        "          if (action.title) url.searchParams.set('announcementTitle', action.title);",
        "          if (action.body) url.searchParams.set('announcementBody', action.body);",
        "        } else if (action.kind === 'devotion') {",
        "          url.searchParams.set('openDevotion', 'true');",
        "        } else if (action.kind === 'url' && action.url) {",
        "          window.location.assign(action.url);",
        "          return true;",
        "        } else {",
        "          return false;",
        "        }",
        "        window.location.assign(url.toString());",
        "        return true;",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Could not route native notification action', error);",
        "        return false;",
        "      }",
        "    }",
        "",
        "    function readPendingNativeAction() {",
        "      try {",
        "        var raw = localStorage.getItem('goMission.pendingNativePushAction');",
        "        if (!raw) return null;",
        "        return JSON.parse(raw);",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Could not read pending native push action', error);",
        "        return null;",
        "      }",
        "    }",
        "",
        "    function clearPendingNativeAction() {",
        "      try {",
        "        localStorage.removeItem('goMission.pendingNativePushAction');",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Could not clear pending native push action', error);",
        "      }",
        "    }",
        "",
        "    function consumePendingNativeAction() {",
        "      var pending = readPendingNativeAction();",
        "      if (!pending || typeof pending !== 'object') return false;",
        "      var ts = Number(pending.ts || 0);",
        "      if (ts > 0 && (Date.now() - ts) > (15 * 60 * 1000)) {",
        "        clearPendingNativeAction();",
        "        return false;",
        "      }",
        "      var handled = routeNotificationAction(pending);",
        "      if (handled) clearPendingNativeAction();",
        "      return handled;",
        "    }",
        "",
        "    function shouldSkipForeground(data) {",
        "      if ((data && (data.type === 'chat' || data.type === 'chat_mention')) && data.groupId) {",
        "        if (typeof GroupChat !== 'undefined' && GroupChat.isOpen) {",
        "          var currentGroupId = GroupChat.currentGroupId || (typeof Groups !== 'undefined' && Groups.currentGroup ? Groups.currentGroup.id : '');",
        "          if (currentGroupId === data.groupId) return true;",
        "        }",
        "      }",
        "      if (data && data.type === 'dm' && data.threadId) {",
        "        if (typeof ChatApp !== 'undefined' && ChatApp.activeDmThreadId === data.threadId) {",
        "          return true;",
        "        }",
        "      }",
        "      return false;",
        "    }",
        "",
        "    function handleNativeForegroundNotification(notification) {",
        "      var title = String((notification && notification.title) || 'Go Mission').trim() || 'Go Mission';",
        "      var body = String((notification && notification.body) || '').trim();",
        "      var data = normalizeNotificationData(notification && notification.data, title, body);",
        "      if (shouldSkipForeground(data)) return;",
        "",
        "      if (typeof Notifications !== 'undefined' && typeof Notifications.recordNotification === 'function') {",
        "        Notifications.recordNotification({",
        "          title: title,",
        "          body: body,",
        "          type: data.type || 'general',",
        "          data: data",
        "        });",
        "        if (typeof Notifications.showToast === 'function') {",
        "          Notifications.showToast({",
        "            title: title,",
        "            body: body || 'Open the app to view more.',",
        "            onClick: function() {",
        "              routeNotificationAction({ notification: { title: title, body: body, data: data } });",
        "            }",
        "          });",
        "        }",
        "        return;",
        "      }",
        "",
        "      var push = window.PushNotifications;",
        "      if (push && typeof push.showToast === 'function') {",
        "        push.showToast(title, body || 'Open the app to view more.');",
        "      }",
        "    }",
        "",
        "    function ensureNotificationListeners() {",
        "      if (state.listenersBound) return;",
        "      state.listenersBound = true;",
        "",
        "      plugin.addListener('registration', function(token) {",
        "        state.token = String((token && token.value) || '').trim();",
        "        state.permissionStatus = 'granted';",
        "        syncPushObjectState();",
        "        if (state.token) {",
        "          registerTokenWithBackend(state.token);",
        "        }",
        "      });",
        "",
        "      plugin.addListener('registrationError', function(error) {",
        "        console.error('[GoMissionAndroidApp] Native push registration error', error);",
        "      });",
        "",
        "      plugin.addListener('pushNotificationReceived', function(notification) {",
        "        handleNativeForegroundNotification(notification || {});",
        "      });",
        "",
        "      plugin.addListener('pushNotificationActionPerformed', function(actionPerformed) {",
        "        try {",
        "          localStorage.setItem('goMission.pendingNativePushAction', JSON.stringify(Object.assign({}, actionPerformed || {}, { ts: Date.now() })));",
        "        } catch (error) {",
        "          console.warn('[GoMissionAndroidApp] Could not persist native notification action', error);",
        "        }",
        "        consumePendingNativeAction();",
        "      });",
        "    }",
        "",
        "    function ensureNotificationChannel() {",
        "      if (state.channelReady || typeof plugin.createChannel !== 'function') return;",
        "      state.channelReady = true;",
        "      plugin.createChannel({",
        "        id: 'default',",
        "        name: 'Go Mission',",
        "        description: 'Messages, announcements, and ministry activity',",
        "        importance: 4,",
        "        visibility: 1,",
        "        vibration: true,",
        "        lights: true,",
        "        lightColor: '#f59e0b'",
        "      }).catch(function(error) {",
        "        console.warn('[GoMissionAndroidApp] Could not create Android notification channel', error);",
        "      });",
        "    }",
        "",
        "    async function syncNativePermissionAndToken(autoRequest, reason) {",
        "      try {",
        "        var permission = await plugin.checkPermissions();",
        "        if (permission && permission.receive === 'prompt' && autoRequest && typeof plugin.requestPermissions === 'function') {",
        "          permission = await plugin.requestPermissions();",
        "        }",
        "        state.permissionStatus = permission && permission.receive ? permission.receive : 'prompt';",
        "        syncPushObjectState();",
        "        if (state.permissionStatus !== 'granted') {",
        "          return false;",
        "        }",
        "        await plugin.register();",
        "        await flushPendingTokenRegistration();",
        "        return true;",
        "      } catch (error) {",
        "        console.warn('[GoMissionAndroidApp] Native permission/token sync failed (' + reason + ')', error);",
        "        return false;",
        "      }",
        "    }",
        "",
        "    function patchPushNotificationsObject() {",
        "      var push = window.PushNotifications;",
        "      if (!push || typeof push !== 'object') return;",
        "      syncPushObjectState();",
        "      if (push.__goMissionNativeRuntimePatched) return;",
        "",
        "      push.__goMissionNativeRuntimePatched = true;",
        "      push.init = function() {",
        "        syncPushObjectState();",
        "        return syncNativePermissionAndToken(true, 'patched_init');",
        "      };",
        "      push.requestPermission = function() {",
        "        return syncNativePermissionAndToken(true, 'patched_request_permission');",
        "      };",
        "      push.syncPermissionAndToken = function(reason) {",
        "        return syncNativePermissionAndToken(false, reason || 'patched_sync');",
        "      };",
        "      push.getToken = function() {",
        "        return Promise.resolve(state.token || readPendingToken() || null);",
        "      };",
        "      push.clearBadge = async function() {",
        "        try {",
        "          if (typeof plugin.removeAllDeliveredNotifications === 'function') {",
        "            await plugin.removeAllDeliveredNotifications();",
        "          }",
        "        } catch (error) {",
        "          console.warn('[GoMissionAndroidApp] Could not clear native notifications', error);",
        "        }",
        "        await clearServerBadge();",
        "        return true;",
        "      };",
        "      push.unregisterToken = async function() {",
        "        var activeToken = state.token || readPendingToken();",
        "        try {",
        "          if (typeof plugin.unregister === 'function') {",
        "            await plugin.unregister();",
        "          }",
        "        } catch (error) {",
        "          console.warn('[GoMissionAndroidApp] Could not unregister native push plugin', error);",
        "        }",
        "        if (activeToken) {",
        "          await unregisterTokenWithBackend(activeToken);",
        "        }",
        "        state.token = '';",
        "        clearPendingToken();",
        "        syncPushObjectState();",
        "      };",
        "      push.shouldShowPrompt = function() {",
        "        return !!push.isSupported && state.permissionStatus === 'prompt';",
        "      };",
        "    }",
        "",
        "    if (!state.lifecycleBound) {",
        "      state.lifecycleBound = true;",
        "      window.addEventListener('focus', function() {",
        "        syncNativePermissionAndToken(false, 'window_focus');",
        "        flushPendingTokenRegistration();",
        "        consumePendingNativeAction();",
        "      });",
        "      window.addEventListener('online', function() {",
        "        flushPendingTokenRegistration();",
        "      });",
        "      document.addEventListener('visibilitychange', function() {",
        "        if (document.hidden) return;",
        "        flushPendingTokenRegistration();",
        "        consumePendingNativeAction();",
        "      });",
        "    }",
        "",
        "    ensureNotificationListeners();",
        "    ensureNotificationChannel();",
        "    patchPushNotificationsObject();",
        "    syncPushObjectState();",
        "",
        "    if (!state.bootstrapped) {",
        "      state.bootstrapped = true;",
        "      syncNativePermissionAndToken(true, 'bootstrap');",
        "      setTimeout(function() {",
        "        flushPendingTokenRegistration();",
        "        consumePendingNativeAction();",
        "      }, 700);",
        "    } else {",
        "      flushPendingTokenRegistration();",
        "      consumePendingNativeAction();",
        "    }",
        "  }",
        "",
        "  injectHideStyle();",
        "  removeInstallUi();",
        "  neutralizeInstallModal();",
        "  patchGroupMeeting();",
        "  patchNativePush();",
        "",
        "  if (!window.__goMissionInstallGuardInterval) {",
        "    window.__goMissionInstallGuardInterval = setInterval(function() {",
        "      injectHideStyle();",
        "      removeInstallUi();",
        "      neutralizeInstallModal();",
        "      patchGroupMeeting();",
        "      patchNativePush();",
        "    }, 250);",
        "  }",
        "",
        "  if (!window.__goMissionInstallGuardObserver && window.MutationObserver && document.documentElement) {",
        "    window.__goMissionInstallGuardObserver = new MutationObserver(function() {",
        "      injectHideStyle();",
        "      removeInstallUi();",
        "      neutralizeInstallModal();",
        "      patchGroupMeeting();",
        "      patchNativePush();",
        "    });",
        "    window.__goMissionInstallGuardObserver.observe(document.documentElement, { childList: true, subtree: true });",
        "  }",
        "})();"
    );

    private final WebViewListener installGuardListener = new WebViewListener() {
        @Override
        public void onPageStarted(WebView webView) {
            injectInstallGuard(webView);
        }

        @Override
        public void onPageLoaded(WebView webView) {
            injectInstallGuard(webView);
        }
    };

    @Override
    protected void load() {
        bridgeBuilder.addWebViewListener(installGuardListener);
        super.load();
        if (getBridge() != null) {
            WebView webView = getBridge().getWebView();
            injectInstallGuard(webView);
            syncNotificationIntent(webView, getIntent());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null) {
            WebView webView = getBridge().getWebView();
            injectInstallGuard(webView);
            syncNotificationIntent(webView, getIntent());
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (getBridge() != null) {
            WebView webView = getBridge().getWebView();
            injectInstallGuard(webView);
            syncNotificationIntent(webView, intent);
        }
    }

    private void injectInstallGuard(WebView webView) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(INSTALL_GUARD_SCRIPT, null));
    }

    private void syncNotificationIntent(WebView webView, Intent intent) {
        if (webView == null || intent == null) return;
        if (intent.getBooleanExtra(PUSH_INTENT_HANDLED_FLAG, false)) return;

        Bundle extras = intent.getExtras();
        if (extras == null || extras.isEmpty()) return;

        JSONObject payload = new JSONObject();
        boolean hasRelevantPushData = false;

        for (String key : extras.keySet()) {
            if (PUSH_INTENT_HANDLED_FLAG.equals(key)) continue;
            Object rawValue = extras.get(key);
            if (rawValue == null) continue;

            String value = String.valueOf(rawValue);
            try {
                payload.put(key, value);
            } catch (Exception ignored) {
                continue;
            }

            if (isRelevantPushKey(key, value)) {
                hasRelevantPushData = true;
            }
        }

        if (!hasRelevantPushData) return;

        intent.putExtra(PUSH_INTENT_HANDLED_FLAG, true);

        String script =
            "(function() {" +
            "  try {" +
            "    var payload = " + payload.toString() + ";" +
            "    var entry = {" +
            "      notification: {" +
            "        title: String(payload.notificationTitle || payload.title || '')," +
            "        body: String(payload.notificationBody || payload.body || '')," +
            "        data: payload" +
            "      }," +
            "      ts: Date.now()" +
            "    };" +
            "    localStorage.setItem(" + JSONObject.quote(PENDING_NATIVE_PUSH_STORAGE_KEY) + ", JSON.stringify(entry));" +
            "  } catch (e) {" +
            "    console.warn('[GoMissionAndroidApp] Failed to stash native push intent', e);" +
            "  }" +
            "})();";

        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private boolean isRelevantPushKey(String key, String value) {
        if (value == null || value.trim().isEmpty()) return false;
        switch (key) {
            case "type":
            case "groupId":
            case "messageId":
            case "senderId":
            case "threadId":
            case "announcementId":
            case "notificationTitle":
            case "notificationBody":
            case "url":
                return true;
            default:
                return key.startsWith("google.") || key.startsWith("gcm.");
        }
    }
}
