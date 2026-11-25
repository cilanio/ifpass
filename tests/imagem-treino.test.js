import { describe, expect, it, vi } from 'vitest'
import { criarHandler } from '../supabase/functions/imagem-treino/handler.ts'

const id = '00000000-0000-4000-8000-000000000001'
const item = '00000000-0000-4000-8000-000000000002'

function requisicao(token = 'Bearer jwt-sintetico') {
  return new Request('http://localhost/imagem-treino', {
    method: 'POST',
    headers: token ? { Authorization: token } : {},
    body: JSON.stringify({ item_id: item, p_usuario: item, caminho: 'arquivo-de-outro' }),
  })
}

function preparar() {
  const fetchMock = vi.fn()
  const handler = criarHandler('http://localhost:8000', 'anon-local', 'servidor-local', fetchMock)
  return { handler, fetchMock }
}

describe('assinatura privada de imagem de treino', () => {
  it('revalida o JWT e a propriedade a cada renovação e solicita exatamente 300 segundos', async () => {
    const { handler, fetchMock } = preparar()
    for (let n = 0; n < 2; n++) {
      fetchMock.mockResolvedValueOnce(Response.json({ id }))
        .mockResolvedValueOnce(Response.json('versao/imagem.png'))
        .mockResolvedValueOnce(Response.json({ public: false }))
        .mockResolvedValueOnce(Response.json({ signedURL: '/object/sign/questoes-privadas/versao/imagem.png?token=ficticio' }))
      const res = await handler(requisicao())
      expect(res.status).toBe(200)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(await res.json()).toEqual({
        url: '/storage/v1/object/sign/questoes-privadas/versao/imagem.png?token=ficticio',
        validade_segundos: 300,
      })
    }
    expect(fetchMock).toHaveBeenCalledTimes(8)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ p_usuario: id, p_item: item })
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ expiresIn: 300 })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-sintetico')
  })

  it('limita a assinatura ao objeto autorizado pelo servidor', async () => {
    const { handler, fetchMock } = preparar()
    fetchMock.mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json(null))
    expect((await handler(requisicao())).status).toBe(404)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('não assina em bucket público ou sem autenticação', async () => {
    const { handler, fetchMock } = preparar()
    expect((await handler(requisicao(''))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce(Response.json({ id }))
      .mockResolvedValueOnce(Response.json('imagem.png'))
      .mockResolvedValueOnce(Response.json({ public: true }))
    expect((await handler(requisicao())).status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
