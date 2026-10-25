package club.tintintv.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private WebView webView;
    private TextView statusView;
    private FrameLayout root;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private boolean mainFrameLoadFailed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        hideSystemUi();
        setupViews();
        setupWebView();
        authenticateAndLoad();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setDatabaseEnabled(true);
        settings.setUserAgentString(
                settings.getUserAgentString() + " TintinTVAndroidTV/1.1"
        );

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullscreenView = view;
                fullscreenCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                webView.setVisibility(View.INVISIBLE);
                view.requestFocus();
                hideSystemUi();
            }

            @Override
            public void onHideCustomView() {
                if (fullscreenView == null) return;
                root.removeView(fullscreenView);
                fullscreenView = null;
                webView.setVisibility(View.VISIBLE);
                webView.requestFocus();
                if (fullscreenCallback != null) {
                    fullscreenCallback.onCustomViewHidden();
                    fullscreenCallback = null;
                }
                hideSystemUi();
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainFrameLoadFailed = false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return uri == null || !isTintinUrl(uri.toString());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (mainFrameLoadFailed) return;
                if (url != null && Uri.parse(url).getPath().equals("/login")) {
                    showStatus("TV sign-in expired. Press OK to reconnect.");
                    return;
                }
                statusView.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                webView.requestFocus();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    mainFrameLoadFailed = true;
                    showStatus("Unable to load TintinTV. Check the network and press OK to retry.");
                }
            }
        });
    }

    private void setupViews() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 10, 15));

        webView = new WebView(this);
        webView.setVisibility(View.INVISIBLE);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        statusView = new TextView(this);
        statusView.setText("TintinTV loading...");
        statusView.setTextColor(Color.WHITE);
        statusView.setTextSize(20);
        statusView.setGravity(Gravity.CENTER);
        statusView.setPadding(48, 48, 48, 48);
        statusView.setFocusable(true);
        statusView.setOnClickListener(view -> authenticateAndLoad());
        root.addView(statusView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        setContentView(root);
    }

    private void authenticateAndLoad() {
        statusView.setText("Connecting to TintinTV...");
        statusView.setVisibility(View.VISIBLE);
        statusView.requestFocus();
        if (BuildConfig.TV_ACCESS_TOKEN.isEmpty()) {
            showStatus("TV token is missing. Rebuild the APK with tintintv.tvAccessToken in android-tv/local.properties.");
            return;
        }

        executor.execute(() -> {
            try {
                authenticate();
                runOnUiThread(() -> webView.loadUrl(BuildConfig.TINTINTV_URL));
            } catch (Exception error) {
                runOnUiThread(() -> showStatus("Unable to connect to TintinTV. Please check TV_ACCESS_TOKEN on the server and rebuild the APK."));
            }
        });
    }

    private void authenticate() throws IOException {
        URL url = new URL(BuildConfig.TINTINTV_URL + "/api/tv-auth");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(12000);
        connection.setDoOutput(true);
        connection.setRequestProperty("x-tintintv-tv-token", BuildConfig.TV_ACCESS_TOKEN);
        connection.setRequestProperty("Content-Length", "0");
        connection.connect();

        int responseCode = connection.getResponseCode();
        if (responseCode < 200 || responseCode >= 300) {
            throw new IOException("Unexpected auth response: " + responseCode);
        }

        Map<String, List<String>> headers = connection.getHeaderFields();
        List<String> cookies = null;
        for (Map.Entry<String, List<String>> header : headers.entrySet()) {
            if (header.getKey() != null && header.getKey().equalsIgnoreCase("Set-Cookie")) {
                cookies = header.getValue();
                break;
            }
        }
        if (cookies != null) {
            CookieManager cookieManager = CookieManager.getInstance();
            for (String cookie : cookies) {
                cookieManager.setCookie(BuildConfig.TINTINTV_URL, cookie);
            }
            cookieManager.flush();
        }

        connection.disconnect();
    }

    private boolean isTintinUrl(String url) {
        if (url == null) return false;
        Uri target = Uri.parse(url);
        Uri allowed = Uri.parse(BuildConfig.TINTINTV_URL);
        return "https".equals(target.getScheme())
                && allowed.getHost().equalsIgnoreCase(target.getHost())
                && target.getPort() == allowed.getPort();
    }

    private void showStatus(String message) {
        webView.setVisibility(View.INVISIBLE);
        statusView.setText(message);
        statusView.setVisibility(View.VISIBLE);
        statusView.requestFocus();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && fullscreenView != null) {
            webView.getWebChromeClient().onHideCustomView();
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    private void hideSystemUi() {
        Window window = getWindow();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }
}
