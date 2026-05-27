package com.lovedate.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Solid brand-colored system bars with white icons.
        // Note: edge-to-edge is forced by Capacitor 8 regardless of decor-fits flag,
        // so safe-area handling is done in CSS via env(safe-area-inset-*).
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(Color.parseColor("#141937"));
        getWindow().setNavigationBarColor(Color.parseColor("#141937"));

        WindowInsetsControllerCompat ctrl = WindowCompat.getInsetsController(
            getWindow(), getWindow().getDecorView()
        );
        ctrl.setAppearanceLightStatusBars(false);
        ctrl.setAppearanceLightNavigationBars(false);

        // ── getUserMedia camera fix (2026-05-27) ───────────────────────
        // Capacitor 8's BridgeWebChromeClient.onPermissionRequest re-launches
        // the Android runtime-permission request on every getUserMedia call
        // and only grants the WebView's camera/mic resource once that
        // launcher's ActivityResult callback fires. On some Samsung devices
        // that callback does NOT fire when the permission is already granted,
        // leaving the WebView convinced camera is denied — getUserMedia then
        // rejects with NotAllowedError, so selfie verification (and any
        // in-WebView camera use) can never open the camera.
        //
        // We already declare + hold CAMERA at runtime, and the WebView only
        // ever loads our own bundled app + the trusted Jitsi call iframe, so
        // it is safe to grant media-capture requests directly on the UI
        // thread, bypassing the broken launcher. Everything else
        // (file chooser, JS dialogs, console) still routes through the
        // BridgeWebChromeClient superclass.
        BridgeWebChromeClient chromeClient = new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    try {
                        request.grant(request.getResources());
                    } catch (Exception ignored) {
                        // If granting fails for any reason, leave the request
                        // unhandled rather than crash; the JS side surfaces a
                        // friendly "enable camera" fallback.
                    }
                });
            }
        };
        getBridge().getWebView().setWebChromeClient(chromeClient);
    }
}
