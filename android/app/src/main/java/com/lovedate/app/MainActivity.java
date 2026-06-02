package com.lovedate.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    // Custom request code for the in-context mic/camera runtime prompt raised by
    // a WebView getUserMedia call. High + app-specific so it can't collide with
    // Capacitor plugin permission callbacks.
    private static final int MEDIA_PERMISSION_REQUEST_CODE = 0xCA11;

    // The WebView media request awaiting the Android runtime-permission result.
    private PermissionRequest pendingMediaRequest;

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

        // ── getUserMedia camera/mic permission bridge ──────────────────────
        // When the WebView calls getUserMedia (selfie verification, voice notes,
        // P2P calls) it raises onPermissionRequest. Granting the WebView's web
        // resource only works if the APP already holds the matching Android
        // runtime permission (RECORD_AUDIO / CAMERA) — which a FRESH install
        // does NOT. So we handle both cases explicitly:
        //   • permission already held → grant the web resource directly on the
        //     UI thread. (Capacitor 8's default client has a Samsung bug where
        //     its launcher's result callback never fires when the permission is
        //     already granted, leaving the WebView convinced it's denied — this
        //     sidesteps that.)
        //   • permission missing → raise the real Android runtime prompt in
        //     context (first call / first recording) and grant or deny the web
        //     resource from the result. This is what makes real users — whether
        //     they install the APK directly or from Google Play — actually get
        //     ASKED for the microphone the first time they place a call.
        BridgeWebChromeClient chromeClient = new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                final List<String> needed = new ArrayList<>();
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        needed.add(Manifest.permission.RECORD_AUDIO);
                    } else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        needed.add(Manifest.permission.CAMERA);
                    }
                }

                final List<String> missing = new ArrayList<>();
                for (String permission : needed) {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, permission)
                            != PackageManager.PERMISSION_GRANTED) {
                        missing.add(permission);
                    }
                }

                if (missing.isEmpty()) {
                    runOnUiThread(() -> {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception ignored) {
                            // Leave unhandled rather than crash; the JS side shows
                            // a friendly "enable microphone/camera" fallback.
                        }
                    });
                    return;
                }

                // Ask the user now, in context, then grant/deny from the result
                // in onRequestPermissionsResult below.
                pendingMediaRequest = request;
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    missing.toArray(new String[0]),
                    MEDIA_PERMISSION_REQUEST_CODE
                );
            }
        };
        getBridge().getWebView().setWebChromeClient(chromeClient);
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        @NonNull String[] permissions,
        @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MEDIA_PERMISSION_REQUEST_CODE || pendingMediaRequest == null) {
            return;
        }
        final PermissionRequest request = pendingMediaRequest;
        pendingMediaRequest = null;

        boolean allGranted = grantResults.length > 0;
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }

        final boolean granted = allGranted;
        runOnUiThread(() -> {
            try {
                if (granted) {
                    request.grant(request.getResources());
                } else {
                    // User declined — deny the web request; the JS side surfaces
                    // the "enable microphone access in Settings" guidance.
                    request.deny();
                }
            } catch (Exception ignored) {
                // No-op.
            }
        });
    }
}
