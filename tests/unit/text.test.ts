import { describe, expect, test } from 'vitest';
import { decodeEntities, firstImage, htmlToText, makeSummary, safeHttpUrl, truncate } from '../../src/core/text';
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
