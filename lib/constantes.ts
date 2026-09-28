/**
 * Constantes de domínio compartilhadas entre servidor e cliente.
 * Mantenha este arquivo LIVRE de qualquer import de Prisma/bancos, para que
 * componentes client possam importar com segurança (não vaza código de
 * servidor para o bundle do navegador).
 */

/** Preço de um ponto. Espelha o valor cobrado ao comprador. */
export const VALOR_POR_PONTO = 5;

/** A grade vai de 1 a 1200 pontos. */
export const NUMERO_MINIMO_PONTO = 1;
export const NUMERO_MAXIMO_PONTO = 1200;