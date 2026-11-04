// Mostra textos das questões. Marcações: __sublinhado__, *itálico*, ^{expoente}
const PADRAO = /(__.+?__|\*.+?\*|\^\{.+?\}|\^-?\d+)/g

function converter(texto) {
  return texto.split(PADRAO).map((p, i) => {
    if (!p) return null
    if (p.length > 4 && p.startsWith('__') && p.endsWith('__')) return <u key={i}>{p.slice(2, -2)}</u>
    if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
    if (p.startsWith('^{')) return <sup key={i}>{p.slice(2, -1)}</sup>
    if (p.startsWith('^')) return <sup key={i}>{p.slice(1)}</sup>
    return p
  })
}

export function Inline({ children }) {
  return <>{converter(String(children))}</>
}

export default function Texto({ children }) {
  return (
    <>
      {String(children)
        .split('\n')
        .map((linha, i) => (
          <p key={i}>{converter(linha)}</p>
        ))}
    </>
  )
}
