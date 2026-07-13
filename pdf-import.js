pdfjsLib.GlobalWorkerOptions.workerSrc = "./vendor/pdfjs/pdf.worker.min.js";

const MONTHS = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  março: 3, marco: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fold(value) {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return cleanText(match[1] || match[0]);
  }
  return "";
}

function sentenceContaining(text, pattern) {
  return text
    .split(/\n|(?<=[.;])\s+/)
    .map(cleanText)
    .find((sentence) => pattern.test(sentence)) || "";
}

function isoDate(day, monthText, yearText) {
  const month = MONTHS[fold(monthText).replace(".", "")];
  if (!month) return "";
  const yearNumber = Number(yearText);
  const year = yearNumber < 100 ? 2000 + yearNumber : yearNumber;
  return `${year}-${String(month).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function extractPeriod(text) {
  const folded = fold(text);
  const range = folded.match(/(?:no\s+)?periodo\s+de\s+(\d{1,2})\s+a\s+(\d{1,2})\s+(?:de\s+)?([a-zç.]+)\s+(?:de\s+)?(\d{2,4})|(?:^|\s)de\s+(\d{1,2})\s+a\s+(\d{1,2})\s+(?:de\s+)?([a-zç.]+)\s+(?:de\s+)?(\d{2,4})/i);
  if (range) {
    const values = range.slice(1).filter(Boolean);
    return {
      startDate: isoDate(values[0], values[2], values[3]),
      endDate: isoDate(values[1], values[2], values[3]),
    };
  }
  const fullRange = folded.match(/(\d{1,2})\s+(?:de\s+)?([a-zç.]+)\s+(?:de\s+)?(\d{2,4})\s+a\s+(\d{1,2})\s+(?:de\s+)?([a-zç.]+)\s+(?:de\s+)?(\d{2,4})/i);
  if (fullRange) {
    return {
      startDate: isoDate(fullRange[1], fullRange[2], fullRange[3]),
      endDate: isoDate(fullRange[4], fullRange[5], fullRange[6]),
    };
  }
  return { startDate: "", endDate: "" };
}

function extractSourceDocument(text) {
  return firstMatch(text, [
    /(O\s*FRAG\s*(?:Nr|Nº|No)?\.?\s*\d{2,4}[.\-/]\d{2,4}[^\n]{0,70})/i,
    /(OFRAG\s*(?:Nr|Nº|No)?\.?\s*\d{2,4}[.\-/]\d{2,4}[^\n]{0,70})/i,
  ]);
}

function extractReference(text) {
  const labeled = firstMatch(text, [
    /(?:Rfr\s+(?:da\s+)?miss[aã]o|Rfr\s+Mis|Refer[eê]ncia\s+da\s+miss[aã]o)\s*[:\-]\s*([^\n]+)/i,
  ]);
  if (labeled) return labeled;
  return firstMatch(text, [/(OMA\s*(?:Nr|Nº|No)?\.?\s*\d{2,4}[.\-/]\d{2,4}[^\n]{0,60})/i]);
}

function extractSupportedTroop(text) {
  const labeled = firstMatch(text, [
    /(?:tropa|unidade|organiza[cç][aã]o|[oó]rg[aã]o)\s+apoiad[ao]\s*[:\-]\s*([^\n]+)/i,
    /(?:em\s+apoio\s+(?:ao|à|a))\s+([^\n.;]{5,140})/i,
  ]);
  if (labeled) return labeled;
  return firstMatch(text, [
    /(Centro\s+de\s+Instru[cç][aã]o\s+Paraquedista[^\n.;]{0,120}(?:\([^)]*\))?)/i,
    /([A-ZÀ-Ü][A-Za-zÀ-ÿ\s]+(?:Batalh[aã]o|Regimento|Centro|Brigada|Companhia)[^\n.;]{0,100})/,
  ]);
}

function extractLocation(text) {
  const labeled = firstMatch(text, [
    /(?:local(?:iza[cç][aã]o)?|locais?)\s*[:\-]\s*([^\n]+)/i,
    /(?:nas\s+cidades|nos\s+munic[ií]pios|nas\s+localidades)\s+de\s+([^\n.;]+)/i,
  ]);
  if (labeled) return labeled.replace(/,?\s*(?:no\s+)?per[ií]odo\s+de\s+.*$/i, "").trim();
  const locationSentence = sentenceContaining(text, /\b(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
  return locationSentence
    .replace(/^.*?\bem\s+/i, "")
    .replace(/,?\s*(?:no\s+)?per[ií]odo\s+de\s+.*$/i, "")
    .replace(/[.;]$/, "");
}

function extractAircraft(text) {
  const match = text.match(/(?:empregar|empregar[aá]|emprego\s+de)?\s*0*(\d{1,2})\s+([A-Z]{1,4}\s*-\s*\d{1,2}|[A-Z]{1,4}-\d{1,2})\b/i);
  return {
    aircraftRequired: match ? Number(match[1]) : null,
    aircraftModel: match ? match[2].replace(/\s+/g, "").toUpperCase() : "",
  };
}

function extractFlightHours(text) {
  const match = text.match(/(?:com\s+)?at[eé]\s+(\d+(?:[,.]\d+)?)\s*(HV|HDV)\b|(\d+(?:[,.]\d+)?)\s*(HV|HDV)\b/i);
  return match ? `${match[1] || match[3]} ${(match[2] || match[4]).toUpperCase()}` : "";
}

function extractContact(text) {
  const phoneMatch = text.match(/(?:\+?55\s*)?(\(?\d{2}\)?\s*9?\d{4,5}[-\s]?\d{4})/);
  if (!phoneMatch) return { contactName: "", contactRole: "", contactPhone: "" };
  const phone = cleanText(phoneMatch[1]);
  const beforePhone = text.slice(Math.max(0, phoneMatch.index - 180), phoneMatch.index);
  const contactLine = beforePhone.split("\n").pop().replace(/(?:Celu|Celular|Telefone|Fone|Tel)\s*:?\s*$/i, "").trim();
  const rankMatch = contactLine.match(/\b(Cel|Ten\s*Cel|Maj|Cap|1[ºo]?\s*Ten|2[ºo]?\s*Ten|Ten|Sgt)\s+([A-ZÀ-Ü][A-Za-zÀ-ÿ' -]{2,50})/i);
  const contactName = rankMatch ? cleanText(`${rankMatch[1]} ${rankMatch[2]}`).replace(/\s*[-–]\s*.*$/, "") : "";
  const roleSource = contactLine
    .replace(/^(?:contato\s+com\s+(?:o|a)\s+)/i, "")
    .replace(contactName, "")
    .replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, "");
  return {
    contactName,
    contactRole: cleanText(roleSource),
    contactPhone: phone,
  };
}

function operationDetails(text) {
  const definitions = [
    ["INF", /\bINF\b|infiltra[cç][aã]o\s+Amv/i, "INF - infiltração Amv"],
    ["EXF", /\bEXF\b|exfiltra[cç][aã]o\s+Amv/i, "EXF - exfiltração Amv"],
    ["EVA", /\bEVA(?:EM)?\b|evacua[cç][aã]o\s+aerom[eé]dica/i, "EVA - evacuação aeromédica"],
    ["ALE", /\bALE\b|\balerta\b/i, "ALE - alerta"],
    ["TRL", /\bTRL\b|\btranslado\b/i, "TRL - translado"],
    ["ART", /\bART\b|[aá]rea\s+restrita/i, "ART - área restrita"],
    ["IFR", /\bIFR\b/i, "IFR"],
    ["OVN", /\bOVN\b|[oó]culos\s+de\s+vis[aã]o\s+noturna/i, "OVN"],
    ["PQD", /\bPQD\b|paraquedista|lan[cç]amento\s+de\s+paraquedistas/i, "PQD - atividade paraquedista"],
    ["Tiro", /tiro\s+embarcado/i, "Tiro embarcado"],
  ];
  const details = definitions.filter(([, pattern]) => pattern.test(text)).map(([, , label]) => label);
  const context = sentenceContaining(text, /opera[cç][aã]o|curso|apoio\s+[àa]s?\s+atividades/i);
  if (context) details.unshift(context);
  return [...new Set(details)];
}

function inferRequirements(text) {
  return {
    armament: /bra[cç]o\s+de\s+armamento\s+a[eé]reo/i.test(text),
    winch: /\bguincho\b/i.test(text),
    hook: /\bgancho\b/i.test(text),
    ifr: /\bIFR\b/i.test(text),
    ovn: /\bOVN\b|[oó]culos\s+de\s+vis[aã]o\s+noturna/i.test(text),
    restrictedArea: /\bART\b|[aá]rea\s+restrita/i.test(text),
    medevac: /\bEVA(?:EM)?\b|evacua[cç][aã]o\s+aerom[eé]dica/i.test(text),
    paradrop: /\bPQD\b|paraquedista|lan[cç]amento\s+de\s+paraquedistas/i.test(text),
    aerialShooting: /tiro\s+embarcado/i.test(text),
  };
}

function suggestedName(supportedTroop, reference, details) {
  const acronym = supportedTroop.match(/\(([^)]+)\)/)?.[1] || supportedTroop;
  const oma = reference.match(/OMA\s*[^\s,;]+/i)?.[0] || "";
  const operation = details.join(" ").match(/Op(?:era[cç][aã]o)?\s+([A-ZÀ-Ü][A-Za-zÀ-ÿ\s]+?)(?:\s*\(|,|\.|$)/i)?.[1]?.trim();
  if (acronym && oma) return `Ap ${acronym} - ${oma}`;
  if (acronym && operation) return `${acronym} - Op ${operation}`;
  return oma ? `Missão - ${oma}` : acronym ? `Apoio ${acronym}` : "Missão importada de PDF";
}

function inferFlightType(text) {
  const explicit = text.match(/(?:tipo|regra|regime)\s+de\s+voo\s*[:\-]?\s*(VFR|IFR|OVN)|voo\s+principal\s*[:\-]?\s*(VFR|IFR|OVN)/i);
  return (explicit?.[1] || explicit?.[2] || "VFR").toUpperCase();
}

async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => `${item.str}${item.hasEOL ? "\n" : " "}`).join("");
    pages.push(cleanText(pageText));
  }
  return cleanText(pages.join("\n\n"));
}

function parseOFragMission(rawText) {
  const text = cleanText(rawText);
  const sourceDocument = extractSourceDocument(text);
  const reference = extractReference(text);
  const supportedTroop = extractSupportedTroop(text);
  const airUnitMatches = [...text.matchAll(/\b([1-9])[ªa]\s*EHEG\b/gi)].map((match) => `${match[1]}ª EHEG`);
  const airUnit = airUnitMatches.find((unit) => unit.startsWith("1")) || "";
  const period = extractPeriod(text);
  const aircraft = extractAircraft(text);
  const details = operationDetails(text);
  const contact = extractContact(text);
  const requirements = inferRequirements(text);
  const missingFields = [];
  const result = {
    name: suggestedName(supportedTroop, reference, details),
    sourceDocument,
    reference,
    supportedTroop,
    airUnit,
    location: extractLocation(text),
    ...period,
    flightType: inferFlightType(text),
    ...aircraft,
    flightHoursAvailable: extractFlightHours(text),
    requirements,
    operationDetails: details,
    ...contact,
    notes: "",
    importSource: {
      type: "pdf",
      importedAt: new Date().toISOString(),
      rawTextPreview: text.slice(0, 1200),
    },
    importMeta: {
      hasFirstEheg: !!airUnit,
      otherAirUnits: [...new Set(airUnitMatches.filter((unit) => unit !== "1ª EHEG"))],
      missingFields,
    },
  };
  [
    ["documento de origem", result.sourceDocument],
    ["referência", result.reference],
    ["tropa apoiada", result.supportedTroop],
    ["1ª EHEG", result.airUnit],
    ["período", result.startDate && result.endDate],
    ["localização", result.location],
    ["quantidade de aeronaves", result.aircraftRequired],
    ["modelo de aeronave", result.aircraftModel],
    ["HDV/HV", result.flightHoursAvailable],
    ["contato", result.contactName],
    ["telefone", result.contactPhone],
  ].forEach(([label, value]) => {
    if (!value) missingFields.push(label);
  });
  return result;
}

window.PdfMissionImporter = { extractPdfText, parseOFragMission };
