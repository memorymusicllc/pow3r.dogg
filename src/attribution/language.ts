/**
 * Language/Dialect Profiling
 * 
 * Analyzes language patterns to identify fraud ring origin with 96% accuracy target:
 * - NLP analysis for language patterns and regional dialects
 * - Writing style fingerprinting
 * - Translation detection
 * - Cultural context analysis
 * - Fraud ring origin prediction
 */

export interface LanguageProfile {
  primaryLanguage: string;
  confidence: number;
  dialects: string[];
  writingStyle: WritingStyle;
  translationIndicators: TranslationIndicator[];
  culturalMarkers: CulturalMarker[];
  originPrediction: OriginPrediction;
}

export interface WritingStyle {
  grammarScore: number;
  punctuationPattern: string;
  wordChoice: {
    commonWords: string[];
    rareWords: string[];
    averageWordLength: number;
  };
  sentenceStructure: {
    averageLength: number;
    complexity: number;
    questionFrequency: number;
  };
  emojiUsage: {
    frequency: number;
    types: string[];
    patterns: string;
  };
}

export interface TranslationIndicator {
  type: 'machine' | 'human' | 'mixed';
  confidence: number;
  evidence: string[];
}

export interface CulturalMarker {
  type: 'greeting' | 'formality' | 'number_format' | 'date_format' | 'currency';
  value: string;
  region: string;
  confidence: number;
}

export interface OriginPrediction {
  region: string;
  country?: string;
  confidence: number;
  factors: string[];
}

export class LanguageProfiler {
  /**
   * Analyze text and generate language profile
   */
  async analyzeText(text: string): Promise<LanguageProfile> {
    const primaryLanguage = this.detectLanguage(text);
    const writingStyle = this.analyzeWritingStyle(text);
    const translationIndicators = this.detectTranslation(text);
    const culturalMarkers = this.extractCulturalMarkers(text);
    const originPrediction = this.predictOrigin(writingStyle, culturalMarkers, translationIndicators);

    return {
      primaryLanguage: primaryLanguage.language,
      confidence: primaryLanguage.confidence,
      dialects: this.detectDialects(text, primaryLanguage.language),
      writingStyle,
      translationIndicators,
      culturalMarkers,
      originPrediction,
    };
  }

  /**
   * Detect primary language
   */
  private detectLanguage(text: string): { language: string; confidence: number } {
    // Simplified language detection
    // In production, use a proper language detection library
    
    const patterns: Record<string, RegExp[]> = {
      en: [/the\s+/gi, /and\s+/gi, /is\s+/gi, /to\s+/gi],
      es: [/el\s+/gi, /la\s+/gi, /de\s+/gi, /que\s+/gi],
      fr: [/le\s+/gi, /de\s+/gi, /et\s+/gi, /à\s+/gi],
      de: [/der\s+/gi, /die\s+/gi, /und\s+/gi, /ist\s+/gi],
      ru: [/[а-яё]/gi],
      ar: [/[ا-ي]/g],
      zh: [/[\u4e00-\u9fff]/g],
    };

    let maxMatches = 0;
    let detectedLang = 'en';
    let confidence = 0.5;

    for (const [lang, regexes] of Object.entries(patterns)) {
      let matches = 0;
      for (const regex of regexes) {
        matches += (text.match(regex) || []).length;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLang = lang;
        confidence = Math.min(matches / (text.length / 10), 0.95);
      }
    }

    return { language: detectedLang, confidence };
  }

  /**
   * Detect regional dialects
   */
  private detectDialects(text: string, language: string): string[] {
    const dialects: string[] = [];

    // Simplified dialect detection based on common markers
    if (language === 'en') {
      if (text.match(/\bcolour\b|\bfavour\b|\brealise\b/gi)) {
        dialects.push('british');
      }
      if (text.match(/\by'all\b|\bfixin'\b/gi)) {
        dialects.push('southern_us');
      }
    }

    if (language === 'es') {
      if (text.match(/\bvos\b|\bvoseo\b/gi)) {
        dialects.push('rioplatense');
      }
      if (text.match(/\bvale\b|\btío\b/gi)) {
        dialects.push('spain');
      }
    }

    return dialects;
  }

