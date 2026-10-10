import { apiErrorMessage } from '@/lib/api-error'

describe('apiErrorMessage', () => {
  it('ne renvoie rien pour une réponse OK', () => {
    expect(apiErrorMessage(true, 200, { error: 'x' })).toBeUndefined()
  })
  it('masque les erreurs serveur (5xx) : le message traduit de l’appelant s’affiche', () => {
    expect(apiErrorMessage(false, 500, { error: 'Internal Server Error' })).toBeUndefined()
    expect(apiErrorMessage(false, 503, { error: 'Démo non disponible' })).toBeUndefined()
  })
  it('masque les messages génériques anglais même en 4xx', () => {
    expect(apiErrorMessage(false, 404, { error: 'Not found' })).toBeUndefined()
    expect(apiErrorMessage(false, 400, { error: 'Missing required fields' })).toBeUndefined()
  })
  it('conserve les messages métier et les codes techniques (traduits par l’appelant)', () => {
    expect(apiErrorMessage(false, 409, { error: 'Stock insuffisant pour P1 : disponible 2, demandé 5' })).toBe('Stock insuffisant pour P1 : disponible 2, demandé 5')
    expect(apiErrorMessage(false, 409, { error: 'WAREHOUSE_HAS_STOCK' })).toBe('WAREHOUSE_HAS_STOCK')
  })
  it('gère un corps vide ou non conforme', () => {
    expect(apiErrorMessage(false, 400, null)).toBeUndefined()
    expect(apiErrorMessage(false, 400, { error: 42 })).toBeUndefined()
    expect(apiErrorMessage(false, 400, { error: '  ' })).toBeUndefined()
  })
})
