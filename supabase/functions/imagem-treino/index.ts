import { criarHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')
const publica = Deno.env.get('SUPABASE_ANON_KEY')
const servidor = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !publica || !servidor) throw new Error('Configuração do serviço de imagens incompleta')
Deno.serve(criarHandler(url, publica, servidor))
