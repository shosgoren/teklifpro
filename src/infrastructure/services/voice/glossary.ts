/**
 * Technical term glossary for voice-to-text correction.
 * Whisper may transcribe "M8" as "M sekiz" or "Em sekiz".
 * This glossary helps Claude correct these before parsing.
 */

export interface GlossaryEntry {
  /** Possible spoken forms (lowercase) */
  spoken: string[];
  /** Correct written form */
  correct: string;
  /** Category for context */
  category: 'unit' | 'product' | 'number' | 'term';
}

export const DEFAULT_GLOSSARY: GlossaryEntry[] = [
  // ── Metric sizes ──
  { spoken: ['m sekiz', 'em sekiz', 'em 8'], correct: 'M8', category: 'product' },
  { spoken: ['m on', 'em on', 'em 10'], correct: 'M10', category: 'product' },
  { spoken: ['m oniki', 'em oniki', 'em 12'], correct: 'M12', category: 'product' },
  { spoken: ['m alti', 'em alti', 'em 6'], correct: 'M6', category: 'product' },
  { spoken: ['m dort', 'em dort', 'em 4'], correct: 'M4', category: 'product' },
  { spoken: ['m onalti', 'em onalti', 'em 16'], correct: 'M16', category: 'product' },

  // ── Units ──
  { spoken: ['milimetre', 'mm', 'mil'], correct: 'mm', category: 'unit' },
  { spoken: ['santimetre', 'santim', 'cm'], correct: 'cm', category: 'unit' },
  { spoken: ['metre', 'mt'], correct: 'm', category: 'unit' },
  { spoken: ['kilogram', 'kilo', 'kg'], correct: 'kg', category: 'unit' },
  { spoken: ['ton'], correct: 'ton', category: 'unit' },
  { spoken: ['adet', 'tane', 'parca'], correct: 'adet', category: 'unit' },
  { spoken: ['paket', 'kutu'], correct: 'paket', category: 'unit' },
  { spoken: ['metre kare', 'metrekare'], correct: 'm²', category: 'unit' },

  // ── Turkish number words ──
  { spoken: ['yuz', 'yüz'], correct: '100', category: 'number' },
  { spoken: ['ikiyuz', 'iki yüz'], correct: '200', category: 'number' },
  { spoken: ['besyuz', 'beş yüz'], correct: '500', category: 'number' },
  { spoken: ['bin'], correct: '1000', category: 'number' },
  { spoken: ['ikibin', 'iki bin'], correct: '2000', category: 'number' },
  { spoken: ['besbin', 'beş bin'], correct: '5000', category: 'number' },
  { spoken: ['onbin', 'on bin'], correct: '10000', category: 'number' },

  // ── Common terms ──
  { spoken: ['kdv', 'ka de ve', 'katma deger vergisi'], correct: 'KDV', category: 'term' },
  { spoken: ['iskonto', 'indirim'], correct: 'iskonto', category: 'term' },
  { spoken: ['vade', 'vadeli'], correct: 'vadeli', category: 'term' },
  { spoken: ['pesin', 'peşin'], correct: 'peşin', category: 'term' },
  { spoken: ['tl', 'türk lirası', 'lira'], correct: 'TL', category: 'term' },
];

/**
 * Build glossary context string for Claude prompt injection
 */
export function buildGlossaryPrompt(
  glossary: GlossaryEntry[] = DEFAULT_GLOSSARY,
  tenantTerms?: GlossaryEntry[],
): string {
  const allTerms = [...glossary, ...(tenantTerms || [])];

  const lines = allTerms.map(
    (entry) => `- "${entry.spoken.join('" / "')}" → "${entry.correct}"`
  );

  return `Teknik Terim Sözlüğü (ses tanıma düzeltmeleri):
${lines.join('\n')}

Bu sözlüğü kullanarak ses dökümündeki teknik terimleri düzelt.`;
}
