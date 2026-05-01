# DebtControl Skills Guide

## Design Philosophy

### Premium Dark Theme
DebtControl uses a premium dark theme designed for financial data visualization. The aesthetic prioritizes clarity, trust, and visual hierarchy for debt management workflows.

### Color System

#### Core Tokens (CSS Variables)
```
--color-dcdark-bg: #000000           // Deep black background
--color-dcdark-surface: #0A0A0A     // Card/component backgrounds
--color-dcdark-surface-elevated: #111111  // Elevated surfaces
--color-dcdark-primary: #00D4FF     // Cyan accent (primary actions)
--color-dcdark-primary-hover: #00E5FF
--color-dcdark-success: #00E676      // Green for paid/completed
--color-dcdark-warning: #FFAB00      // Amber for due soon
--color-dcdark-danger: #FF5252       // Red for overdue/urgent
--color-dcdark-text-primary: #FFFFFF
--color-dcdark-text-secondary: #666666
--color-dcdark-border: #1A1A1A
```

#### Color Usage Rules

| Color | Hex | Usage |
|-------|-----|-------|
| **dcdark-primary** | `#00D4FF` | Primary actions, CTA buttons, active states, pending debts |
| **dcdark-success** | `#00E676` | Paid debts, completed items, positive amounts |
| **dcdark-warning** | `#FFAB00` | Due soon (1-3 days), attention needed |
| **dcdark-danger** | `#FF5252` | Overdue debts, delete actions, expenses |

**Golden Rule:**
- `Green` = What you already paid/completed
- `Cyan/Blue` = What you must do/pending action
- `Amber` = Attention soon, not urgent
- `Red` = Overdue/urgent action required

#### Muted Variants (15% opacity backgrounds)
```
--color-dcdark-primary-muted: rgba(0, 212, 255, 0.15)
--color-dcdark-success-muted: rgba(0, 230, 118, 0.15)
--color-dcdark-warning-muted: rgba(255, 171, 0, 0.15)
--color-dcdark-danger-muted: rgba(255, 82, 82, 0.15)
```

---

## Component Patterns

### Props Conventions

Components follow consistent prop patterns:

```typescript
interface ComponentProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

### DebtCard States

The `DebtCard` component handles 4 visual states based on debt status and due date:

```typescript
// pending (blue/cyan) - debt status !== 'paid' && daysUntil > 3
// due_soon (amber) - daysUntil <= 3 && daysUntil >= 0
// overdue (red) - daysUntil < 0
// paid (green) - debt.status === 'paid'
```

### BottomNav Structure

5 tabs with exact measurements:
- Height: `72px` (h-[72px])
- Icon size: `24px` (w-6 h-6)
- Touch target: `64px` width per item (w-16)
- Labels: `12px` text

### Touch Targets

Minimum 44×44px for all interactive elements:
```typescript
// Button sizes
sm: 'h-10'   // 40px
md: 'h-11'   // 44px - minimum touch target
lg: 'h-14'   // 56px - FAB size
```

### FAB (Floating Action Button)

- Size: `56px` × `56px` (w-14 h-14)
- Position: `bottom-20 right-4` (mobile), `bottom-6 right-6` (desktop)
- Shadow: `shadow-dc-lg`
- Always uses primary color with glow effect

### Shadows

```css
--shadow-dc: 0 1px 3px rgba(0,0,0,0.1)       /* Cards, low elements */
--shadow-dc-md: 0 4px 6px rgba(0,0,0,0.1)   /* Modals, dropdowns */
--shadow-dc-lg: 0 10px 15px rgba(0,0,0,0.1) /* FAB, tooltips */
```

---

## State Management (Zustand)

### Store Structure

```typescript
import { create } from 'zustand';

interface AppState {
  // State
  debts: DebtInstance[];
  isLoading: boolean;
  
  // Actions
  fetchDebts: () => Promise<void>;
  addDebt: (debt: DebtInstance) => void;
  updateDebt: (id: string, updates: Partial<DebtInstance>) => void;
}
```

### Debt Status Flow

```
pending → due_soon → overdue → paid
              ↑_________| (can go back)
```

---

## API Integration Patterns

### Axios Instance with Interceptors

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Error Handling Pattern

```typescript
try {
  const response = await api.post('/debts', debtData);
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    // Handle network error
    if (!error.response) {
      console.error('Network error');
    }
    // Handle server error
    else {
      console.error('Server error:', error.response.status);
    }
  }
  throw error;
}
```

---

## Animation Guidelines

| Animation | Duration | Use Case |
|-----------|----------|----------|
| `fade-in` | 300ms | Modals, overlays |
| `fade-in-up` | 400ms | Card entrances |
| `slide-up` | 300ms | Bottom sheets |
| `scale-in` | 200ms | Small popups |
| `pulse-glow` | 2s | FAB, active states |

Standard micro-interactions: `150-200ms` with default easing.

---

## Icon System (Lucide React)

Sizes:
- `16px` - Badges, inline
- `20px` - Buttons
- `24px` - Navigation (default)
- `32px` - Empty states

```typescript
import { CreditCard, CheckCircle, Clock, TrendingUp } from 'lucide-react';
```

---

## File Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── FAB.tsx
│   │   ├── BottomSheet.tsx
│   │   └── ...
│   ├── DebtCard.tsx  # Domain-specific component
│   └── Layout.tsx    # Navigation components
├── pages/
│   ├── DashboardPage.tsx
│   ├── DebtsPage.tsx
│   └── ...
├── store/            # Zustand stores
├── api/              # API client
└── types/             # TypeScript types
```
