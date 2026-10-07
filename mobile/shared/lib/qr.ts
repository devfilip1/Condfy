import qrcode from "qrcode-generator";

/**
 * A grade de um QR Code a partir de um texto.
 *
 * Função pura, sem React e sem domínio de feature nenhuma — por isso mora em `shared/lib/`.
 *
 * **Este é o ÚNICO arquivo que importa `qrcode-generator`.** A biblioteca cuida do que ninguém
 * aqui deveria manter à mão: a codificação, a correção de erro e a máscara. Quem desenha recebe só
 * uma grade de verdadeiro e falso, então trocar de biblioteca é mexer neste arquivo e em mais
 * nenhum (ADR 0016).
 *
 * Nível de correção **M**: o comprovante vira uma imagem que os aplicativos de conversa comprimem
 * de novo, e o M aguenta essa perda sem deixar os quadrados pequenos demais para ler de uma tela.
 *
 * A margem branca em volta (a "quiet zone") NÃO vem aqui: é coisa de quem desenha.
 *
 * @returns linhas de cima para baixo, colunas da esquerda para a direita; `true` é quadrado escuro.
 */
export function qrMatrix(text: string): boolean[][] {
  // `0` deixa a biblioteca escolher o menor tamanho de grade que comporta o texto.
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();

  const size = code.getModuleCount();
  const rows: boolean[][] = [];
  for (let row = 0; row < size; row += 1) {
    const cells: boolean[] = [];
    for (let column = 0; column < size; column += 1) {
      cells.push(code.isDark(row, column));
    }
    rows.push(cells);
  }
  return rows;
}
