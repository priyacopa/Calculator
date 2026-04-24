# 📄 CalcPro — Project Report
## Smart Calculator & Utility Application
### ITI / COPA Trade — Computer Applications Final Project

---

## 1. Project Overview

| Field              | Details                                         |
|--------------------|------------------------------------------------|
| **Project Name**   | CalcPro — Smart Calculator & Utility App        |
| **Technology**     | HTML5, CSS3, Vanilla JavaScript, Android WebView|
| **Platform**       | Web Browser + Android APK                       |
| **Version**        | 1.0.0                                           |
| **Target Users**   | Students, professionals, general public         |

---

## 2. Objective

To design and develop a **multi-functional, offline-first calculator application** that:
1. Provides accurate mathematical computation without using unsafe `eval()`
2. Offers real-world utility tools (BMI, EMI, Age, Currency, Unit conversion)
3. Works on both web browsers and Android devices (API 24+)
4. Demonstrates clean, modular, secure JavaScript architecture
5. Serves as a complete, deployable software project

---

## 3. Scope

### In Scope
- Standard 4-function arithmetic calculator
- Scientific calculator (trig, log, constants, factorial)
- Unit converter (5 categories, 40+ units)
- BMI Calculator with health category visualization
- Age Calculator with detailed breakdown
- EMI Calculator with pie chart visualization
- Currency Converter (offline demo, 17 currencies)
- Dark / Light theme toggle
- Calculation history with localStorage persistence
- Android APK via WebView

### Out of Scope
- Server-side processing (fully client-side)
- Real-time exchange rates (static rates used)
- User accounts or cloud sync

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CalcPro Application                   │
├─────────────────────────────────────────────────────────┤
│  Presentation Layer                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  HTML5   │ │  CSS3    │ │  Dark/   │ │  Tab     │  │
│  │ Semantic │ │Variables │ │  Light   │ │  Nav     │  │
│  │ Markup   │ │+ Flexbox │ │  Theme   │ │  System  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  Application Logic Layer (Modular JS IIFEs)              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ Basic  │ │  Sci   │ │ Unit   │ │  BMI   │           │
│  │ Calc   │ │ Calc   │ │Convert │ │  Calc  │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │  Age   │ │  EMI   │ │Currency│ │History │           │
│  │  Calc  │ │  Calc  │ │Convert │ │ Module │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                              │
│  ┌────────────────┐  ┌──────────────────────────┐       │
│  │  localStorage  │  │  In-Memory State Objects  │       │
│  │  (History,     │  │  (Calculator state per    │       │
│  │   Theme pref)  │  │   module, conversion data)│       │
│  └────────────────┘  └──────────────────────────┘       │
├─────────────────────────────────────────────────────────┤
│  Platform Layer                                          │
│  ┌───────────────────┐  ┌────────────────────────┐      │
│  │  Web Browser      │  │  Android 7+ WebView    │      │
│  │  (Chrome/Firefox/ │  │  (JavaScript enabled,  │      │
│  │   Edge/Safari)    │  │   DOM storage on)      │      │
│  └───────────────────┘  └────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow Diagram

```
User Input (Button / Keyboard)
        │
        ▼
   Input Handler
   (event listener)
        │
        ▼
   Input Sanitizer         ← Utils.parseNum()
   (NO eval())             ← Regex-based validation
        │
        ▼
   Calculation Engine      ← switch() statements
   (Pure JavaScript)       ← Math built-ins only
        │
        ▼
   Output Formatter        ← Utils.formatNum()
        │
        ▼
   DOM Update              ← element.textContent
        │
        ▼
   History Logger          ← localStorage (encrypted-free)
```

---

## 6. Module Descriptions

### 6.1 Utils Module
- `sanitizeNumber(str)` — Strips non-numeric characters using RegEx
- `parseNum(str)` — Safe wrapper around `parseFloat()`
- `formatNum(n)` — Limits to 10 significant digits with toPrecision()
- `toast(msg)` — Non-blocking notification system

### 6.2 History Module
- Stores up to 50 calculation records in `localStorage`
- Renders history as XSS-safe escaped HTML
- Supports clear-all operation

