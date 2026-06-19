export const ESEMPI_LISTINO: Record<string, string> = {
  videomaker: "Riprese mezza giornata: 400€\nMontaggio video: 300€\nColor grading: 150€\nReel social: 200€",
  fotografo: "Servizio foto evento: 500€\nRitocco foto (set 10): 150€\nBook professionale: 400€\nFoto prodotto: 80€/cad",
  catering: "Menu pranzo (a persona): 35€\nMenu cena (a persona): 50€\nAperitivo: 20€/persona\nAllestimento tavoli: 200€",
  falegname: "Montaggio mobile: 150€\nRiparazione porta: 80€\nPosa parquet (mq): 25€\nProgetto su misura: 500€",
  estetista: "Piega e colore: 80€\nTaglio capelli: 35€\nManicure: 30€\nTrattamento viso: 60€",
  elettricista: "Installazione presa: 80€\nCertificazione impianto: 200€\nIntervento urgente: 120€\nQuadro elettrico: 350€",
  idraulico: "Riparazione perdita: 100€\nSostituzione rubinetto: 80€\nInstallazione caldaia: 500€\nIntervento urgente: 150€",
  imbianchino: "Tinteggiatura stanza (mq): 8€\nPreparazione pareti: 5€/mq\nSmaltimento vernice: 50€\nPosa carta da parati: 15€/mq",
  consulente: "Consulenza oraria: 80€\nProgetto strategico: 1500€\nFormazione (mezza giornata): 400€\nReport analitico: 600€",
  altro: "Servizio base: 100€\nServizio premium: 200€\nConsulenza: 80€/ora\nProgetto completo: 500€",
};

export const UNITA_SERVIZIO = ["cad", "ora", "giorno", "mq", "set", "progetto"] as const;
