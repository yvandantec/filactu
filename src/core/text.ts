import { SUMMARY_MAX } from './types';

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', eacute: 'é', egrave: 'è',
  ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', icirc: 'î', ucirc: 'û', ugrave: 'ù',
  euml: 'ë', iuml: 'ï', Eacute: 'É', Agrave: 'À', Ccedil: 'Ç', euro: '€', copy: '©', reg: '®',
  middot: '·', bull: '•', deg: '°', shy: '',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return NAMED[code] ?? m;
  });
}

/** Réduit du HTML (éventuellement doublement échappé) à du texte brut sur une ligne (ENF-03). */
export function htmlToText(html: string | undefined | null): string {
  if (!html) return '';
  let s = String(html);
  // Contenu échappé (&lt;p&gt;…) : on décode une première fois si aucune vraie balise n'est présente
  if (!/<[a-z!/]/i.test(s) && /&lt;[a-z!/]/i.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|iframe|noscript|svg|template)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  s = decodeEntities(s);
  // Entités doublement échappées (&amp;nbsp;) : un décodage de plus
  if (/&(#x?[0-9a-f]+|[a-z]+);/i.test(s)) s = decodeEntities(s);
  // Un second passage retire d'éventuelles balises révélées par le décodage
  s = s.replace(/<[^>]*>/g, ' ');
  return s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Coupe au mot, sans dépasser max caractères (points de suspension compris). */
export function truncate(text: string, max = SUMMARY_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[\s,;:.\-–—]+$/, '') + '…';
}

export function makeSummary(html: string | undefined | null): string {
  return truncate(htmlToText(html));
}

/** N'accepte que des URL http(s) absolues. */
export function safeHttpUrl(url: unknown, base?: string): string | undefined {
  if (typeof url !== 'string' || !url.trim()) return undefined;
  try {
    const u = new URL(decodeEntities(url.trim()), base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Première image <img src> trouvée dans un fragment HTML. */
export function firstImage(html: string | undefined | null, base?: string): string | undefined {
  if (!html) return undefined;
  let s = String(html);
  if (!/<img/i.test(s) && /&lt;img/i.test(s)) s = decodeEntities(s);
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[0])?.[1];
    const url = safeHttpUrl(src, base);
    // On ignore les pixels de suivi (1x1)
    if (url && !/\b(width|height)\s*=\s*["']?1["'\s/>]/i.test(m[0])) return url;
  }
  return undefined;
}
