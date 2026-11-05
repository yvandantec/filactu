package fr.yvan.filactu;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** EXG-004 · les pages de FilActu restent dans l'appli, les articles partent vers le navigateur par défaut. */
public class LinkRouterTest {
    @Test
    public void EXG004_pagesDeFilActuRestentDansLAppli() {
        assertEquals(LinkRouter.Target.INSIDE, LinkRouter.route(LinkRouter.HOME));
        assertEquals(LinkRouter.Target.INSIDE, LinkRouter.route("https://yvandantec.github.io/filactu"));
        assertEquals(LinkRouter.Target.INSIDE, LinkRouter.route("https://YVANDANTEC.github.io/filactu/assets/x.js"));
        assertEquals(LinkRouter.Target.INSIDE, LinkRouter.route("blob:https://yvandantec.github.io/abc"));
        assertEquals(LinkRouter.Target.INSIDE, LinkRouter.route("about:blank"));
        assertEquals(LinkRouter.Target.INSIDE, LinkRouter.route(""));
    }

    @Test
    public void EXG004_articlesEtAutresSitesPartentAuNavigateur() {
        assertEquals(LinkRouter.Target.BROWSER, LinkRouter.route("https://www.example.test/article"));
        assertEquals(LinkRouter.Target.BROWSER, LinkRouter.route("http://example.test/"));
        assertEquals(LinkRouter.Target.BROWSER, LinkRouter.route("https://yvandantec.github.io/autre-projet/"));
        assertEquals(LinkRouter.Target.BROWSER, LinkRouter.route("https://yvandantec.github.io/filactuX"));
        assertEquals(LinkRouter.Target.BROWSER, LinkRouter.route("https://github.com/yvandantec/filactu"));
        assertEquals(LinkRouter.Target.BROWSER, LinkRouter.route("mailto:a@example.test"));
        assertEquals(LinkRouter.Target.BROWSER, LinkRouter.route("pas une adresse valide %%"));
    }

    @Test
    public void EXG004_liensIntentDUnAncienReglage() {
        assertEquals(LinkRouter.Target.INTENT,
                LinkRouter.route("intent://example.test/a#Intent;scheme=https;package=com.brave.browser;end"));
    }
}
