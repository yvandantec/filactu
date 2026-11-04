import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { knownFeedUrl, parseFeed } from '../../src/core/feed';

describe('adresses YouTube', () => {
  test('EXG-017 · une playlist YouTube est convertie en fil', () => {
    expect(knownFeedUrl('https://www.youtube.com/playlist?list=UU7B4TG_Mv-gogtnPdayjhcA')).toBe(
      'https://www.youtube.com/feeds/videos.xml?playlist_id=UU7B4TG_Mv-gogtnPdayjhcA',
    );
    expect(knownFeedUrl('https://m.youtube.com/playlist?list=PLabc&si=x')).toBe(
      'https://www.youtube.com/feeds/videos.xml?playlist_id=PLabc',
    );
  });

  test('EXG-017 · une chaîne YouTube (/channel/UC…) est convertie en fil', () => {
    expect(knownFeedUrl('https://www.youtube.com/channel/UCSdJiWi0tq9CAx1bizne6mA/videos')).toBe(
      'https://www.youtube.com/feeds/videos.xml?channel_id=UCSdJiWi0tq9CAx1bizne6mA',
    );
  });

  test('EXG-017 · les autres adresses ne sont pas modifiées', () => {
    expect(knownFeedUrl('https://www.youtube.com/feeds/videos.xml?channel_id=UCx')).toBeUndefined();
    expect(knownFeedUrl('https://www.youtube.com/@pseudo')).toBeUndefined();
    expect(knownFeedUrl('https://blog.example.test/playlist?list=x')).toBeUndefined();
    expect(knownFeedUrl('pas une url')).toBeUndefined();
  });

  test('EXG-017 · résumé et vignette d’une vidéo viennent de media:group', () => {
    const xml = readFileSync(new URL('../fixtures/feeds/youtube.xml', import.meta.url), 'utf8');
    const f = parseFeed(xml);
    expect(f.items[0]).toMatchObject({
      title: 'Ma vidéo de test',
      link: 'https://www.youtube.com/watch?v=abc123',
      summary: 'Description de la vidéo, sur deux lignes.',
      image: 'https://i1.ytimg.com/vi/abc123/hqdefault.jpg',
      author: 'Chaîne de test',
    });
  });
});
