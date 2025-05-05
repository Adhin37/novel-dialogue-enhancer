// dialogueUtils.js - Advanced dialogue pattern handling functions for Novel Dialogue Enhancer
class DialogueUtils {
  constructor() {
    console.log("Novel Dialogue Enhancer: Dialogue Utils initialized");
  }

  /**
   * Advanced dialogue pattern detection and correction
   * @param {string} text - The text to process
   * @return {string} - The processed text with improved dialogue patterns
   */
  fixDialoguePatterns(text) {
    // Store original text to compare effectiveness
    const originalText = text;

    // Normalize quotation marks first
    text = this.normalizeQuotes(text);

    // Create a copy to apply changes incrementally and check each step
    let processedText = text;

    // 1. Fix dialogue attribution patterns
    const attributionFixed = this.fixDialogueAttribution(processedText);
    if (attributionFixed.length >= processedText.length * 0.95) {
      processedText = attributionFixed;
    }

    // 2. Fix awkward narrative expressions
    const narrativeFixed = this.fixNarrativeExpressions(processedText);
    if (narrativeFixed.length >= processedText.length * 0.95) {
      processedText = narrativeFixed;
    }

    // 3. Fix cultural idioms that are often mistranslated
    const idiomsFixed = this.fixCulturalIdioms(processedText);
    if (idiomsFixed.length >= processedText.length * 0.95) {
      processedText = idiomsFixed;
    }

    // 4. Fix overly formal or stiff language in dialogue
    const formalityFixed = this.relaxDialogueFormality(processedText);
    if (formalityFixed.length >= processedText.length * 0.95) {
      processedText = formalityFixed;
    }

    // 5. Fix punctuation spacing and format
    const punctuationFixed = this.fixPunctuation(processedText);
    if (punctuationFixed.length >= processedText.length * 0.95) {
      processedText = punctuationFixed;
    }

    // Return original text if we somehow made it worse (significantly shorter)
    if (processedText.length < originalText.length * 0.9) {
      console.warn("DialogueUtils: Significant text reduction detected. Reverting changes.");
      return originalText;
    }

    return processedText;
  }