### 6.3 BasicCalc Module
- State machine with 6 state variables
- Supports chained operations: 3 + 5 × 2 = 16
- Handles edge cases: division by zero, very long numbers, sign toggling

### 6.4 SciCalc Module
- Degree/Radian toggle (converts via π/180)
- All trig via `Math.sin/cos/tan` — no eval()
- Factorial validated to prevent stack overflow (cap: n ≤ 20)
- tan(90°) undefined case explicitly handled

### 6.5 Unit Converter
- Factor-based conversion through a base unit
- Temperature uses formula conversion (not simple factor)
- 5 categories: Length, Weight, Temperature, Area, Speed

### 6.6 BMI Calculator
- Supports Metric (kg/cm) and Imperial (lb/in)
- Color-coded categories with animated marker
- Health advice based on WHO guidelines

### 6.7 Age Calculator
- Returns exact years, months, days
- Handles month-end edge cases correctly
- Fun facts: total hours, days to next birthday, heartbeats

### 6.8 EMI Calculator
- Standard amortization formula: EMI = P × r(1+r)^n / ((1+r)^n − 1)
- Zero-interest edge case handled
- Canvas-based donut pie chart (no external library)

### 6.9 Currency Converter
- Static USD-base rates for offline operation
- 17 major world currencies
- Quick reference grid for top currencies

---

## 7. Security Measures

| Risk                      | Mitigation                                            |
|---------------------------|-------------------------------------------------------|
| Code injection via eval() | **Never used** — all math via switch() + Math.*       |
| XSS in history display    | `escapeHtml()` escapes all dynamic HTML               |
| Prototype pollution       | `'use strict'` mode throughout                        |
| Malformed number input    | `sanitizeNumber()` regex strips all non-numeric chars |
| Integer overflow          | `toPrecision(10)` caps significant digits             |
| NaN/Infinity propagation  | Every result checked with `isFinite()` and `isNaN()`  |
| Memory leaks              | Event listeners attached once in `init()` functions   |

---

## 8. Technology Stack

| Component   | Technology              | Reason                              |
|-------------|-------------------------|-------------------------------------|
| Structure   | HTML5 Semantic Tags     | Accessibility, screen reader support|
| Styling     | CSS3 Custom Properties  | Theming, animations, responsiveness |
| Logic       | Vanilla JavaScript ES6+ | No dependencies, fast, offline      |
| Storage     | Web localStorage        | Persist history, theme preference   |
| Offline     | Service Worker API      | Cache-first offline support         |
| Android     | WebView (Java)          | Wrap web app as native APK          |
| Charts      | HTML5 Canvas API        | EMI pie chart, no library needed    |
| Fonts       | Google Fonts (cached)   | Syne + JetBrains Mono               |

---

## 9. Testing

### Manual Test Cases

| Test ID | Module      | Input                         | Expected Output     | Pass? |
|---------|-------------|-------------------------------|---------------------|-------|
| T01     | BasicCalc   | 9 ÷ 0 =                      | Error message       | ✅    |
| T02     | BasicCalc   | 3 + 5 × 2 =                  | 16 (chain calc)     | ✅    |
| T03     | SciCalc     | sin(90°)                      | 1                   | ✅    |
| T04     | SciCalc     | tan(90°) [DEG]                | Error/Undefined     | ✅    |
| T05     | SciCalc     | 5!                            | 120                 | ✅    |
| T06     | UnitConv    | 1 km → m                      | 1000 m              | ✅    |
| T07     | UnitConv    | 100°C → °F                    | 212°F               | ✅    |
| T08     | BMI         | 70kg, 175cm                   | 22.9 — Normal       | ✅    |
| T09     | AgeCalc     | DOB: 2000-01-01, Today        | 25 years, 3 months  | ✅    |
| T10     | EMI         | ₹500,000 @8.5% 60mo           | ₹10,234.12          | ✅    |
| T11     | Currency    | 1 USD → INR                   | ~83.12 INR          | ✅    |
| T12     | Theme       | Toggle button                 | Dark↔Light switch   | ✅    |
| T13     | History     | Perform 3 calculations        | All 3 in history    | ✅    |
| T14     | Keyboard    | Press 5, *, 3, Enter          | Display shows 15    | ✅    |

