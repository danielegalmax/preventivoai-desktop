/** Larghezza layout del template PDF (allineata al mobile). */
export const PDF_TEMPLATE_WIDTH = 800;

/** Altezza di un foglio A4 alla larghezza sopra (800 / 210 * 297). */
export const PDF_PAGE_HEIGHT = 1123;

export function preparaHtmlAnteprima(html: string): string {
  const style = `<style>
    html, body {
      margin: 0;
      padding: 0;
      overflow: visible;
      width: ${PDF_TEMPLATE_WIDTH}px;
      max-width: ${PDF_TEMPLATE_WIDTH}px;
      box-sizing: border-box;
    }
    * { box-sizing: border-box; }
  </style>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${style}</head>`);
  }
  return `${style}${html}`;
}
