import { describe, expect, test } from 'vitest';
import { decodeEntities, firstImage, htmlToText, makeSummary, pageImage, safeHttpUrl, truncate } from '../../src/core/text';
import { feedIdFor, hash, normalizeUrl, slug } from '../../src/core/hash';

describe('texte et résumés', () => {
  test('EXG-031 · décode les entités nommées et numériques', () => {
    expect(decodeEntities('a&amp;b &#233; &#xE9; &eacute; &inconnu;')).toBe('a&b é é é &inconnu;');
  });

  test('EXG-031 · retire scripts, styles, commentaires et balises', () => {
    const html = '<style>p{}</style><p>Un<br>deux</p><!-- c --><script>bad()</script><iframe src=x></iframe>trois';
    expect(htmlToText(html)).toBe('Un deux trois');
    expect(htmlToText(undefined)).toBe('');
    expect(htmlToText('&lt;script&gt;x&lt;/script&gt;ok')).toBe('ok');
  });

  test('EXG-031 · coupe le résumé au mot, sans dépasser 400 caractères', () => {
    const long = ('mot ').repeat(200);
    const s = makeSummary(long);
    expect(s.length).toBeLessThanOrEqual(400);
    expect(s.endsWith('mot…')).toBe(true);
    expect(truncate('court')).toBe('court');
    expect(truncate('x'.repeat(50), 10)).toBe('xxxxxxxxx…');
  });

  test('ENF-03 · seules les URL http(s) sont acceptées', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl('data:text/html,x')).toBeUndefined();
    expect(safeHttpUrl('/a', 'https://h.example.test/b')).toBe('https://h.example.test/a');
    expect(safeHttpUrl(42)).toBeUndefined();
    expect(safeHttpUrl('::::')).toBeUndefined();
  });

  test('EXG-030 · trouve la première image, en ignorant les pixels de suivi', () => {
    expect(firstImage('<img src="https://t.example.test/p.gif" width="1" height="1"><img src="https://i.example.test/v.jpg">')).toBe(
      'https://i.example.test/v.jpg',
    );
    expect(firstImage('&lt;img src="https://i.example.test/e.jpg"&gt;')).toBe('https://i.example.test/e.jpg');
    expect(firstImage(null)).toBeUndefined();
  });

  test('EXG-077 · identifiants stables et URL normalisées', () => {
    expect(hash('abc')).toBe(hash('abc'));
    expect(hash('abc')).not.toBe(hash('abd'));
    expect(normalizeUrl('HTTPS://Blog.Example.test/feed/#x')).toBe('https://blog.example.test/feed');
    expect(feedIdFor('https://blog.example.test/feed/')).toBe(feedIdFor('https://BLOG.example.test/feed'));
    expect(normalizeUrl(' pas une url ')).toBe('pas une url');
    expect(slug('Actualités & Tech')).toBe('actualites-tech');
    expect(slug('!!!')).toMatch(/^c-/);
  });
});

describe('image de partage d’une page (EXG-079)', () => {
  const page = (head: string, body = '') => `<!doctype html><html><head><title>t</title>${head}</head><body>${body}</body></html>`;
  const base = 'https://site.example.test/2026/article/';

  test('EXG-079 · lit og:image, quel que soit l’ordre des attributs', () => {
    expect(pageImage(page('<meta property="og:image" content="https://img.example.test/a.jpg" />'), base)).toBe('https://img.example.test/a.jpg');
    expect(pageImage(page("<meta content='https://img.example.test/b.jpg' property='og:image'>"), base)).toBe('https://img.example.test/b.jpg');
  });

  test('EXG-079 · résout les adresses relatives et décode les entités', () => {
    expect(pageImage(page('<meta property="og:image" content="/img/a.jpg?w=800&amp;h=600">'), base)).toBe('https://site.example.test/img/a.jpg?w=800&h=600');
  });

  test('EXG-079 · préfère og:image, puis twitter:image, puis link image_src', () => {
    const all = '<link rel="image_src" href="https://img.example.test/l.jpg">' +
      '<meta name="twitter:image" content="https://img.example.test/t.jpg">' +
      '<meta property="og:image" content="https://img.example.test/o.jpg">';
    expect(pageImage(page(all), base)).toBe('https://img.example.test/o.jpg');
    expect(pageImage(page('<link rel="image_src" href="https://img.example.test/l.jpg"><meta name="twitter:image" content="https://img.example.test/t.jpg">'), base))
      .toBe('https://img.example.test/t.jpg');
    expect(pageImage(page('<link href="https://img.example.test/l.jpg" rel="image_src">'), base)).toBe('https://img.example.test/l.jpg');
  });

  test('EXG-079 · refuse les adresses non http(s) et ignore le corps de la page', () => {
    expect(pageImage(page('<meta property="og:image" content="javascript:alert(1)">'), base)).toBeUndefined();
    expect(pageImage(page('', '<meta property="og:image" content="https://img.example.test/corps.jpg">'), base)).toBeUndefined();
    expect(pageImage('', base)).toBeUndefined();
  });
});
