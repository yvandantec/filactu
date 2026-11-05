package fr.yvan.filactu;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Décide où ouvrir une adresse (EXG-004) :
 * les pages de FilActu restent dans l'appli, tout le reste part vers le navigateur par défaut.
 */
public final class LinkRouter {
    public static final String HOME = "https://yvandantec.github.io/filactu/";
    static final String HOST = "yvandantec.github.io";
    static final String PATH = "/filactu";

    public enum Target { INSIDE, BROWSER, INTENT }

    private LinkRouter() {}

    public static Target route(String url) {
        if (url == null || url.isEmpty()) return Target.INSIDE;
        URI u;
        try {
            u = new URI(url);
        } catch (URISyntaxException e) {
            return Target.BROWSER;
        }
        String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        switch (scheme) {
            case "http":
            case "https":
                String host = u.getHost() == null ? "" : u.getHost().toLowerCase();
                String path = u.getPath() == null ? "" : u.getPath();
                boolean ours = host.equals(HOST) && (path.equals(PATH) || path.startsWith(PATH + "/"));
                return ours ? Target.INSIDE : Target.BROWSER;
            case "intent":
                return Target.INTENT;
            case "mailto":
            case "tel":
            case "market":
                return Target.BROWSER;
            default:
                // about:, blob:, data:, javascript: … restent dans l'appli (utilisés par la page elle-même)
                return Target.INSIDE;
        }
    }
}
