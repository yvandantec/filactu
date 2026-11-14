import { describe, expect, test } from 'vitest';
import { adjacentCategory } from '../../src/core/views';
import type { Category } from '../../src/core/types';

const cats: Category[] = [
  { id: 'b', name: 'B', order: 1 },
  { id: 'a', name: 'A', order: 0 },
  { id: 'c', name: 'C', order: 2 },
];

describe('V1.6 — glisser entre catégories', () => {
  test('EXG-090 · catégorie suivante / précédente dans l’ordre du volet, en boucle', () => {
    expect(adjacentCategory('category:a', cats, 1)).toBe('category:b');
    expect(adjacentCategory('category:b', cats, 1)).toBe('category:c');
    expect(adjacentCategory('category:c', cats, 1)).toBe('category:a'); // après la dernière : la première
    expect(adjacentCategory('category:a', cats, -1)).toBe('category:c'); // avant la première : la dernière
    expect(adjacentCategory('category:c', cats, -1)).toBe('category:b');
  });

  test('EXG-090 · hors d’une catégorie : première vers la gauche, dernière vers la droite', () => {
    for (const v of ['today', 'all', 'saved', 'feed:x', 'category:disparue'] as const) {
      expect(adjacentCategory(v, cats, 1), v).toBe('category:a');
      expect(adjacentCategory(v, cats, -1), v).toBe('category:c');
    }
  });

  test('EXG-090 · sans catégorie, ou avec une seule, rien ne change', () => {
    expect(adjacentCategory('today', [], 1)).toBeNull();
    expect(adjacentCategory('category:a', [cats[1]], 1)).toBeNull();
    expect(adjacentCategory('today', [cats[1]], 1)).toBe('category:a');
  });
});
