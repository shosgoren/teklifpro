import {
  buildGlossaryPrompt,
  DEFAULT_GLOSSARY,
  GlossaryEntry,
} from '@/infrastructure/services/voice/glossary';

describe('Glossary', () => {
  // ── buildGlossaryPrompt ──
  describe('buildGlossaryPrompt', () => {
    it('Tum varsayilan terimleri icermeli', () => {
      const prompt = buildGlossaryPrompt();

      // Her bir varsayilan terim prompt icinde olmali
      for (const entry of DEFAULT_GLOSSARY) {
        expect(prompt).toContain(entry.correct);
      }
    });

    it('Tenant ozel terimleri verildiginde bunlari da icermeli', () => {
      const tenantTerms: GlossaryEntry[] = [
        { spoken: ['ozel vida', 'custom vida'], correct: 'OzelVida-X1', category: 'product' },
        { spoken: ['montaj kiti'], correct: 'Montaj Kiti Pro', category: 'product' },
      ];

      const prompt = buildGlossaryPrompt(DEFAULT_GLOSSARY, tenantTerms);

      expect(prompt).toContain('OzelVida-X1');
      expect(prompt).toContain('Montaj Kiti Pro');
      // Varsayilan terimler de hala olmali
      expect(prompt).toContain('M8');
      expect(prompt).toContain('KDV');
    });

    it('Format "soylenen" -> "dogru" esleme biciminde olmali', () => {
      const prompt = buildGlossaryPrompt();

      // "spoken" / "spoken" -> "correct" formati
      expect(prompt).toContain('\u2192'); // arrow character
      // M8 icin kontrol
      expect(prompt).toMatch(/"m sekiz".*"em sekiz".*\u2192.*"M8"/);
    });
  });

  // ── DEFAULT_GLOSSARY ──
  describe('DEFAULT_GLOSSARY', () => {
    it('Metrik olculer icin girdiler icermeli (M8, M10)', () => {
      const metricEntries = DEFAULT_GLOSSARY.filter(
        (e) => e.category === 'product' && e.correct.startsWith('M'),
      );

      expect(metricEntries.length).toBeGreaterThanOrEqual(2);

      const m8 = DEFAULT_GLOSSARY.find((e) => e.correct === 'M8');
      expect(m8).toBeDefined();
      expect(m8!.spoken).toContain('m sekiz');
      expect(m8!.spoken).toContain('em sekiz');

      const m10 = DEFAULT_GLOSSARY.find((e) => e.correct === 'M10');
      expect(m10).toBeDefined();
      expect(m10!.spoken).toContain('m on');
      expect(m10!.spoken).toContain('em on');
    });

    it('Birimler icin girdiler icermeli (mm, kg, adet)', () => {
      const unitEntries = DEFAULT_GLOSSARY.filter((e) => e.category === 'unit');
      expect(unitEntries.length).toBeGreaterThanOrEqual(3);

      const mm = DEFAULT_GLOSSARY.find((e) => e.correct === 'mm');
      expect(mm).toBeDefined();
      expect(mm!.spoken).toContain('milimetre');

      const kg = DEFAULT_GLOSSARY.find((e) => e.correct === 'kg');
      expect(kg).toBeDefined();
      expect(kg!.spoken).toContain('kilogram');
      expect(kg!.spoken).toContain('kilo');

      const adet = DEFAULT_GLOSSARY.find((e) => e.correct === 'adet');
      expect(adet).toBeDefined();
      expect(adet!.spoken).toContain('adet');
      expect(adet!.spoken).toContain('tane');
    });

    it('Turkce sayi kelimeleri icin girdiler icermeli', () => {
      const numberEntries = DEFAULT_GLOSSARY.filter((e) => e.category === 'number');
      expect(numberEntries.length).toBeGreaterThanOrEqual(3);

      const yuz = DEFAULT_GLOSSARY.find((e) => e.correct === '100');
      expect(yuz).toBeDefined();
      expect(yuz!.spoken).toContain('yuz');

      const bin = DEFAULT_GLOSSARY.find((e) => e.correct === '1000');
      expect(bin).toBeDefined();
      expect(bin!.spoken).toContain('bin');

      const besbin = DEFAULT_GLOSSARY.find((e) => e.correct === '5000');
      expect(besbin).toBeDefined();
    });
  });
});
