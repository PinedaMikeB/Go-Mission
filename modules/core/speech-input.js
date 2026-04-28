/**
 * Go Mission - Speech Input Helper
 * Adds browser-native speech-to-text dictation to focused text fields.
 */

const SpeechInput = {
  activeElement: null,
  previousActiveElement: null,
  dockControls: null,
  dock: null,
  toggleBtn: null,
  cleanBtn: null,
  recognition: null,
  isListening: false,
  manualStopRequested: false,
  shouldKeepListening: false,
  restartTimer: null,
  sessionBeforeText: '',
  sessionAfterText: '',
  finalTranscript: '',
  interimTranscript: '',
  init() {
    if (!this.isSupported()) return;
    this.ensureDock();
    document.addEventListener('focusin', (event) => this.handleFocusIn(event), true);
    document.addEventListener('focusout', () => this.handleFocusOut(), true);
    document.addEventListener('scroll', () => this.positionDock(), true);
    window.addEventListener('resize', () => this.positionDock(), { passive: true });
  },

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  getLabels() {
    const lang = window.i18n?.getLang?.() || localStorage.getItem('goMission_language') || 'tl';
    if (lang === 'en') {
      return {
        ready: 'Tap mic to dictate',
        listening: 'Listening...',
        cleanup: 'Clean up dictation',
        unsupported: 'Speech input not supported on this browser.',
        denied: 'Microphone access was blocked.',
        unavailable: 'Speech could not be recognized.'
      };
    }
    return {
      ready: 'I-tap ang mic para magsalita',
      listening: 'Nakikinig...',
      cleanup: 'Ayusin ang dictation',
      unsupported: 'Hindi suportado ang speech input sa browser na ito.',
      denied: 'Na-block ang microphone access.',
      unavailable: 'Hindi malinaw ang speech input.'
    };
  },

  ensureDock() {
    if (this.dock) return;

    const dock = document.createElement('div');
    dock.id = 'speechInputDock';
    dock.className = 'hidden fixed z-[200]';
    dock.innerHTML = `
      <div id="speechInputDockControls" class="flex items-center gap-2">
        <button id="speechInputCleanBtn" type="button" class="h-11 w-11 rounded-full border border-[var(--card-border)] bg-[var(--card-bg-solid)] text-amber-500 flex items-center justify-center shadow-xl transition-colors hover:bg-amber-500/10" aria-label="Clean up dictation" title="Clean up dictation">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l1.7 3.7L17 8.4l-3 2.9.7 4.1-3.7-2-3.7 2 .7-4.1-3-2.9 3.3-1.7L12 3z"></path>
          </svg>
        </button>
        <button id="speechInputToggleBtn" type="button" class="h-11 w-11 rounded-full border border-amber-500/40 bg-amber-500 text-[#2a0505] flex items-center justify-center shadow-xl transition-colors hover:bg-amber-400" aria-label="Start speech input" title="Start speech input">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18.5a4.5 4.5 0 004.5-4.5V8a4.5 4.5 0 10-9 0v6a4.5 4.5 0 004.5 4.5zm0 0v3m-5-3a8 8 0 0010 0"></path>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(dock);

    this.dock = dock;
    this.dockControls = dock.querySelector('#speechInputDockControls');
    this.cleanBtn = dock.querySelector('#speechInputCleanBtn');
    this.toggleBtn = dock.querySelector('#speechInputToggleBtn');

    if (this.cleanBtn) {
      this.cleanBtn.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
      this.cleanBtn.addEventListener('click', () => {
        this.cleanActiveText();
      });
    }

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
      this.toggleBtn.addEventListener('click', () => {
        this.toggleListening();
      });
    }

    this.updateDockUi();
  },

  handleFocusIn(event) {
    const target = event?.target;
    if (!this.isEligibleTarget(target)) return;

    if (this.isListening && this.activeElement && this.activeElement !== target) {
      this.stopListening(true);
    }

    if (this.previousActiveElement && this.previousActiveElement !== target) {
      this.restoreTargetPadding(this.previousActiveElement);
    }

    this.activeElement = target;
    this.previousActiveElement = target;
    this.reserveSpaceForMic(target);
    this.clearRestartTimer();
    this.showDock();
    this.positionDock();
  },

  handleFocusOut() {
    setTimeout(() => {
      const focused = document.activeElement;
      if (this.isEligibleTarget(focused)) {
        this.activeElement = focused;
        this.previousActiveElement = focused;
        this.reserveSpaceForMic(focused);
        this.showDock();
        this.positionDock();
        return;
      }

      if (!this.isListening) {
        if (this.activeElement) {
          this.restoreTargetPadding(this.activeElement);
        }
        this.shouldKeepListening = false;
        this.clearRestartTimer();
        this.activeElement = null;
        this.hideDock();
      }
    }, 0);
  },

  isEligibleTarget(element) {
    if (!element || element.disabled || element.readOnly) return false;
    if (element.dataset?.speechIgnore === 'true') return false;

    const tag = String(element.tagName || '').toLowerCase();
    const id = String(element.id || '');
    const name = String(element.name || '');
    const type = String(element.type || '').toLowerCase();
    const maxLength = Number(element.maxLength || 0);

    if (/emoji/i.test(id) || /emoji/i.test(name)) return false;
    if (maxLength > 0 && maxLength <= 1) return false;

    if (tag === 'textarea') return true;
    if (tag !== 'input') return false;
    if (!['text', 'search', 'url'].includes(type || 'text')) return false;
    return true;
  },

  showDock() {
    if (!this.dock) return;
    this.dock.classList.remove('hidden');
    this.updateDockUi();
  },

  hideDock() {
    if (!this.dock || this.isListening) return;
    this.dock.classList.add('hidden');
  },

  positionDock() {
    if (!this.dock || this.dock.classList.contains('hidden') || !this.activeElement) return;
    if (!document.body.contains(this.activeElement)) {
      this.hideDock();
      return;
    }

    const rect = this.activeElement.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      this.hideDock();
      return;
    }

    const dockRect = this.dock.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    const dockConfig = this.getDockConfig(this.activeElement);
    const isTallField = rect.height > 54 || String(this.activeElement.tagName || '').toLowerCase() === 'textarea';
    const placeAboveRight = dockConfig.position === 'above-right';
    let top = placeAboveRight
      ? rect.top - dockRect.height - 8
      : (isTallField
        ? rect.bottom - dockRect.height - 8
        : rect.top + ((rect.height - dockRect.height) / 2));
    let left = rect.right - dockRect.width - 8;

    if (left < 12) left = 12;
    if (left + dockRect.width > viewportWidth - 12) {
      left = viewportWidth - dockRect.width - 12;
    }
    if (top + dockRect.height > viewportHeight - 12) {
      top = viewportHeight - dockRect.height - 12;
    }
    if (top < 12) top = 12;

    this.dock.style.left = `${Math.round(left)}px`;
    this.dock.style.top = `${Math.round(top)}px`;
  },

  toggleListening() {
    if (!this.isSupported()) {
      alert(this.getLabels().unsupported);
      return;
    }
    if (!this.activeElement) return;
    if (this.isListening) {
      this.stopListening(true);
      return;
    }
    this.startListening();
  },

  startListening() {
    if (!this.activeElement) return;

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) return;
    this.clearRestartTimer();
    this.shouldKeepListening = true;

    if (!this.recognition) {
      this.recognition = new RecognitionCtor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateDockUi();
      };
      this.recognition.onresult = (event) => {
        this.handleRecognitionResult(event);
      };
      this.recognition.onerror = (event) => {
        const errorCode = String(event?.error || '');
        if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
          this.shouldKeepListening = false;
          alert(this.getLabels().denied);
        } else if (errorCode === 'audio-capture') {
          this.shouldKeepListening = false;
        } else if (errorCode && errorCode !== 'aborted') {
          console.warn('[SpeechInput] Recognition error:', errorCode);
        }
        this.stopListening(false);
      };
      this.recognition.onend = () => {
        this.isListening = false;
        this.interimTranscript = '';
        this.updateDockUi();
        if (this.shouldKeepListening && !this.manualStopRequested && this.activeElement && this.isEligibleTarget(this.activeElement)) {
          this.scheduleRestartListening();
        }
      };
    }

    const value = this.activeElement.value || '';
    const start = typeof this.activeElement.selectionStart === 'number'
      ? this.activeElement.selectionStart
      : value.length;
    const end = typeof this.activeElement.selectionEnd === 'number'
      ? this.activeElement.selectionEnd
      : value.length;

    this.sessionBeforeText = value.slice(0, start);
    this.sessionAfterText = value.slice(end);
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.manualStopRequested = false;
    this.recognition.lang = this.getRecognitionLanguage();

    try {
      this.recognition.start();
    } catch (error) {
      console.warn('[SpeechInput] Could not start recognition:', error);
      this.isListening = false;
      this.updateDockUi();
    }
  },

  stopListening(manual = false) {
    this.manualStopRequested = manual;
    if (manual) {
      this.shouldKeepListening = false;
      this.clearRestartTimer();
    }
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('[SpeechInput] Could not stop recognition:', error);
      }
    } else {
      this.isListening = false;
      this.interimTranscript = '';
      this.updateDockUi();
    }
  },

  scheduleRestartListening() {
    this.clearRestartTimer();
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      if (!this.shouldKeepListening || this.isListening || !this.activeElement || !this.isEligibleTarget(this.activeElement)) return;
      this.startListening();
    }, 250);
  },

  clearRestartTimer() {
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  },

  reserveSpaceForMic(target) {
    if (!target || target.dataset?.speechPaddingApplied === 'true') return;
    const dockConfig = this.getDockConfig(target);
    if (!dockConfig.reserveSpace) return;
    const computed = window.getComputedStyle(target);
    const currentPaddingRight = parseFloat(computed.paddingRight || '0') || 0;
    const extraPadding = dockConfig.hideClean ? 44 : 52;
    target.dataset.speechOriginalPaddingRight = String(currentPaddingRight);
    target.style.paddingRight = `${Math.max(currentPaddingRight, 16) + extraPadding}px`;
    target.dataset.speechPaddingApplied = 'true';
  },

  getDockConfig(target = null) {
    const element = target || this.activeElement;
    const mode = String(element?.dataset?.speechDockMode || '').toLowerCase();
    const compactViewport = !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    return {
      compact: mode === 'compact' || mode === 'minimal' || compactViewport,
      hideClean: mode === 'minimal' || element?.dataset?.speechHideClean === 'true',
      reserveSpace: element?.dataset?.speechReserveSpace !== 'false',
      position: String(element?.dataset?.speechDockPosition || '').toLowerCase()
    };
  },

  restoreTargetPadding(target) {
    if (!target || target.dataset?.speechPaddingApplied !== 'true') return;
    const original = parseFloat(target.dataset.speechOriginalPaddingRight || '');
    if (Number.isFinite(original)) {
      target.style.paddingRight = `${original}px`;
    } else {
      target.style.removeProperty('padding-right');
    }
    delete target.dataset.speechOriginalPaddingRight;
    delete target.dataset.speechPaddingApplied;
  },

  getRecognitionLanguage() {
    const lang = window.i18n?.getLang?.() || localStorage.getItem('goMission_language') || 'tl';
    return lang === 'en' ? 'en-US' : 'fil-PH';
  },

  handleRecognitionResult(event) {
    if (!this.activeElement) return;

    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = String(result?.[0]?.transcript || '').trim();
      if (!transcript) continue;

      if (result.isFinal) {
        this.finalTranscript = this.appendTranscriptSegment(this.finalTranscript, transcript, this.sessionBeforeText);
      } else {
        interim = this.appendTranscriptSegment('', transcript, `${this.sessionBeforeText} ${this.finalTranscript}`.trim());
      }
    }

    this.interimTranscript = interim;
    this.syncTranscriptToField();
  },

  appendTranscriptSegment(current, next, baseline = '') {
    const existing = String(current || '');
    const incoming = String(next || '').trim();
    if (!incoming) return existing;

    const baselineText = String(baseline || '').trim();
    const sourceText = existing || baselineText;
    const overlapWords = this.getSpeechOverlapWordCount(sourceText, incoming);

    if (!existing && overlapWords <= 0) return incoming;

    const incomingWords = incoming.split(/\s+/).filter(Boolean);
    if (overlapWords >= incomingWords.length) {
      return existing;
    }

    const suffixWords = incomingWords.slice(Math.max(0, overlapWords));
    const suffix = suffixWords.join(' ').trim();
    if (!suffix) return existing;
    if (!existing) return suffix;

    const needsSpace = /[A-Za-z0-9)]$/.test(existing) && /^[A-Za-z0-9(]/.test(suffix);
    return `${existing}${needsSpace ? ' ' : ''}${suffix}`;
  },

  getSpeechOverlapWordCount(leftText, rightText) {
    const leftWords = this.normalizeSpeechWords(leftText);
    const rightWords = this.normalizeSpeechWords(rightText);
    if (!leftWords.length || !rightWords.length) return 0;

    const maxOverlap = Math.min(leftWords.length, rightWords.length);
    for (let size = maxOverlap; size > 0; size -= 1) {
      const leftSlice = leftWords.slice(leftWords.length - size).join(' ');
      const rightSlice = rightWords.slice(0, size).join(' ');
      if (leftSlice === rightSlice) return size;
    }
    return 0;
  },

  normalizeSpeechWords(text) {
    return String(text || '')
      .split(/\s+/)
      .map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}@'-]+/gu, ''))
      .filter(Boolean);
  },

  syncTranscriptToField() {
    if (!this.activeElement) return;

    const combined = this.appendTranscriptSegment(this.finalTranscript, this.interimTranscript);
    const nextValue = `${this.sessionBeforeText}${combined}${this.sessionAfterText}`;
    this.activeElement.value = nextValue;

    const caret = this.sessionBeforeText.length + combined.length;
    if (typeof this.activeElement.setSelectionRange === 'function') {
      this.activeElement.setSelectionRange(caret, caret);
    }

    this.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    this.activeElement.focus();
    this.updateDockUi();
  },

  updateDockUi() {
    if (!this.toggleBtn) return;

    const labels = this.getLabels();
    const isLive = this.isListening;
    const dockConfig = this.getDockConfig();
    const sizeClass = dockConfig.compact ? 'h-9 w-9' : 'h-11 w-11';
    const iconClass = dockConfig.compact ? 'w-3.5 h-3.5' : 'w-4 h-4';
    if (this.dockControls) {
      this.dockControls.className = dockConfig.hideClean ? 'flex items-center gap-0' : `flex items-center ${dockConfig.compact ? 'gap-1.5' : 'gap-2'}`;
    }
    this.toggleBtn.className = isLive
      ? `${sizeClass} rounded-full border border-red-400/60 bg-red-500 text-white flex items-center justify-center shadow-xl transition-colors hover:bg-red-400`
      : `${sizeClass} rounded-full border border-amber-500/40 bg-amber-500 text-[#2a0505] flex items-center justify-center shadow-xl transition-colors hover:bg-amber-400`;
    this.toggleBtn.setAttribute('aria-label', isLive ? labels.listening : labels.ready);
    this.toggleBtn.setAttribute('title', isLive ? labels.listening : labels.ready);
    const toggleIcon = this.toggleBtn.querySelector('svg');
    if (toggleIcon) toggleIcon.className = iconClass;

    if (this.cleanBtn) {
      const cleanIcon = this.cleanBtn.querySelector('svg');
      if (cleanIcon) cleanIcon.className = iconClass;
      if (dockConfig.hideClean) {
        this.cleanBtn.classList.add('hidden');
        this.cleanBtn.setAttribute('disabled', 'disabled');
        this.positionDock();
        return;
      }
      this.cleanBtn.classList.remove('hidden');
      const hasValue = !!String(this.activeElement?.value || '').trim();
      this.cleanBtn.setAttribute('title', labels.cleanup);
      this.cleanBtn.setAttribute('aria-label', labels.cleanup);
      this.cleanBtn.className = hasValue
        ? `${sizeClass} rounded-full border border-[var(--card-border)] bg-[var(--card-bg-solid)] text-amber-500 flex items-center justify-center shadow-xl transition-colors hover:bg-amber-500/10`
        : `${sizeClass} rounded-full border border-[var(--card-border)] bg-[var(--card-bg-solid)] text-[var(--text-muted)] flex items-center justify-center shadow-xl opacity-60 cursor-not-allowed`;
      if (hasValue) {
        this.cleanBtn.removeAttribute('disabled');
      } else {
        this.cleanBtn.setAttribute('disabled', 'disabled');
      }
    }
    this.positionDock();
  },

  cleanActiveText() {
    if (!this.activeElement) return;
    const value = String(this.activeElement.value || '');
    if (!value.trim()) return;

    const cleaned = this.cleanUpDictationText(value);
    if (!cleaned || cleaned === value) return;

    this.activeElement.value = cleaned;
    const caret = cleaned.length;
    if (typeof this.activeElement.setSelectionRange === 'function') {
      this.activeElement.setSelectionRange(caret, caret);
    }
    this.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    this.activeElement.focus();
    this.updateDockUi();
  },

  cleanUpDictationText(value) {
    const raw = String(value || '').replace(/\r\n/g, '\n');
    if (!raw.trim()) return '';

    const paragraphChunks = raw
      .split(/\n{2,}/)
      .map((chunk) => this.cleanParagraph(chunk))
      .filter(Boolean);

    return paragraphChunks.join('\n\n');
  },

  cleanParagraph(chunk) {
    let text = String(chunk || '')
      .replace(/\s*\n\s*/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([,.;:!?])([^\s\n])/g, '$1 $2')
      .trim();

    if (!text) return '';

    const sentenceStarters = [
      'how about',
      'what if',
      'can you',
      'could you',
      'would you',
      'please',
      'puwede bang',
      'pwede bang',
      'maaari bang',
      'paano kung',
      'pero',
      'tapos'
    ];

    sentenceStarters.forEach((starter) => {
      const pattern = new RegExp(`([^.!?\\n]{28,})\\s+(${starter})\\b`, 'gi');
      text = text.replace(pattern, (match, before, marker) => {
        const trimmedBefore = String(before || '').trim();
        if (trimmedBefore.length < 28) return `${before} ${marker}`;
        const punctuation = this.looksLikeQuestion(trimmedBefore) ? '?' : '.';
        return `${trimmedBefore}${punctuation} ${marker}`;
      });
    });

    let parts = text
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 1) {
      parts = this.splitLongUnpunctuatedText(parts[0]);
    }

    return parts
      .map((part) => this.finalizeSentence(part))
      .join('\n');
  },

  splitLongUnpunctuatedText(text) {
    const clauses = String(text || '').split(/\s+(?=(?:pero|tapos|how about|can you|puwede bang|pwede bang|maaari bang)\b)/i);
    if (clauses.length <= 1) return [text];
    return clauses.map((item) => item.trim()).filter(Boolean);
  },

  finalizeSentence(text) {
    let sentence = String(text || '').trim();
    if (!sentence) return '';

    if (!/[.!?]$/.test(sentence)) {
      sentence += this.looksLikeQuestion(sentence) ? '?' : '.';
    }

    return sentence.replace(/^([a-zA-Z])/, (match, first) => first.toUpperCase());
  },

  looksLikeQuestion(text) {
    return /\b(can you|could you|would you|how about|what if|puwede bang|pwede bang|maaari bang|paano kung|ok ba|tama ba)\b/i.test(String(text || ''));
  }
};

window.SpeechInput = SpeechInput;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SpeechInput.init());
} else {
  SpeechInput.init();
}
