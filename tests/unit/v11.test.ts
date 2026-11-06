import { describe, expect, test } from 'vitest';
import { feedErrorReason } from '../../src/core/views';

describe('fil en erreur en mots simples (EXG-019)', () => {
  test.each([
    ['HTTP 404', 'la page du fil est introuvable'],
    ['HTTP 410', 'la page du fil est introuvable'],
    ['HTTP 403', 'le site refuse l’accès au robot'],
    ['HTTP 401', 'le site refuse l’accès au robot'],
    ['HTTP 500', 'le site est en panne'],
    ['HTTP 503', 'le site est en panne'],
    ['Délai dépassé', 'le site met trop de temps à répondre'],
    ['Aucun fil trouvé à cette adresse', 'aucun fil n’a été trouvé à cette adresse'],
    ['fetch failed', 'le site est injoignable'],
    [undefined, 'raison inconnue'],
  ])('EXG-019 · « %s » devient « %s »', (raw, text) => {
    expect(feedErrorReason(raw)).toBe(text);
  });
});
