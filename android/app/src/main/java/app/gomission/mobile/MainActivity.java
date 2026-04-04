package app.gomission.mobile;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {

    private static final String INSTALL_GUARD_SCRIPT =
        "(function() {" +
        "  window.GO_MISSION_ENABLE_INSTALL_MODAL = false;" +
        "  try { localStorage.setItem('goMission_nativePlatform', 'android'); } catch (e) {}" +
        "  function removeInstallUi() {" +
        "    ['installModal','installWelcomeModal','installWelcomeModalStyles'].forEach(function(id) {" +
        "      var node = document.getElementById(id);" +
        "      if (node && node.remove) node.remove();" +
        "    });" +
        "    document.querySelectorAll && document.querySelectorAll('#installModal, #installWelcomeModal').forEach(function(node) {" +
        "      if (node && node.remove) node.remove();" +
        "    });" +
        "    if (document.body) {" +
        "      document.body.style.overflow = '';" +
        "    }" +
        "  }" +
        "  function injectHideStyle() {" +
        "    if (document.getElementById('goMissionInstallGuardStyle')) return;" +
        "    var style = document.createElement('style');" +
        "    style.id = 'goMissionInstallGuardStyle';" +
        "    style.textContent = '#installModal,#installWelcomeModal{display:none!important;visibility:hidden!important;pointer-events:none!important;}';" +
        "    document.head && document.head.appendChild(style);" +
        "  }" +
        "  function neutralizeInstallModal() {" +
        "    var modal = window.InstallModal;" +
        "    if (!modal) return;" +
        "    modal.init = function() { removeInstallUi(); };" +
        "    modal.show = function() { removeInstallUi(); };" +
        "    modal.showWelcome = function() { removeInstallUi(); };" +
        "    modal.close = function() { removeInstallUi(); };" +
        "    modal.closeWelcome = function() { removeInstallUi(); };" +
        "  }" +
        "  function patchGroupMeeting() {" +
        "    var meeting = window.GroupMeeting;" +
        "    if (!meeting || typeof meeting.joinMeeting !== 'function' || meeting.__goMissionNativePatched) return;" +
        "    var originalJoinMeeting = meeting.joinMeeting.bind(meeting);" +
        "    meeting.joinMeeting = async function() {" +
        "      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {" +
        "        var probes = [" +
        "          { audio: true, video: false }," +
        "          { audio: false, video: true }" +
        "        ];" +
        "        for (var i = 0; i < probes.length; i += 1) {" +
        "          try {" +
        "            var stream = await navigator.mediaDevices.getUserMedia(probes[i]);" +
        "            if (stream && typeof stream.getTracks === 'function') {" +
        "              stream.getTracks().forEach(function(track) { track.stop(); });" +
        "            }" +
        "          } catch (err) {" +
        "            console.warn('[GoMissionAndroidApp] Media permission probe failed', err);" +
        "          }" +
        "        }" +
        "      }" +
        "      return originalJoinMeeting.apply(this, arguments);" +
        "    };" +
        "    meeting.__goMissionNativePatched = true;" +
        "  }" +
        "  injectHideStyle();" +
        "  removeInstallUi();" +
        "  neutralizeInstallModal();" +
        "  patchGroupMeeting();" +
        "  if (!window.__goMissionInstallGuardInterval) {" +
        "    window.__goMissionInstallGuardInterval = setInterval(function() {" +
        "      injectHideStyle();" +
        "      removeInstallUi();" +
        "      neutralizeInstallModal();" +
        "      patchGroupMeeting();" +
        "    }, 250);" +
        "  }" +
        "  if (!window.__goMissionInstallGuardObserver && window.MutationObserver && document.documentElement) {" +
        "    window.__goMissionInstallGuardObserver = new MutationObserver(function() {" +
        "      injectHideStyle();" +
        "      removeInstallUi();" +
        "      neutralizeInstallModal();" +
        "      patchGroupMeeting();" +
        "    });" +
        "    window.__goMissionInstallGuardObserver.observe(document.documentElement, { childList: true, subtree: true });" +
        "  }" +
        "})();";

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
            injectInstallGuard(getBridge().getWebView());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null) {
            injectInstallGuard(getBridge().getWebView());
        }
    }

    private void injectInstallGuard(WebView webView) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(INSTALL_GUARD_SCRIPT, null));
    }
}
