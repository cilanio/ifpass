const bucket = 'questoes-privadas'
const validade = 300
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function criarHandler(url: string, publica: string, servidor: string, requisitar = fetch) {
  const origem = new URL(url).origin
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  }
  const json = (dados: unknown, status = 200) => Response.json(dados, { status, headers: cors })
  const privilegiado = {
    apikey: servidor, Authorization: `Bearer ${servidor}`, 'Content-Type': 'application/json',
  }

  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (req.method !== 'POST') return json({ erro: 'Método indisponível' }, 405)
    const token = req.headers.get('Authorization')
    if (!token?.startsWith('Bearer ')) return json({ erro: 'Sessão necessária' }, 401)
    const corpo = await req.json().catch(() => null)
    if (typeof corpo?.item_id !== 'string' || !uuid.test(corpo.item_id)) {
      return json({ erro: 'Item inválido' }, 400)
    }

    try {
      const auth = await requisitar(`${origem}/auth/v1/user`, {
        headers: { apikey: publica, Authorization: token },
      })
      if (!auth.ok) return json({ erro: 'Sessão não verificada' }, auth.status >= 500 ? 502 : 401)
      const usuario = await auth.json()
      if (!uuid.test(usuario.id)) return json({ erro: 'Sessão inválida' }, 401)
      const objeto = await requisitar(`${origem}/rest/v1/rpc/ifpass_treino_objeto_imagem`, {
        method: 'POST', headers: privilegiado,
        body: JSON.stringify({ p_usuario: usuario.id, p_item: corpo.item_id }),
      })
      if (!objeto.ok) return json({ erro: 'Não foi possível verificar a imagem' }, 502)
      const caminho = await objeto.json()
      if (typeof caminho !== 'string' || !caminho) return json({ erro: 'Imagem indisponível' }, 404)
      const segmentos = caminho.split('/')
      if (segmentos.some(s => !s || s === '.' || s === '..' || s.includes('\\'))) {
        return json({ erro: 'Imagem indisponível' }, 404)
      }

      const metadados = await requisitar(`${origem}/storage/v1/bucket/${bucket}`, { headers: privilegiado })
      if (!metadados.ok || (await metadados.json()).public !== false) {
        return json({ erro: 'Armazenamento privado indisponível' }, 502)
      }
      const assinada = await requisitar(
        `${origem}/storage/v1/object/sign/${bucket}/${segmentos.map(encodeURIComponent).join('/')}`,
        { method: 'POST', headers: privilegiado, body: JSON.stringify({ expiresIn: validade }) },
      )
      if (!assinada.ok) return json({ erro: 'Não foi possível carregar a imagem' }, 502)
      const { signedURL } = await assinada.json()
      if (typeof signedURL !== 'string' || !signedURL.startsWith(`/object/sign/${bucket}/`)) {
        return json({ erro: 'Assinatura inválida' }, 502)
      }
      return json({ url: `/storage/v1${signedURL}`, validade_segundos: validade })
    } catch {
      return json({ erro: 'Serviço de imagens indisponível' }, 502)
    }
  }
}
