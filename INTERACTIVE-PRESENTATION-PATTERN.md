# Interactive Presentation Pattern

> 🎬 Reusable pattern for creating engaging, animated, question-based presentations
> Used in: Gospel Presentation, future Training Modules, Discipleship content

## Overview

This pattern creates immersive, mobile-first presentations with:
- Smooth slide transitions
- Staggered element animations
- Question-based learning with feedback
- Decision points with branching paths
- Firebase tracking for analytics

---

## Architecture

```
/modules/{feature}/
  └── {feature}-presentation.js   # Main module
/assets/images/{feature}/
  └── *.jpg                       # Supporting images
```

## Module Structure

```javascript
const FeaturePresentation = {
    currentSlide: 0,
    totalSlides: 0,
    slides: [],
    
    open() { /* Initialize and show modal */ },
    close() { /* Hide modal */ },
    injectStyles() { /* Add CSS animations */ },
    buildSlides() { /* Define all slides */ },
    createModal() { /* Create DOM structure */ },
    showSlide(index) { /* Render specific slide */ },
    renderNewSlide(index) { /* Handle slide types */ },
    next() { /* Go to next slide */ },
    prev() { /* Go to previous slide */ },
    
    // Custom handlers
    answerQuestion(index, isCorrect) { /* Handle Q&A */ },
    handleDecision(choice) { /* Handle branching */ },
    complete() { /* Finish and save */ }
};

window.FeaturePresentation = FeaturePresentation;
```

---

## Slide Types

### 1. `intro` - Welcome slide
```javascript
{
    type: 'intro',
    render: () => `
        <div class="text-center flex flex-col justify-center h-full">
            <div class="gospel-bounce text-6xl mb-4">❤️</div>
            <h1 class="gospel-fade-up delay-2 text-2xl font-bold">Title</h1>
            <p class="gospel-fade-up delay-3 text-base">Subtitle</p>
        </div>
    `
}
```

### 2. `truth-header` - Section header
```javascript
{
    type: 'truth-header',
    render: () => `
        <div class="text-center flex flex-col justify-center h-full">
            <p class="gospel-fade-in text-xs uppercase tracking-wider text-[var(--mission-gold)]">Section Label</p>
            <h2 class="gospel-scale-in delay-2 text-3xl font-bold text-white">MAIN TITLE</h2>
            <p class="gospel-fade-up delay-4 text-sm text-[var(--text-muted)]">Description</p>
        </div>
    `
}
```

### 3. `verse` - Scripture display
```javascript
{
    type: 'verse',
    image: '/path/to/image.jpg',  // Optional
    verse: {
        text: '"Scripture text here..."',
        ref: 'Book Chapter:Verse'
    }
}
```

### 4. `question` - Standard Q&A
```javascript
{
    type: 'question',
    question: 'Question text?',
    options: [
        { text: 'Option A', correct: false },
        { text: 'Option B', correct: true },
        { text: 'Option C', correct: false }
    ],
    correctFeedback: '🎉 Tama! Explanation...',
    wrongFeedback: 'Ang tamang sagot ay: <strong>Option B</strong>'
}
```

### 5. `formula-question` - Q&A with detailed wrong explanation
```javascript
{
    type: 'formula-question',
    question: 'Complex question?',
    options: [...],
    correctFeedback: '🎉 Tama!...',
    wrongFeedback: 'formula-explanation'  // Triggers special handler
}
```

### 6. `transition` - Segue between sections
```javascript
{
    type: 'transition',
    emoji: '🤔',
    title: 'Pero bakit...',
    text: 'Leading question or statement...',
    highlight: 'Key point to emphasize'
}
```

### 7. `decision-choice` - Branching point
```javascript
{
    type: 'decision-choice',
    render: () => `
        <div>
            <h3>Decision question?</h3>
            <button onclick="Module.handleDecision('option1')">Option 1</button>
            <button onclick="Module.handleDecision('option2')">Option 2</button>
        </div>
    `
}
```

### 8. `custom` - Any custom content
```javascript
{
    type: 'custom',
    render: () => `<div>Custom HTML content</div>`
}
```

---

## Animation Classes

