package fr.yvan.filactu;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;

/**
 * Enveloppe Android de FilActu (EXG-004, DEC-08) : affiche le site dans une WebView
 * et confie chaque lien d'article à Android, qui l'ouvre dans le navigateur par défaut.
 */
public class MainActivity extends Activity {
    private static final int PICK_FILE = 1;
    private static final int SAVE_FILE = 2;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    /** Contenu du fichier à enregistrer, en attente du choix de l'emplacement (EXG-089). */
    private String pendingContent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.filactu_bg));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Android 15 affiche l'appli bord à bord : on laisse la place aux barres système
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSupportMultipleWindows(false);
        // Le site reconnaît l'appli et n'utilise que des liens normaux
        s.setUserAgentString(s.getUserAgentString() + " FilActuAndroid/" + BuildConfig.VERSION_NAME);

        // La WebView ignore les téléchargements : le site confie ses fichiers (export OPML) à l'appli (EXG-089)
        web.addJavascriptInterface(new Bridge(), "FilActuAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handle(request.getUrl().toString());
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(pick, "Choisir un fichier OPML"), PICK_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(LinkRouter.HOME);
    }

    /** Passerelle appelée par le site (window.FilActuAndroid). */
    private class Bridge {
        @JavascriptInterface
        public void saveFile(String name, String mime, String content) {
            runOnUiThread(() -> askWhereToSave(name, mime, content));
        }
    }

    /** Ouvre la fenêtre d'enregistrement d'Android, avec le nom du fichier proposé. */
    private void askWhereToSave(String name, String mime, String content) {
        pendingContent = content;
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        save.addCategory(Intent.CATEGORY_OPENABLE);
        save.setType(mime);
        save.putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(save, SAVE_FILE);
        } catch (ActivityNotFoundException e) {
            pendingContent = null;
            Toast.makeText(this, R.string.file_not_saved, Toast.LENGTH_LONG).show();
        }
    }

    private void writeFile(Uri target, String content) {
        try (OutputStream out = getContentResolver().openOutputStream(target, "wt")) {
            if (out == null) throw new IOException("emplacement indisponible");
            out.write(content.getBytes(StandardCharsets.UTF_8));
            Toast.makeText(this, R.string.file_saved, Toast.LENGTH_SHORT).show();
        } catch (IOException | SecurityException e) {
            Toast.makeText(this, R.string.file_not_saved, Toast.LENGTH_LONG).show();
        }
    }

    /** Vrai si l'adresse a été confiée à une autre appli (navigateur…). */
    private boolean handle(String url) {
        switch (LinkRouter.route(url)) {
            case INSIDE:
                return false;
            case INTENT:
                try {
                    Intent i = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                    i.addCategory(Intent.CATEGORY_BROWSABLE);
                    i.setComponent(null);
                    i.setSelector(null);
                    Uri data = i.getData();
                    open(data != null ? new Intent(Intent.ACTION_VIEW, data) : i);
                } catch (URISyntaxException e) {
                    toast();
                }
                return true;
            default:
                open(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                return true;
        }
    }

    private void open(Intent intent) {
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            toast();
        }
    }

    private void toast() {
        Toast.makeText(this, R.string.no_browser, Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        if (requestCode == SAVE_FILE) {
            String content = pendingContent;
            pendingContent = null;
            // Annulé par l'utilisateur : rien à dire
            if (resultCode == RESULT_OK && data != null && data.getData() != null && content != null) {
                writeFile(data.getData(), content);
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
