import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { DIAS, dataLocal, horaCurta, calcularSequencia } from './lib/util'

export default function Hoje() {
  const hoje = dataLocal()
  const diaSemana = new Date().getDay()
  const [materias, setMaterias] = useState([])
  const [blocos, setBlocos] = useState([])
  const [feitos, setFeitos] = useState([])
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const desde = new Date()
    desde.setDate(desde.getDate() - 90)
    const [m, b, f] = await Promise.all([
      supabase.from('materias').select('*'),
      supabase.from('plano_blocos').select('*').order('hora_inicio'),
      supabase.from('estudos_feitos').select('bloco_id, data').gte('data', dataLocal(desde)),
    ])
    const falha = m.error || b.error || f.error
    if (falha) {
      setErro(falha.message)
      return
    }
    setMaterias(m.data)
    setBlocos(b.data)
    setFeitos(f.data)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const porId = Object.fromEntries(materias.map((m) => [m.id, m]))
  const blocosHoje = blocos.filter((b) => b.dia_semana === diaSemana)
  const feitosHoje = new Set(feitos.filter((f) => f.data === hoje).map((f) => f.bloco_id))
  const concluidos = blocosHoje.filter((b) => feitosHoje.has(b.id)).length
  const percentual = blocosHoje.length ? Math.round((concluidos / blocosHoje.length) * 100) : 0
  const sequencia = calcularSequencia(feitos.map((f) => f.data))

  async function alternar(bloco) {
    setErro('')
    if (feitosHoje.has(bloco.id)) {
      await supabase.from('estudos_feitos').delete().eq('bloco_id', bloco.id).eq('data', hoje)
    } else {
      const { error } = await supabase.from('estudos_feitos').insert({ bloco_id: bloco.id, data: hoje })
      if (error) setErro(error.message)
    }
    carregar()
  }

  return (
    <div>
      <div className="destaques">
        <div className="destaque">
          Sequência
          <strong>🔥 {sequencia}</strong>
          {sequencia === 1 ? 'dia seguido' : 'dias seguidos'}
        </div>
        <div className="destaque laranja">
          Hoje, {DIAS[diaSemana]}
          <strong>
            {concluidos}/{blocosHoje.length}
          </strong>
          blocos feitos
        </div>
      </div>

      <div className="secao">
        <div className="barra">
          <div style={{ width: `${percentual}%` }} />
        </div>
        <h2>Blocos de hoje</h2>
        {erro && <p className="erro">{erro}</p>}
        {blocosHoje.length === 0 && (
          <p className="dica">Você não tem blocos para hoje. Vá em "Meu plano" para montar o seu.</p>
        )}
        {blocosHoje.map((b) => {
          const m = porId[b.id] || porId[b.materia_id]
          const feito = feitosHoje.has(b.id)
          return (
            <div
              key={b.id}
              className={feito ? 'bloco feito' : 'bloco'}
              style={{ borderLeftColor: m ? m.cor : '#999' }}
            >
              <div className="info">
                <strong>{horaCurta(b.hora_inicio)}</strong> · {m ? m.nome : '?'} · {b.duracao_min} min
              </div>
              <button
                className={feito ? 'check marcado' : 'check'}
                onClick={() => alternar(b)}
                aria-label="Marcar como feito"
              >
                {feito ? '✓' : ''}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}