  /**
   * Analyze writing style
   */
  private analyzeWritingStyle(text: string): WritingStyle {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const emojis = text.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];

    // Grammar score (simplified - would use NLP in production)
    const grammarScore = this.calculateGrammarScore(text);

    // Punctuation pattern
    const punctuationPattern = this.analyzePunctuation(text);

    // Word choice analysis
    const wordLengths = words.map((w) => w.replace(/[^\w]/g, '').length);
    const averageWordLength = wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length;
    const commonWords = this.getCommonWords(words);
    const rareWords = this.getRareWords(words);

    // Sentence structure
    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
    const averageLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const complexity = this.calculateComplexity(sentences);
    const questionFrequency = (text.match(/\?/g) || []).length / sentences.length;

    // Emoji usage
    const emojiFrequency = emojis.length / words.length;
    const emojiTypes = [...new Set(emojis)];

    return {
      grammarScore,
      punctuationPattern,
      wordChoice: {
        commonWords,
        rareWords,
        averageWordLength,
      },
      sentenceStructure: {
        averageLength,
        complexity,
        questionFrequency,
      },
      emojiUsage: {
        frequency: emojiFrequency,
        types: emojiTypes,
        patterns: this.analyzeEmojiPatterns(emojis),
      },
    };
  }

  /**
   * Detect translation indicators
   */
  private detectTranslation(text: string): TranslationIndicator[] {
    const indicators: TranslationIndicator[] = [];

    // Check for machine translation patterns
    const machinePatterns = [
      /^\s*[A-Z][^.!?]*$/gm, // All caps sentences
      /[.!?]\s*[a-z]/g, // Missing capitalization after punctuation
      /\b(?:the the|a a|an an)\b/gi, // Repeated articles
    ];

    let machineScore = 0;
    for (const pattern of machinePatterns) {
      if (pattern.test(text)) {
        machineScore += 0.3;
      }
    }

    if (machineScore > 0.5) {
      indicators.push({
        type: 'machine',
        confidence: machineScore,
        evidence: ['Repetitive patterns', 'Capitalization errors', 'Article duplication'],
      });
    }

    // Check for human translation (more natural flow)
    const naturalFlow = this.checkNaturalFlow(text);
    if (naturalFlow > 0.7 && machineScore < 0.3) {
      indicators.push({
        type: 'human',
        confidence: naturalFlow,
        evidence: ['Natural sentence flow', 'Contextual word choice'],
      });
    }

    return indicators;
  }

  /**
   * Extract cultural markers
   */
  private extractCulturalMarkers(text: string): CulturalMarker[] {
    const markers: CulturalMarker[] = [];

    // Greeting patterns
    const greetings: Record<string, string[]> = {
      'US': ['hi', 'hello', 'hey'],
      'UK': ['hi', 'hello', 'cheers'],
      'Nigeria': ['hello', 'how are you', 'good morning'],
      'India': ['namaste', 'hello', 'hi'],
    };

    for (const [region, patterns] of Object.entries(greetings)) {
      for (const pattern of patterns) {
        if (text.toLowerCase().includes(pattern)) {
          markers.push({
            type: 'greeting',
            value: pattern,
            region,
            confidence: 0.6,
          });
        }
      }
    }

    // Number format (e.g., 1,000.00 vs 1.000,00)
    if (text.match(/\d{1,3}(,\d{3})*(\.\d+)?/)) {
      markers.push({
        type: 'number_format',
        value: 'US',
        region: 'US',
        confidence: 0.7,
      });
    } else if (text.match(/\d{1,3}(\.\d{3})*(,\d+)?/)) {
      markers.push({
        type: 'number_format',
        value: 'EU',
        region: 'EU',
        confidence: 0.7,
      });
    }

    // Date format
    if (text.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
      markers.push({
        type: 'date_format',
        value: 'US',
        region: 'US',
        confidence: 0.6,
      });
    } else if (text.match(/\d{1,2}\.\d{1,2}\.\d{4}/)) {
      markers.push({
        type: 'date_format',
        value: 'EU',
        region: 'EU',
        confidence: 0.6,
      });
    }

    return markers;
  }

  /**
   * Predict fraud ring origin
   */
  private predictOrigin(
    style: WritingStyle,
    markers: CulturalMarker[],
    translation: TranslationIndicator[]
  ): OriginPrediction {
    const factors: string[] = [];
    let region = 'unknown';
    let country: string | undefined;
    let confidence = 0.5;

    // Analyze cultural markers
    const regionCounts: Record<string, number> = {};
    for (const marker of markers) {
      regionCounts[marker.region] = (regionCounts[marker.region] || 0) + 1;
      factors.push(`${marker.type}: ${marker.region}`);
    }

    const mostCommonRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonRegion) {
      region = mostCommonRegion[0];
      confidence = Math.min(mostCommonRegion[1] * 0.2, 0.9);
    }

    // Translation indicators can suggest origin
    if (translation.some((t) => t.type === 'machine')) {
      factors.push('Machine translation detected - may indicate non-native speaker');
      confidence *= 0.8;
    }

    // Writing style patterns
    if (style.grammarScore < 0.6) {
      factors.push('Low grammar score - possible non-native speaker');
    }

    // Dialect-specific predictions
    if (style.emojiUsage.frequency > 0.1) {
      factors.push('High emoji usage - common in certain regions');
    }

    return {
      region,
      country,
      confidence: Math.min(confidence, 0.96), // Target 96% max
      factors,
    };
  }

  // Helper methods
  private calculateGrammarScore(text: string): number {
    // Simplified - would use proper NLP in production
    const errors = (text.match(/\b(?:is are|was were|has have)\b/gi) || []).length;
    const sentences = text.split(/[.!?]+/).length;
    return Math.max(0, 1 - errors / Math.max(sentences, 1));
  }

  private analyzePunctuation(text: string): string {
    const punctCounts: Record<string, number> = {};
    const punct = text.match(/[.,!?;:]/g) || [];
    for (const p of punct) {
      punctCounts[p] = (punctCounts[p] || 0) + 1;
    }
    return Object.entries(punctCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p)
      .join('');
  }

  private getCommonWords(words: string[]): string[] {
    const counts: Record<string, number> = {};
    for (const word of words) {
      const w = word.toLowerCase().replace(/[^\w]/g, '');
      if (w.length > 2) {
        counts[w] = (counts[w] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w);
  }

  private getRareWords(words: string[]): string[] {
    const counts: Record<string, number> = {};
    for (const word of words) {
      const w = word.toLowerCase().replace(/[^\w]/g, '');
      if (w.length > 5) {
        counts[w] = (counts[w] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .filter(([, count]) => count === 1)
      .slice(0, 10)
      .map(([w]) => w);
  }

  private calculateComplexity(sentences: string[]): number {
    // Simplified complexity metric
    const avgWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    const clauses = sentences.reduce((sum, s) => sum + (s.match(/,|;|:/g) || []).length, 0);
    return Math.min((avgWords / 10) * (1 + clauses / sentences.length), 1.0);
  }

  private analyzeEmojiPatterns(emojis: string[]): string {
    if (emojis.length === 0) return 'none';
    const patterns = emojis.join('').substring(0, 50);
    return patterns.length > 0 ? patterns : 'none';
  }

  private checkNaturalFlow(text: string): number {
    // Simplified natural flow check
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 2) return 0.5;

    let flowScore = 0.5;
    // Check for transition words
    const transitions = ['however', 'therefore', 'furthermore', 'moreover', 'additionally'];
    for (const trans of transitions) {
      if (text.toLowerCase().includes(trans)) {
        flowScore += 0.1;
      }
    }

    return Math.min(flowScore, 1.0);
  }
}

