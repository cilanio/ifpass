import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [papel, setPapel] = useState('aluno')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    let resultado
    if (modo === 'entrar') {
      resultado = await supabase.auth.signInWithPassword({ email, password: senha })
    } else {
      resultado = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, papel } },
      })
    }

    if (resultado.error) setErro(resultado.error.message)
    setCarregando(false)
  }

  return (
    <div className="centro">
      <div className="cartao">
        <h1>IFPass</h1>
        <form onSubmit={enviar}>
          {modo === 'criar' && (
            <>
              <label>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required />
              <label>Eu sou</label>
              <select value={papel} onChange={(e) => setPapel(e.target.value)}>
                <option value="aluno">Aluno</option>
                <option value="responsavel">Responsável</option>
              </select>
            </>
          )}
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Senha (mínimo 6 caracteres)</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} required />
          {erro && <p className="erro">{erro}</p>}
          <button type="submit" disabled={carregando}>
            {carregando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <button type="button" className="link" onClick={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}>
          {modo === 'entrar' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}