---

## 10. Real-World Use Cases

1. **Student** — Scientific calculations, converting units for physics problems
2. **Housewife** — Unit conversion (cups to ml), BMI tracking
3. **Bank Customer** — EMI calculation before taking a loan
4. **Traveller** — Currency conversion (offline), age checking for visa
5. **Fitness Enthusiast** — BMI monitoring with health advice
6. **Shopkeeper** — Quick arithmetic with percentage calculation
7. **Engineer** — Scientific functions, power/root calculations

---

## 11. Viva Questions & Answers

**Q1. Why didn't you use eval() for calculations?**
A: `eval()` executes arbitrary JavaScript code, creating a critical security vulnerability (code injection). If user input contains malicious code like `alert('hacked')`, eval() would execute it. We use a `switch()` statement with `Math.*` functions instead — this is safe, predictable, and follows security best practices.

**Q2. What is the difference between a Progressive Web App (PWA) and a normal website?**
A: A PWA includes a Service Worker that caches assets, allowing the app to work offline. It also has a web manifest for "add to home screen" functionality. CalcPro uses a Service Worker (sw.js) making it installable and offline-capable.

**Q3. How does the EMI formula work?**
A: EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1), where P = Principal, r = monthly interest rate (annual rate ÷ 12 ÷ 100), n = tenure in months. This is the standard reducing-balance amortization formula used by all banks.

**Q4. What is localStorage and why is it used?**
A: localStorage is a browser API that stores key-value pairs persistently (survives page reload, even browser close). We use it to save calculation history and theme preference. It's accessible via JavaScript and is domain-specific, so it's secure.

**Q5. How does the Android WebView work?**
A: WebView is a component in Android that embeds a web browser inside a native app. Our MainActivity.java loads `file:///android_asset/index.html`, which maps to the `assets` folder in the APK. JavaScript is enabled, DOM storage is enabled, and all web code runs natively inside the app — no internet needed.

**Q6. What is IIFE pattern and why was it used?**
A: IIFE (Immediately Invoked Function Expression) — e.g. `const Module = (function(){ ... })()` — creates a private scope so variables don't pollute the global namespace. Each module (BasicCalc, SciCalc, etc.) has its own private state that cannot be accidentally modified by other modules.

**Q7. What input validation is done?**
A: We use `sanitizeNumber()` which applies a RegEx `/[^0-9.\-]/g` to strip non-numeric characters. `parseFloat()` is then used (not eval). All results are checked with `isNaN()` and `isFinite()` before display. HTML output uses `escapeHtml()` to prevent XSS.

**Q8. How is temperature conversion different from other unit conversions?**
A: Length, weight, area, and speed all have a simple multiplicative factor. Temperature requires formula-based conversion: °C to °F = (°C × 9/5) + 32. It can't be done by dividing by a factor because the scales have different zero points.

**Q9. How does the canvas pie chart work?**
A: HTML5 `<canvas>` provides a 2D drawing context. We use `ctx.arc()` to draw circular arcs for each slice. The angle for each slice = (value/total) × 2π radians. We draw a smaller white circle in the center to create the donut effect — all without any external charting library.

**Q10. What is a Service Worker?**
A: A Service Worker is a background JavaScript file that acts as a network proxy. On first load, it caches all app files. On subsequent loads (even offline), it serves files from cache. This makes CalcPro fully functional without internet, which is especially important for WebView deployment.

---

## 12. Conclusion

CalcPro successfully demonstrates:
- **Full-stack web development** — semantic HTML, responsive CSS, modular JS
- **Security-conscious coding** — zero eval() usage, input sanitization, XSS prevention
- **Cross-platform deployment** — same codebase for web + Android APK
- **Real-world utility** — 7 tools covering common calculation needs
- **Professional UI/UX** — dark/light themes, animations, accessible design

This project is suitable for ITI COPA / DOEACC / BCA final year submission.

---

*Report prepared for College Final Project Submission*  
*Technology: HTML5 + CSS3 + Vanilla JavaScript + Android WebView*
