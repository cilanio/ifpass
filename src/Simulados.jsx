import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { PROVAS } from './data/provas'
import { formatarTempo } from './lib/correcao'
import Prova from './Prova'
import Resultado from './Resultado'
import './simulado.css'

export default function Simulados() {
  const [tentativas, setTentativas] = useState([])
  const [tela, setTela] = useState({ nome: 'lista' })
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('simulados')
      .select('*')
      .order('iniciado_em', { ascending: false })
    if (error) setErro(error.message)
    else setTentativas(data)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function iniciar(prova) {
    if (!window.confirm(`O cronômetro de ${formatarTempo(prova.duracaoMin * 60)} começa agora. Iniciar o simulado?`)) return
    setErro('')
    const { data, error } = await supabase
      .from('simulados')
      .insert({ prova_id: prova.id, iniciado_em: new Date().toISOString() })
      .select()
      .single()
    if (error) {
      setErro(error.message)
      return
    }
    setTela({ nome: 'prova', tentativa: data })
  }

  if (tela.nome === 'prova' || tela.nome === 'resultado') {
    const prova = PROVAS.find((p) => p.id === tela.tentativa.prova_id)
    if (!prova) return <p className="erro">Prova não encontrada.</p>
    if (tela.nome === 'prova') {
      return (
        <Prova
          prova={prova}
          tentativa={tela.tentativa}
          onSair={() => {
            carregar()
            setTela({ nome: 'lista' })
          }}
          onFinalizar={(t) => {
            carregar()
            setTela({ nome: 'resultado', tentativa: t })
          }}
        />
      )
    }
    return (
      <Resultado
        prova={prova}
        tentativa={tela.tentativa}
        onVoltar={() => {
          carregar()
          setTela({ nome: 'lista' })
        }}
      />
    )
  }

  const finalizados = tentativas.filter((t) => t.status === 'finalizado')

  return (
    <div>
      {erro && <p className="erro">{erro}</p>}
      <div className="secao">
        <h2>Simulados</h2>
        <p className="dica">Provas reais anteriores, com cronômetro e correção automática. Treine como se fosse o dia.</p>
        {PROVAS.map((prova) => {
          const andamento = tentativas.find((t) => t.prova_id === prova.id && t.status === 'em_andamento')
          return (
            <div key={prova.id} className="card-prova">
              <div>
                <strong>{prova.titulo}</strong>
                <p className="dica">
                  {prova.questoes.length} questões · {formatarTempo(prova.duracaoMin * 60)} · gabarito {prova.gabarito}
                </p>
              </div>
              {andamento ? (
                <button className="pequeno" onClick={() => setTela({ nome: 'prova', tentativa: andamento })}>
                  Continuar
                </button>
              ) : (
                <button className="pequeno" onClick={() => iniciar(prova)}>
                  Iniciar
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="secao">
        <h2>Meus resultados</h2>
        {finalizados.length === 0 && <p className="dica">Você ainda não terminou nenhum simulado.</p>}
        {finalizados.map((t) => {
          const prova = PROVAS.find((p) => p.id === t.prova_id)
          if (!prova) return null
          return (
            <div key={t.id} className="card-prova">
              <div>
                <strong>{prova.titulo}</strong>
                <p className="dica">
                  {new Date(t.iniciado_em).toLocaleDateString('pt-BR')} · {t.acertos}/{t.total} (
                  {Math.round((t.acertos / t.total) * 100)}%) · {formatarTempo(t.duracao_seg || 0)}
                </p>
              </div>
              <button className="pequeno" onClick={() => setTela({ nome: 'resultado', tentativa: t })}>
                Ver resultado
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
