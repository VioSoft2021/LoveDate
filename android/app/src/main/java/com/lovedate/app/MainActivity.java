package com.lovedate.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyStatusBarFix();
    }

    private void applyStatusBarFix() {
        // Solid status bar — no transparency, no overlay over content
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(Color.parseColor("#141937"));
        getWindow().setNavigationBarColor(Color.parseColor("#141937"));

        // Content must NOT go behind status bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Light icons = false means WHITE icons on our dark background
        WindowInsetsControllerCompat ctrl = WindowCompat.getInsetsController(
            getWindow(), getWindow().getDecorView()
        );
        ctrl.setAppearanceLightStatusBars(false);
        ctrl.setAppearanceLightNavigationBars(false);

        // Inject inset values as CSS variables for the web layer
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
            int top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            getBridge().getWebView().post(() -> {
                String js =
                    "document.documentElement.style.setProperty('--safe-top','" + top + "px');" +
                    "document.documentElement.style.setProperty('--safe-bottom','" + bottom + "px');";
                getBridge().getWebView().evaluateJavascript(js, null);
            });
            return ViewCompat.onApplyWindowInsets(view, insets);
        });
    }
}
