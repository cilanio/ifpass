// Junta os arquivos de letras de todas as provas.
// Quando entrar uma prova nova com letras, é só acrescentar uma linha aqui.
import { LETRAS } from './letras'
import { LETRAS_2025 } from './letras-2025'

export const TODAS_LETRAS = { ...LETRAS, ...LETRAS_2025 }
