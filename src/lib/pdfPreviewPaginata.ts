import { PDF_PAGE_HEIGHT, PDF_TEMPLATE_WIDTH } from "./pdfPreview";

export type PageBreakMessage = {
  type: "page-breaks";
  pageHeightPx?: number;
  totalPages?: number;
};

/** Allinea l'HTML del backend alla preview paginata (come mobile). */
export function scalaHtmlPreview(html: string): string {
  if (html.includes("__PREVIEW_SCALE__")) return html;
  return html.replace(
    "</head>",
    `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  html { width: 100%; height: 100%; overflow: hidden; }
  body { margin: 0; overflow: hidden; }
  #preventivo-preview-scale-root {
    position: relative;
    transform-origin: top left;
    transform: scale(__PREVIEW_SCALE__);
    width: __PREVIEW_WIDTH_PERCENT__%;
  }
  a { pointer-events: none !important; cursor: default !important; }
</style>
</head>`,
  );
}

function avvolgiContenutoPreview(html: string): string {
  if (html.includes('id="preventivo-preview-scale-root"')) return html;
  return html
    .replace(/<body>/i, '<body><div id="preventivo-preview-scale-root">')
    .replace(/<\/body>/i, "</div></body>");
}

/** Pulito/Classico/Artigiano: il padding era su body, ma il contenuto è nel wrapper scalato. */
function spostaPaddingBodySuRoot(html: string): string {
  const haPadding48 = /body\{[^}]*padding:\s*48px/.test(html);
  if (!haPadding48) return html;

  return html
    .replace(/body(\{[^}]*?)padding:\s*48px;?/g, "body$1")
    .replace(
      "#preventivo-preview-scale-root {",
      "#preventivo-preview-scale-root { padding: 48px; box-sizing: border-box;",
    );
}

function preparaPreviewDesktop(html: string): string {
  let out = spostaPaddingBodySuRoot(avvolgiContenutoPreview(html));

  if (!out.includes("window.parent.postMessage")) {
    out = out.replace(
      "function postPreviewMessage(totalPages) {",
      `function postPreviewMessage(totalPages) {
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage(JSON.stringify({
              type: 'page-breaks',
              pageHeightPx: A4_HEIGHT_UNSCALED,
              totalPages: totalPages,
              breakPoints: []
            }), '*');
          } catch (e) {}
        }`,
    );
  }

  out = out.replace(
    "var totalPages = Math.max(1, Math.ceil(getLayoutBottom(document.body) / pageHeight));",
    `var totalPages = (function () {
          var bottom = getLayoutBottom(document.body);
          var pages = Math.max(1, Math.ceil(bottom / pageHeight));
          if (pages > 1) {
            var remainder = bottom - (pages - 1) * pageHeight;
            if (remainder < PAGE_BOTTOM_MARGIN) pages -= 1;
          }
          return pages;
        })();`,
  );

  return out;
}

export function htmlPerPaginaPreview(html: string, pageIndex: number, scale: number): string {
  const widthPercent = (100 / scale).toFixed(2);
  const pageScript = `<script>window.__PREVIEW_PAGE_INDEX=${pageIndex};</script>`;

  return preparaPreviewDesktop(scalaHtmlPreview(html))
    .replace(/__PREVIEW_SCALE__/g, scale.toFixed(4))
    .replace(/__PREVIEW_WIDTH_PERCENT__/g, widthPercent)
    .replace("</head>", `${pageScript}</head>`);
}

export function dimensioniPaginaPreview(availW: number, availH: number) {
  if (availW <= 0 || availH <= 0) {
    return { scale: 0, larghezza: 0, altezza: 0 };
  }
  const scale = Math.min(availW / PDF_TEMPLATE_WIDTH, availH / PDF_PAGE_HEIGHT);
  return {
    scale,
    larghezza: Math.round(PDF_TEMPLATE_WIDTH * scale),
    altezza: Math.round(PDF_PAGE_HEIGHT * scale),
  };
}

export function altezzaPaginaScalata(larghezza: number): number {
  const scale = larghezza / PDF_TEMPLATE_WIDTH;
  return Math.round(PDF_PAGE_HEIGHT * scale);
}

export { PDF_PAGE_HEIGHT, PDF_TEMPLATE_WIDTH };
