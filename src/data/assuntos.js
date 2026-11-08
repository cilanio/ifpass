// Lista de assuntos (baseada no edital) e classificação das questões de cada prova.
// Para classificar uma prova nova: acrescente uma lista de 40 assuntos em CLASSIFICACAO,
// na ordem das questões (a primeira é a questão 1, a última é a questão 40).

export const BLOCOS = ['Língua Portuguesa', 'Matemática', 'Atualidades', 'Ciências da Natureza']

export const ASSUNTOS = {
  // Língua Portuguesa
  p_texto: { nome: 'Interpretação e compreensão de textos', bloco: 'Língua Portuguesa' },
  p_comunicacao: { nome: 'Comunicação: elementos e funções da linguagem', bloco: 'Língua Portuguesa' },
  p_acentuacao: { nome: 'Acentuação gráfica', bloco: 'Língua Portuguesa' },
  p_grafia: { nome: 'Grafia e emprego de palavras (por que, onde/aonde, mal/mau...)', bloco: 'Língua Portuguesa' },
  p_semantica: { nome: 'Sinonímia, antonímia, homonímia e paronímia', bloco: 'Língua Portuguesa' },
  p_classes: { nome: 'Classes de palavras e suas flexões', bloco: 'Língua Portuguesa' },
  p_sintaxe: { nome: 'Termos da oração e pontuação', bloco: 'Língua Portuguesa' },
  p_concordancia: { nome: 'Concordância verbal e nominal', bloco: 'Língua Portuguesa' },
  // Matemática
  m_numeros: { nome: 'Números, expressões e problemas do dia a dia (frações, decimais, unidades)', bloco: 'Matemática' },
  m_proporcao: { nome: 'Razões, proporções, regra de três e porcentagem', bloco: 'Matemática' },
  m_equacoes1: { nome: 'Equações, sistemas e inequações do 1º grau', bloco: 'Matemática' },
  m_algebra: { nome: 'Álgebra: polinômios, produtos notáveis e frações algébricas', bloco: 'Matemática' },
  m_potencia: { nome: 'Potenciação e radiciação', bloco: 'Matemática' },
  m_eq2: { nome: 'Equações, sistemas e inequações do 2º grau', bloco: 'Matemática' },
  m_funcoes: { nome: 'Funções (afim, quadrática e exponencial)', bloco: 'Matemática' },
  m_geo_plana: { nome: 'Geometria plana: áreas, polígonos e circunferência', bloco: 'Matemática' },
  m_geo_semelhanca: { nome: 'Teorema de Tales, semelhança e triângulo retângulo', bloco: 'Matemática' },
  m_geo_espacial: { nome: 'Geometria espacial: sólidos e volumes', bloco: 'Matemática' },
  m_dados: { nome: 'Leitura de tabelas e gráficos', bloco: 'Matemática' },
  // Atualidades
  a_geopolitica: { nome: 'Conflitos geopolíticos atuais', bloco: 'Atualidades' },
  a_clima: { nome: 'Clima, aquecimento global e energia', bloco: 'Atualidades' },
  a_globalizacao: { nome: 'Globalização e desigualdades', bloco: 'Atualidades' },
  // Ciências da Natureza
  c_calor: { nome: 'Calor, temperatura e máquinas térmicas', bloco: 'Ciências da Natureza' },
  c_saude: { nome: 'Saúde pública e indicadores', bloco: 'Ciências da Natureza' },
  c_ambiente: { nome: 'Ecologia, ambiente e transformações químicas', bloco: 'Ciências da Natureza' },
  c_eletricidade: { nome: 'Fenômenos elétricos e atmosfera', bloco: 'Ciências da Natureza' },
}

export const CLASSIFICACAO = {
  'ifal-2026-t1': [
    // Português 1–18
    'p_semantica', 'p_acentuacao', 'p_texto', 'p_grafia', 'p_texto', 'p_semantica', 'p_comunicacao', 'p_texto', 'p_concordancia',
    'p_sintaxe', 'p_classes', 'p_sintaxe', 'p_grafia', 'p_sintaxe', 'p_texto', 'p_sintaxe', 'p_semantica', 'p_comunicacao',
    // Matemática 19–36
    'm_proporcao', 'm_potencia', 'm_proporcao', 'm_potencia', 'm_numeros', 'm_eq2', 'm_algebra', 'm_numeros', 'm_algebra',
'm_numeros', 'm_geo_plana', 'm_equacoes1', 'm_equacoes1', 'm_geo_plana', 'm_geo_espacial', 'm_eq2', 'm_algebra', 'm_numeros',
    // Ciências 37–40
    'c_calor', 'c_saude', 'c_ambiente', 'c_eletricidade',
  ],
  'ifal-2025-t1': [
    'p_comunicacao', 'p_concordancia', 'p_comunicacao', 'p_comunicacao', 'p_sintaxe', 'p_semantica', 'p_sintaxe', 'p_comunicacao', 'p_classes',
    'p_texto', 'p_texto', 'p_sintaxe', 'p_classes', 'p_classes', 'p_concordancia', 'p_semantica', 'p_acentuacao', 'p_classes',
    'm_potencia', 'm_geo_espacial', 'm_proporcao', 'm_geo_semelhanca', 'm_eq2', 'm_eq2', 'm_geo_semelhanca', 'm_algebra', 'm_potencia',
    'm_eq2', 'm_geo_plana', 'm_algebra', 'm_proporcao', 'm_equacoes1', 'm_numeros', 'm_algebra', 'm_equacoes1', 'm_numeros',
    'a_clima', 'a_geopolitica', 'a_clima', 'a_globalizacao',
  ],
  'ifal-2024-t3': [
    'p_sintaxe', 'p_classes', 'p_semantica', 'p_acentuacao', 'p_classes', 'p_classes', 'p_classes', 'p_concordancia', 'p_grafia',
    'p_texto', 'p_texto', 'p_texto', 'p_grafia', 'p_acentuacao', 'p_sintaxe', 'p_semantica', 'p_comunicacao', 'p_comunicacao',
    'm_geo_plana', 'm_geo_espacial', 'm_geo_plana', 'm_funcoes', 'm_geo_semelhanca', 'm_algebra', 'm_numeros', 'm_proporcao', 'm_potencia',
'm_numeros', 'm_funcoes', 'm_funcoes', 'm_algebra',
    'm_numeros', 'm_funcoes', 'm_funcoes', 'm_algebra', 'm_equacoes1', 'm_proporcao', 'm_numeros', 'm_proporcao', 'm_dados',
    'a_clima', 'a_geopolitica', 'a_clima', 'a_geopolitica',
  ],
}

export function assuntoDe(provaId, n) {
  const lista = CLASSIFICACAO[provaId]
  return lista ? lista[n - 1] : null
}
