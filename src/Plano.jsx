import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { PALETA, DIAS, ORDEM_DIAS, horaCurta } from './lib/util'

const SUGESTOES = ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Redação', 'Inglês']

export default function Plano() {
  const [materias, setMaterias] = useState([])
  const [blocos, setBlocos] = useState([])
  const [novaMateria, setNovaMateria] = useState('')
  const [dia, setDia] = useState(1)
  const [materiaId, setMateriaId] = useState('')
  const [hora, setHora] = useState('16:00')
  const [duracao, setDuracao] = useState(60)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const m = await supabase.from('materias').select('*').order('criado_em')
    const b = await supabase.from('plano_blocos').select('*').order('hora_inicio')
    if (m.error || b.error) {
      setErro((m.error || b.error).message)
      return
    }
    setMaterias(m.data)
    setBlocos(b.data)
    setMateriaId((atual) => atual || (m.data[0] ? m.data[0].id : ''))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionarMateria(nome) {
    const limpo = nome.trim()
    if (!limpo) return
    if (materias.some((m) => m.nome.toLowerCase() === limpo.toLowerCase())) return
    setErro('')
    const cor = PALETA[materias.length % PALETA.length]
    const { error } = await supabase.from('materias').insert({ nome: limpo, cor })
    if (error) setErro(error.message)
    setNovaMateria('')
    carregar()
  }

  async function removerMateria(m) {
    if (!window.confirm(`Remover "${m.nome}" e todos os blocos dessa matéria?`)) return
    await supabase.from('materias').delete().eq('id', m.id)
    carregar()
  }

  async function adicionarBloco() {
    if (!materiaId) {
      setErro('Crie uma matéria primeiro.')
      return
    }
    setErro('')
    const { error } = await supabase.from('plano_blocos').insert({
      materia_id: materiaId,
      dia_semana: Number(dia),
      hora_inicio: hora,
      duracao_min: Number(duracao),
    })
    if (error) setErro(error.message)
    carregar()
  }

  async function removerBloco(id) {
    await supabase.from('plano_blocos').delete().eq('id', id)
    carregar()
  }

  const porId = Object.fromEntries(materias.map((m) => [m.id, m]))

  return (
    <div>
      <div className="secao">
        <h2>1. Minhas matérias</h2>
        {materias.length === 0 && <p className="dica">Comece escolhendo as matérias que vai estudar.</p>}
        <div className="linha">
          {materias.map((m) => (
            <span key={m.id} className="pilula" style={{ background: m.cor }}>
              {m.nome}
              <button className="x" onClick={() => removerMateria(m)} aria-label={`Remover ${m.nome}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="linha">
          {SUGESTOES.filter((s) => !materias.some((m) => m.nome === s)).map((s) => (
            <button key={s} className="sugestao" onClick={() => adicionarMateria(s)}>
              + {s}
            </button>
          ))}
        </div>
        <div className="linha">
          <input
            placeholder="Outra matéria..."
            value={novaMateria}
            onChange={(e) => setNovaMateria(e.target.value)}
          />
          <button className="pequeno" onClick={() => adicionarMateria(novaMateria)}>
            Adicionar
          </button>
        </div>
      </div>

      <div className="secao">
        <h2>2. Meus blocos de estudo</h2>
        <p className="dica">Escolha o dia, a matéria, o horário e quanto tempo. Dá para mudar quando quiser.</p>
        <div className="linha">
          <select value={dia} onChange={(e) => setDia(e.target.value)}>
            {ORDEM_DIAS.map((i) => (
              <option key={i} value={i}>
                {DIAS[i]}
              </option>
            ))}
          </select>
          <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          <select value={duracao} onChange={(e) => setDuracao(e.target.value)}>
            {[30, 45, 60, 90, 120].map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
          <button className="pequeno" onClick={adicionarBloco}>
            Adicionar bloco
          </button>
        </div>
        {erro && <p className="erro">{erro}</p>}

        {blocos.length === 0 && <p className="dica">Nenhum bloco ainda.</p>}
        {ORDEM_DIAS.map((i) => {
          const doDia = blocos.filter((b) => b.dia_semana === i)
          if (doDia.length === 0) return null
          return (
            <div key={i}>
              <h3>{DIAS[i]}</h3>
              {doDia.map((b) => {
                const m = porId[b.materia_id]
                return (
                  <div key={b.id} className="bloco" style={{ borderLeftColor: m ? m.cor : '#999' }}>
                    <div className="info">
                      <strong>{horaCurta(b.hora_inicio)}</strong> · {m ? m.nome : '?'} · {b.duracao_min} min
                    </div>
                    <button className="x escuro" onClick={() => removerBloco(b.id)} aria-label="Remover bloco">
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}