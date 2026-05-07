# Capacitor plugin reflection — keep all plugin classes and annotated methods
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class *
-keepclassmembers @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.getcapacitor.** { *; }

# WebView JavaScript interface bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Standard Android components used by Capacitor
-keep class * extends androidx.appcompat.app.AppCompatActivity { *; }
-keep class com.lovedate.app.MainActivity { *; }

# To enable R8 in release builds, set `minifyEnabled true` and `shrinkResources true`
# in build.gradle, then verify a signed release build still launches and
# all plugins (StatusBar, etc.) function before publishing.