  /**
   * Normalize different types of quotation marks
   */
  normalizeQuotes(text) {
    // Convert various quote types to standard double quotes
    text = text.replace(/[""]/g, '"');
    text = text.replace(/['']/g, "'");

    // Ensure quotes are properly paired
    let quoteCount = (text.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // If we have unpaired quotes, try to fix obvious cases
      text = text.replace(/"([^"]*[.!?])\s+([A-Z])/g, '"$1" $2');
    }

    return text;
  }

  /**
   * Fix dialogue attribution patterns
   */
  fixDialogueAttribution(text) {
    // Fix "Text," Character said pattern
    text = text.replace(/"([^"]+),"\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*said/g,
      (match, dialogue, name) => `"${dialogue}," said ${name}`);

    // Fix reversed dialogue attribution (more natural in English)
    text = text.replace(/"([^"]+)"\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*said/g,
      (match, dialogue, name) => {
        // If dialogue ends with punctuation other than comma, adjust format
        if (dialogue.match(/[.!?]$/)) {
          return `"${dialogue}" said ${name}`;
        } else {
          return `"${dialogue}," said ${name}`;
        }
      });

    // Fix dialogue with adverbs
    text = text.replace(/"([^"]+)"\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*said\s+([a-z]+ly)/g,
      (match, dialogue, name, adverb) => `"${dialogue}" said ${name} ${adverb}`);

    // Fix common Chinese/Korean/Japanese attribution patterns
    text = text.replace(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*:\s*"([^"]+)"/g,
      (match, name, dialogue) => `"${dialogue}," said ${name}`);

    // Fix direct speech without quotation marks but with colons
    text = text.replace(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*:\s*([A-Z][^.!?]+[.!?])/g,
      (match, name, speech) => `"${speech}" said ${name}`);

    return text;
  }

  /**
   * Fix awkward narrative expressions often found in translations
   */
  fixNarrativeExpressions(text) {
    // Fix mechanical descriptions of emotions
    const emotionPatterns = [
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+could not help but frown/g, to: '$1 frowned involuntarily' },
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+revealed a smile/g, to: '$1 smiled' },
      {
        from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+showed an? (angry|happy|sad|worried) expression/g, to: (m, name, emotion) => {
          switch (emotion) {
            case 'angry': return `${name} looked angry`;
            case 'happy': return `${name} looked pleased`;
            case 'sad': return `${name} looked downcast`;
            case 'worried': return `${name} looked concerned`;
            default: return m;
          }
        }
      },
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+had an? ([a-z]+) look on (?:his|her) face/g, to: '$1 looked $2' },
      {
        from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+let out an? ([a-z]+) breath/g, to: (m, name, type) => {
          switch (type) {
            case 'cold': return `${name} exhaled coldly`;
            case 'long': return `${name} sighed deeply`;
            case 'helpless': return `${name} sighed helplessly`;
            default: return `${name} let out a ${type} breath`;
          }
        }
      }
    ];

    // Apply all emotion patterns
    emotionPatterns.forEach(pattern => {
      text = text.replace(pattern.from, pattern.to);
    });

    // Fix awkward physical action descriptions
    const actionPatterns = [
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+waved (?:his|her) hand/g, to: '$1 waved dismissively' },
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+nodded (?:his|her) head/g, to: '$1 nodded' },
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+shook (?:his|her) head/g, to: '$1 shook their head' },
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+knitted (?:his|her) brows/g, to: '$1 frowned' },
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+wrinkled (?:his|her) nose/g, to: '$1 wrinkled their nose' },
      { from: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+went silent/g, to: '$1 fell silent' }
    ];

    // Apply all action patterns
    actionPatterns.forEach(pattern => {
      text = text.replace(pattern.from, pattern.to);
    });

    return text;
  }

  /**
   * Fix common cultural idioms that get literally translated
   */
  fixCulturalIdioms(text) {
    // Common Chinese/Korean/Japanese idioms literally translated
    const idiomPatterns = [
      { from: /seeking death/gi, to: 'asking for trouble' },
      { from: /have eyes but fail to see Mt\. Tai/gi, to: 'fail to recognize greatness' },
      { from: /lose face/gi, to: 'be embarrassed' },
      { from: /give face/gi, to: 'show respect' },
      { from: /save face/gi, to: 'preserve dignity' },
      { from: /doesn't know the height of heaven and the depth of earth/gi, to: 'has no sense of propriety' },
      { from: /heavens and earth/gi, to: 'universe' },
      { from: /heaven's will/gi, to: 'fate' },
      { from: /doesn't know whether to laugh or cry/gi, to: 'was speechless' },
      { from: /wearing a different pair of trousers/gi, to: 'playing for a different team' },
      { from: /the eagle doesn't prey on the chick/gi, to: 'I won\'t bully someone weaker' },
      { from: /smash the pot and sink the boat/gi, to: 'burn all bridges' },
      { from: /turn over the sky/gi, to: 'cause chaos' },
      { from: /how can there be such a person/gi, to: 'how can someone be like this' },
      { from: /eat vinegar/gi, to: 'be jealous' },
      { from: /give color/gi, to: 'flirt' },
      { from: /not know good from bad/gi, to: 'lack judgment' },
      // Additional East Asian idioms and expressions
      { from: /eyes open as wide as bells/gi, to: 'eyes wide with surprise' },
      { from: /eyes spewing fire/gi, to: 'glaring angrily' },
      { from: /climbing a tree to catch fish/gi, to: 'using the wrong approach' },
      { from: /drawing a snake and adding legs/gi, to: 'ruining something by overdoing it' },
      { from: /a frog at the bottom of a well/gi, to: 'someone with a limited perspective' },
      { from: /covering ears to steal a bell/gi, to: 'fooling oneself' },
      { from: /after the lips are gone, the teeth are cold/gi, to: 'realizing the value of something after it\'s gone' },
      { from: /pulling chestnuts out of the fire/gi, to: 'doing the dirty work for someone else' },
      { from: /playing the lute to a cow/gi, to: 'wasting effort on someone who doesn\'t appreciate it' },
      { from: /the winds and clouds are changing/gi, to: 'the situation is changing rapidly' },
      { from: /looking at flowers from horseback/gi, to: 'taking only a superficial look' },
      { from: /beating the grass to startle the snake/gi, to: 'showing one\'s hand prematurely' },
      { from: /hanging sheep's head but selling dog meat/gi, to: 'false advertising' },
      { from: /old woman losing her only son/gi, to: 'extremely distressed' },
      { from: /breaking the wok and sinking the boat/gi, to: 'burning one\'s bridges' },
      { from: /chicken feathers and garlic skin/gi, to: 'trivial matters' },
      { from: /treating a headache by foot massage/gi, to: 'treating symptoms instead of the cause' },
      { from: /draw a tiger but resemble a dog/gi, to: 'poor imitation' },
      { from: /a stone from another mountain/gi, to: 'outside perspective' },
      { from: /borrowing a knife to kill someone/gi, to: 'using someone else to do your dirty work' },
      { from: /three days without being whipped, no good can come/gi, to: 'needs strict supervision' },
      { from: /standing on tiptoes and looking into the distance/gi, to: 'eagerly anticipating' },
      { from: /carving insects on the beams/gi, to: 'excessive attention to detail' },
      { from: /tying a bell to a tiger/gi, to: 'dangerous task' }
    ];

    // Apply all idiom patterns
    idiomPatterns.forEach(pattern => {
      text = text.replace(pattern.from, pattern.to);
    });

    return text;
  }

  /**
   * Fix overly formal dialogue to be more natural sounding
   */
  relaxDialogueFormality(text) {
    // Only modify text within quotation marks
    return text.replace(/"([^"]+)"/g, (match, dialogue) => {
      // Apply contractions for more natural speech
      dialogue = dialogue
        .replace(/\bI am\b/g, "I'm")
        .replace(/\byou are\b/g, "you're")
        .replace(/\bhe is\b/g, "he's")
        .replace(/\bshe is\b/g, "she's")
        .replace(/\bit is\b/g, "it's")
        .replace(/\bwe are\b/g, "we're")
        .replace(/\bthey are\b/g, "they're")
        .replace(/\bcannot\b/g, "can't")
        .replace(/\bdo not\b/g, "don't")
        .replace(/\bdoes not\b/g, "doesn't")
        .replace(/\bwill not\b/g, "won't")
        .replace(/\bshould not\b/g, "shouldn't")
        .replace(/\bcould not\b/g, "couldn't")
        .replace(/\bwould not\b/g, "wouldn't");

      // Fix very formal sentence structures but only in dialogue
      dialogue = dialogue
        .replace(/\bin accordance with\b/g, "according to")
        .replace(/\butilize\b/g, "use")
        .replace(/\bobtain\b/g, "get")
        .replace(/\brequire\b/g, "need")
        .replace(/\bpurchase\b/g, "buy")
        .replace(/\bassist\b/g, "help");

      return `"${dialogue}"`;
    });
  }

  /**
   * Fix punctuation issues
   */
  fixPunctuation(text) {
    // Fix spacing around punctuation
    text = text
      .replace(/\s+([.,!?;:])/g, '$1')
      .replace(/([.,!?;:])(\w)/g, '$1 $2');

    // Fix multiple punctuation
    text = text
      .replace(/!{2,}/g, '!')
      .replace(/\?{2,}/g, '?')
      .replace(/\.{2,}/g, '...');

    // Fix space after paragraph breaks
    text = text.replace(/\n(\w)/g, '\n$1');

    return text;
  }

  /**
   * Enhanced dialogue improvement
   * @param {string} dialogue - The dialogue text to enhance
   * @return {string} - The enhanced dialogue
   */
  enhanceDialogue(dialogue) {
    // Remove unnecessary particles often seen in translations
    dialogue = this.removeUnnecessaryParticles(dialogue);

    // Make questions more natural
    dialogue = this.improveQuestions(dialogue);

    // Improve exclamations and strong expressions
    dialogue = this.improveExclamations(dialogue);

    // Fix awkward address forms
    dialogue = this.fixAddressForms(dialogue);

    // Fix common translation errors in dialogue
    dialogue = this.fixCommonTranslationErrors(dialogue);

    // Add natural filler words where appropriate
    dialogue = this.addNaturalFillers(dialogue);

    return dialogue;
  }

  /**
   * Remove unnecessary particles often found in translated dialogue
   */
  removeUnnecessaryParticles(dialogue) {
    return dialogue
      // Remove excessive "ah" and "oh" particles
      .replace(/\b(Ah|Oh),\s+/gi, '')
      // Remove phrases like "that is to say"
      .replace(/\bthat is to say\b/gi, '')
      // Remove redundant particles
      .replace(/\s+(ne|yo|na|wa)\b/gi, '')
      // Remove common Chinese/Korean/Japanese sentence endings
      .replace(/\s+(aru|desu|nida|imnida)\b/gi, '');
  }

  /**
   * Improve question formats to be more natural
   */
  improveQuestions(dialogue) {
    // Replace "is it not" formats with natural English questions
    dialogue = dialogue
      .replace(/is it not\?/gi, "isn't it?")
      .replace(/are you not\?/gi, "aren't you?")
      .replace(/did you not\?/gi, "didn't you?")
      .replace(/could you not\?/gi, "couldn't you?")
      .replace(/would you not\?/gi, "wouldn't you?");

    // Fix awkward question patterns
    dialogue = dialogue
      .replace(/what kind of matter is this\?/gi, "what's going on?")
      .replace(/for what reason\?/gi, "why?")
      .replace(/to where are you going\?/gi, "where are you going?")
      .replace(/how could it be like this\?/gi, "how could this happen?");

    return dialogue;
  }

  /**
   * Improve exclamations and strong expressions
   */
  improveExclamations(dialogue) {
    // Common translated exclamations
    dialogue = dialogue
      .replace(/impossible!/gi, (match) => {
        // Varied responses based on context
        const options = ["No way!", "That can't be!", "Impossible!", "That's impossible!"];
        return options[Math.floor(Math.random() * options.length)];
      })
      .replace(/how audacious!/gi, "How dare you!")
      .replace(/the heavens!/gi, "Good heavens!")
      .replace(/this is outrageous!/gi, (match) => {
        const options = ["This is outrageous!", "That's ridiculous!", "This is absurd!"];
        return options[Math.floor(Math.random() * options.length)];
      });

    return dialogue;
  }

  /**
   * Fix awkward address forms
   */
  fixAddressForms(dialogue) {
    // Fix titles and honorifics
    dialogue = dialogue
      .replace(/\b(senior|junior) (brother|sister)\b/gi, (match, rank, relation) => {
        if (relation.toLowerCase() === 'brother') {
          return rank.toLowerCase() === 'senior' ? 'big brother' : 'little brother';
        } else {
          return rank.toLowerCase() === 'senior' ? 'big sister' : 'little sister';
        }
      })
      .replace(/\bthis (young master|master|lady|lord|prince|princess)\b/gi, (match, title) => {
        return `I`;  // Replace awkward self-references
      })
      .replace(/\bthis one\b/gi, "I")
      .replace(/\bmy husband\b/gi, (match) => {
        // More natural ways spouses might address each other
        const options = ["honey", "dear", "darling", "my love"];
        return options[Math.floor(Math.random() * options.length)];
      })
      .replace(/\bmy wife\b/gi, (match) => {
        const options = ["honey", "dear", "darling", "my love"];
        return options[Math.floor(Math.random() * options.length)];
      });

    return dialogue;
  }

  /**
   * Fix common translation errors in dialogue
   */
  fixCommonTranslationErrors(dialogue) {
    dialogue = dialogue
      // Fix common word choice errors
      .replace(/\bdo the deed\b/gi, "do it")
      .replace(/\bnot small\b/gi, "significant")
      .replace(/\bnot little\b/gi, "quite a lot")
      .replace(/\bjust now\b/gi, "a moment ago")
      .replace(/\bin a moment\b/gi, "soon")
      .replace(/\bin the end\b/gi, "eventually")
      .replace(/\bat that time\b/gi, "then")
      .replace(/\bat this time\b/gi, "now")
      .replace(/\bdifferent from the past\b/gi, "unlike before")
      .replace(/\bincessantly\b/gi, "constantly")
      // Fix literal number expressions
      .replace(/\bone or two\b/gi, "a few")
      .replace(/\btwo or three\b/gi, "several")
      .replace(/\bten thousand\b/gi, "countless")
      .replace(/\ba hundred times\b/gi, "many times")
      // Fix awkward verbs
      .replace(/\bspeak nonsense\b/gi, "talk nonsense")
      .replace(/\bmake a move\b/gi, "act")
      .replace(/\bmake preparation\b/gi, "prepare")
      .replace(/\bgive birth to heartfelt admiration\b/gi, "genuinely admire");

    return dialogue;
  }

  /**
   * Add natural filler words where appropriate to make dialogue sound more natural
   */
  addNaturalFillers(dialogue) {
    // Don't add fillers to very short dialogue
    if (dialogue.length < 15) return dialogue;

    // Detect good places for fillers and occasionally add them
    if (Math.random() < 0.3) {
      dialogue = dialogue
        // Add fillers at the beginning of sentences
        .replace(/^([A-Z][^,!?.]*)([.,!?])/, (match, sentence, punctuation) => {
          if (Math.random() < 0.5) {
            const starters = ["Well, ", "Look, ", "Listen, ", "You know, ", "Honestly, "];
            return starters[Math.floor(Math.random() * starters.length)] +
              sentence.charAt(0).toLowerCase() + sentence.slice(1) + punctuation;
          }
          return match;
        })
        // Add emphasis words
        .replace(/\b(very|extremely|absolutely|really)\b/gi, (match) => {
          if (Math.random() < 0.3) {
            const emphasisOptions = ["really", "seriously", "truly", "absolutely"];
            return emphasisOptions[Math.floor(Math.random() * emphasisOptions.length)];
          }
          return match;
        });
    }

    return dialogue;
  }
}

// Export for use in content or background scripts
if (typeof module !== 'undefined') {
  module.exports = DialogueUtils;
} else {
  window.dialogueUtils = DialogueUtils;
}