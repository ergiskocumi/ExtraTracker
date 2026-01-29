# 🎓 Sistema Tutorial Guidato

Sistema completo per creare tutorial interattivi con animazioni fluide che guidano gli utenti attraverso l'applicazione.

## 📋 Caratteristiche

- ✅ **Animazioni fluide** con framer-motion
- ✅ **Highlight animati** degli elementi target
- ✅ **Tooltip informativi** con descrizioni chiare
- ✅ **Navigazione step-by-step** (Avanti, Indietro, Salta)
- ✅ **Salvataggio progresso** in localStorage
- ✅ **Auto-start** opzionale per tutorial
- ✅ **Responsive** e accessibile
- ✅ **Scroll lock** quando il tutorial è attivo

## 🚀 Quick Start

### 1. Il TutorialProvider è già integrato in `main.tsx`

### 2. Crea una definizione tutorial

```typescript
// features/dashboard/tutorials/dashboardTutorial.ts
import type { TutorialConfig } from '../../../../shared/context/TutorialContext';

export const dashboardTutorial: TutorialConfig = {
    id: 'dashboard-tutorial',
    name: 'Tour Dashboard',
    autoStart: true, // Avvia automaticamente
    skipable: true,
    steps: [
        {
            id: 'welcome',
            target: 'body', // Selector CSS
            title: '👋 Benvenuto!',
            description: 'Descrizione dello step...',
            position: 'center', // top | bottom | left | right | center
        },
        {
            id: 'greeting',
            target: '[data-tutorial="greeting"]',
            title: 'Saluto Personalizzato',
            description: 'Il saluto cambia in base all\'ora...',
            position: 'bottom',
            waitForElement: true, // Aspetta che l'elemento sia visibile
        },
    ],
};
```

### 3. Aggiungi attributi data-tutorial agli elementi

```tsx
<div data-tutorial="greeting">
    <h1>Saluto</h1>
</div>
```

### 4. Registra il tutorial nella pagina

```tsx
import { useTutorial } from '../../../shared/context/TutorialContext';
import { dashboardTutorial } from '../tutorials/dashboardTutorial';

export const DashboardPage = () => {
    const { registerTutorial } = useTutorial();

    useEffect(() => {
        registerTutorial(dashboardTutorial);
    }, [registerTutorial]);

    return (
        <div>
            {/* Contenuto */}
        </div>
    );
};
```

## 📝 Opzioni TutorialStep

```typescript
interface TutorialStep {
    id: string;                    // ID univoco dello step
    target: string;                 // Selector CSS (es. '[data-tutorial="id"]')
    title: string;                  // Titolo del tooltip
    description: string;            // Descrizione dettagliata
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    offset?: { x: number; y: number }; // Offset personalizzato
    action?: () => void;            // Azione da eseguire prima dello step
    waitForElement?: boolean;       // Aspetta che l'elemento sia visibile
    highlightPadding?: number;     // Padding dell'highlight (default: 8)
}
```

## 🎨 Esempi

### Tutorial con azioni

```typescript
{
    id: 'open-modal',
    target: '[data-tutorial="create-button"]',
    title: 'Crea un Nuovo Elemento',
    description: 'Clicca qui per aprire il modal di creazione.',
    position: 'bottom',
    action: () => {
        // Apri un modal o esegui un'azione prima di mostrare lo step
    },
}
```

### Tutorial con elemento che appare dopo

```typescript
{
    id: 'dynamic-element',
    target: '[data-tutorial="dynamic"]',
    title: 'Elemento Dinamico',
    description: 'Questo elemento appare dopo un\'azione.',
    position: 'right',
    waitForElement: true, // Aspetta che l'elemento sia nel DOM
}
```

## 🔧 API

### Hook `useTutorial`

```typescript
const {
    // State
    state,              // { currentTutorial, currentStep, isActive, isPaused }
    currentConfig,      // Configurazione tutorial corrente
    
    // Actions
    startTutorial,     // (tutorialId: string) => void
    nextStep,          // () => void
    previousStep,      // () => void
    skipTutorial,      // () => void
    completeTutorial,  // () => void
    pauseTutorial,     // () => void
    resumeTutorial,    // () => void
    
    // Utils
    isTutorialCompleted, // (tutorialId: string) => boolean
    registerTutorial,    // (config: TutorialConfig) => void
} = useTutorial();
```

## 💡 Best Practices

1. **Usa selector specifici**: Preferisci `[data-tutorial="id"]` invece di classi CSS
2. **Posiziona i tooltip intelligentemente**: Evita che escano dallo schermo
3. **Usa `waitForElement: true`** per elementi che appaiono dinamicamente
4. **Mantieni le descrizioni brevi e chiare**
5. **Testa su diverse risoluzioni** per assicurarti che il tooltip sia visibile

## 🎯 Tutorial Esistenti

- `dashboardTutorial` - Tour della Dashboard
- `studyTutorial` - Tour della sezione Flashcards (da implementare)

## 🔮 Prossimi Tutorial da Creare

- Tutorial per Study Session
- Tutorial per Exam Solver
