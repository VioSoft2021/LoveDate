package com.lovedate.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

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
    }
}