### Entry Animations
| Class | Effect | Use For |
|-------|--------|---------|
| `gospel-bounce` | Bouncy scale in | Emojis, icons |
| `gospel-scale-in` | Scale from 0.8 | Big titles |
| `gospel-fade-up` | Fade + slide up | Body text, cards |
| `gospel-fade-in` | Simple fade | Labels, refs |

### Delay Classes
```css
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
/* ... up to delay-8 */
```

### Feedback Animations
| Class | Effect | Use For |
|-------|--------|---------|
| `gospel-correct` | Green pulse | Correct answers |
| `gospel-wrong` | Red shake | Wrong answers |
| `gospel-btn-pulse` | Pulsing glow | Call-to-action buttons |

### Slide Transitions
```css
.gospel-slide-enter { animation: slideIn 0.4s ease-out; }
.gospel-slide-exit { animation: slideOut 0.3s ease-in; }
```

---

## Modal Structure

```html
<div id="featureModal" class="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b">
        <span>Title</span>
        <button onclick="close()">✕</button>
    </div>
    
    <!-- Progress Bar -->
    <div class="h-1 bg-[var(--card-border)]">
        <div id="progress" class="h-full bg-[var(--mission-gold)]"></div>
    </div>
    
    <!-- Content Area -->
    <div id="content" class="flex-1 overflow-hidden p-4 flex items-center justify-center">
        <!-- Slide content rendered here -->
    </div>
    
    <!-- Navigation -->
    <div class="p-3 border-t flex justify-between">
        <button onclick="prev()">← Back</button>
        <span id="slideNum">1/34</span>
        <button onclick="next()">Next →</button>
    </div>
</div>
```

---

## Question Handling

```javascript
answerQuestion(selectedIndex, isCorrect) {
    const slide = this.slides[this.currentSlide];
    const options = document.querySelectorAll('.gospel-option');
    const feedback = document.getElementById('questionFeedback');
    const nextBtn = document.getElementById('nextBtn');
    
    // Disable all options
    options.forEach((opt, i) => {
        opt.disabled = true;
        
        // Highlight selected
        if (i === selectedIndex) {
            opt.classList.add(isCorrect ? 'gospel-correct' : 'gospel-wrong');
        }
        
        // Show correct answer if wrong
        if (slide.options[i].correct && !isCorrect) {
            setTimeout(() => opt.classList.add('border-green-500'), 500);
        }
    });
    
    // Show feedback
    feedback.classList.remove('hidden');
    feedback.innerHTML = isCorrect ? slide.correctFeedback : slide.wrongFeedback;
    
    // Enable next button
    setTimeout(() => {
        nextBtn.style.display = 'flex';
        nextBtn.classList.add('gospel-btn-pulse');
    }, 800);
}
```

---

## Firebase Tracking

```javascript
async recordDecision(decision) {
    const user = window.auth?.currentUser;
    if (user && window.db) {
        await window.db.collection('users').doc(user.uid).update({
            'featureDecision.status': decision,
            'featureDecision.timestamp': firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Increment stats
        await window.db.collection('stats').doc('feature').set({
            completedCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
    }
}
```

---

## Best Practices

### 1. Mobile-First Design
- Use `text-sm` and `text-xs` for body text
- Keep slides short (no scrolling)
- Large tap targets for buttons (min 44px)

### 2. Animation Timing
- Stagger elements by 100-200ms
- Keep total animation under 1 second
- Use `ease-out` for entries, `ease-in` for exits

### 3. Question Design
- 3 options maximum
- Clear correct answer
- Encouraging feedback for both correct/wrong

### 4. Transitions Between Topics
- Use emoji + short title
- Leading question format
- Highlight the key point

### 5. Decision Points
- Clear, distinct options
- Handle both paths gracefully
- Always save to Firebase

---

## Future Enhancements

1. **Audio Narration** - Add audio playback for each slide
2. **Progress Saving** - Resume from last viewed slide
3. **Offline Support** - Cache slides for offline use
4. **Analytics** - Track time per slide, drop-off points
5. **A/B Testing** - Test different question orders

---

## Files to Reference

- `/modules/gospel/gospel-presentation.js` - Complete implementation
- `/modules/journey/next-steps-modal.js` - How to open presentations
- This document for the reusable pattern
