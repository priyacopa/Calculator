/**
 * ═══════════════════════════════════════════════════════════════
 *  CalcPro — Smart Calculator & Utility Application
 *  app.js — Main Application Script
 *
 *  Architecture: Modular IIFE pattern, no eval(), no globals leak
 *  Modules:
 *    1. Utils          — Shared helpers, input sanitization
 *    2. History        — Calculation history management
 *    3. BasicCalc      — Standard 4-function calculator engine
 *    4. SciCalc        — Scientific calculator engine
 *    5. UnitConverter  — Length/Weight/Temp/Area/Speed
 *    6. BMI            — Body Mass Index calculator
 *    7. AgeCalc        — Exact age calculation
 *    8. EMI            — Loan EMI calculator with pie chart
 *    9. Currency       — Offline demo currency converter
 *   10. UI             — Tab system, theme, splash, events
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   MODULE 1: UTILS — Sanitization, Formatting, Display helpers
   ══════════════════════════════════════════════════════════════ */
const Utils = (function () {

  /**
   * Sanitize a numeric string — removes non-numeric chars except . and -
   * SECURITY: Never passes user input to eval() or Function()
   * @param {string} str
   * @returns {string}
   */
  function sanitizeNumber(str) {
    if (typeof str !== 'string') str = String(str);
    // Allow digits, single leading minus, and single decimal point
    return str.replace(/[^0-9.\-]/g, '').trim();
  }

  /**
   * Parse a sanitized number safely using parseFloat
   * Returns NaN if invalid — caller must handle
   * @param {string} str
   * @returns {number}
   */
  function parseNum(str) {
    const s = sanitizeNumber(str);
    if (s === '' || s === '-' || s === '.') return NaN;
    return parseFloat(s);
  }

  /**
   * Format a number for display (max 10 significant digits)
   * @param {number} n
   * @returns {string}
   */
  function formatNum(n) {
    if (!isFinite(n)) return n > 0 ? '∞' : n < 0 ? '-∞' : 'Error';
    if (isNaN(n)) return 'Error';
    // Use toPrecision to cap digits, then parseFloat to strip trailing zeros
    const str = parseFloat(n.toPrecision(10)).toString();
    return str;
  }

  /**
   * Format currency with locale formatting
   * @param {number} n
   * @param {string} symbol
   * @returns {string}
   */
  function formatCurrency(n, symbol = '₹') {
    if (isNaN(n)) return symbol + '0.00';
    return symbol + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Clamp a number between min and max
   * @param {number} n
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

  /**
   * Show a temporary toast notification
   * @param {string} msg
   */
  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 300);
    }, 2500);
  }

  return { sanitizeNumber, parseNum, formatNum, formatCurrency, clamp, toast };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 2: HISTORY — Calculation history storage & display
   ══════════════════════════════════════════════════════════════ */
const History = (function () {
  const MAX = 50;
  let records = [];

  /** Load from localStorage safely */
  function load() {
    try {
      const raw = localStorage.getItem('calcpro_history');
      if (raw) records = JSON.parse(raw).slice(0, MAX);
    } catch (_) { records = []; }
  }

  /** Persist to localStorage */
  function save() {
    try { localStorage.setItem('calcpro_history', JSON.stringify(records)); } catch (_) {}
  }

  /**
   * Add a history entry
   * @param {string} expr - The expression string
   * @param {string} result - The result string
   */
  function add(expr, result) {
    if (!expr || !result) return;
    records.unshift({
      expr: String(expr).substring(0, 80),
      result: String(result).substring(0, 30),
      time: new Date().toLocaleTimeString()
    });
    if (records.length > MAX) records.pop();
    save();
    render();
  }

  /** Clear all history */
  function clear() {
    records = [];
    save();
    render();
  }

  /** Render history into the panel */
  function render() {
    const list = document.getElementById('historyList');
    if (!list) return;
    if (records.length === 0) {
      list.innerHTML = '<div class="empty-state">No calculations yet.</div>';
      return;
    }
    list.innerHTML = records.map(r => `
      <div class="history-item">
        <span class="history-expr">${escapeHtml(r.expr)}</span>
        <span class="history-result">= ${escapeHtml(r.result)}</span>
        <span class="history-time">${escapeHtml(r.time)}</span>
      </div>
    `).join('');
  }

  /** Escape HTML to prevent XSS in rendered history */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { load, add, clear, render };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 3: BASIC CALCULATOR ENGINE
   NO eval() — uses a custom two-operand state machine
   ══════════════════════════════════════════════════════════════ */
const BasicCalc = (function () {
  // State
  let state = {
    display: '0',         // What's shown on screen
    expr: '',             // Expression line above display
    operand1: null,       // First operand (number)
    operator: null,       // Pending operator symbol
    waitingForOperand: false,  // Next keypress starts new number
    justEvaluated: false,      // Result was just computed
  };

  const displayEl = document.getElementById('calcDisplay');
  const exprEl    = document.getElementById('calcExpr');

  /** Render current state to DOM */
  function render() {
    if (!displayEl) return;
    displayEl.textContent = state.display;
    exprEl.textContent    = state.expr;
    // Size adjustment for long numbers
    const len = state.display.length;
    displayEl.style.fontSize = len > 12 ? 'clamp(1.2rem,5vw,1.6rem)'
                             : len > 9  ? 'clamp(1.6rem,6vw,2rem)'
                             : '';
    displayEl.classList.toggle('error', state.display === 'Error');
    displayEl.classList.remove('computed');
  }

  /**
   * Perform arithmetic — no eval(), pure switch statement
   * @param {number} a
   * @param {string} op
   * @param {number} b
   * @returns {number}
   */
  function calculate(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷':
        if (b === 0) return NaN; // Caught below
        return a / b;
      default:  return b;
    }
  }

  /** Handle number input (0–9) */
  function inputNum(digit) {
    if (state.waitingForOperand || state.justEvaluated) {
      state.display = digit;
      state.waitingForOperand = false;
      state.justEvaluated = false;
    } else {
      // Prevent leading zeros
      state.display = (state.display === '0') ? digit : state.display + digit;
      // Max length guard
      if (state.display.replace('-', '').replace('.', '').length > 15) return;
    }
    render();
  }

  /** Toggle decimal point */
  function inputDecimal() {
    if (state.waitingForOperand) { state.display = '0.'; state.waitingForOperand = false; render(); return; }
    if (!state.display.includes('.')) { state.display += '.'; render(); }
  }

  /** Handle operator (+, −, ×, ÷) */
  function inputOperator(op) {
    const val = parseFloat(state.display);
    if (isNaN(val)) return;

    if (state.operator && !state.waitingForOperand) {
      // Chain calculation
      const result = calculate(state.operand1, state.operator, val);
      if (isNaN(result) || !isFinite(result)) { state.display = 'Error'; state.expr = ''; state.operator = null; state.operand1 = null; render(); return; }
      state.operand1 = result;
      state.display  = Utils.formatNum(result);
    } else {
      state.operand1 = val;
    }
    state.operator          = op;
    state.waitingForOperand = true;
    state.justEvaluated     = false;
    state.expr = `${Utils.formatNum(state.operand1)} ${op}`;

    // Highlight active operator button
    document.querySelectorAll('#tab-calculator .key-op').forEach(btn => btn.classList.remove('active-op'));
    document.querySelectorAll(`#tab-calculator .key-op[data-val="${op}"]`).forEach(b => b.classList.add('active-op'));

    render();
  }

  /** Evaluate the expression */
  function equals() {
    if (state.operator === null || state.operand1 === null) return;
    const val2 = parseFloat(state.display);
    if (isNaN(val2)) return;

    const fullExpr = `${Utils.formatNum(state.operand1)} ${state.operator} ${Utils.formatNum(val2)}`;
    const result   = calculate(state.operand1, state.operator, val2);

    // Catch division by zero and overflow
    if (!isFinite(result) || isNaN(result)) {
      state.display = 'Error';
      state.expr    = '⚠ ' + (val2 === 0 && state.operator === '÷' ? 'Cannot divide by zero' : 'Invalid operation');
      History.add(fullExpr, 'Error');
    } else {
      const resultStr = Utils.formatNum(result);
      History.add(fullExpr, resultStr);
      state.display = resultStr;
      state.expr    = `${fullExpr} =`;
      state.operand1 = result;
    }

    state.operator          = null;
    state.waitingForOperand = false;
    state.justEvaluated     = true;

    document.querySelectorAll('#tab-calculator .key-op').forEach(btn => btn.classList.remove('active-op'));
    displayEl.classList.add('computed');
    render();
  }

  /** Clear (All Clear) */
  function clear() {
    state = { display: '0', expr: '', operand1: null, operator: null, waitingForOperand: false, justEvaluated: false };
    document.querySelectorAll('#tab-calculator .key-op').forEach(btn => btn.classList.remove('active-op'));
    render();
  }

  /** Backspace / Delete last character */
  function backspace() {
    if (state.justEvaluated || state.waitingForOperand) return;
    state.display = state.display.length > 1 ? state.display.slice(0, -1) : '0';
    render();
  }

  /** Toggle sign */
  function sign() {
    if (state.display === '0' || state.display === 'Error') return;
    state.display = state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display;
    render();
  }

  /** Percentage */
  function percent() {
    const n = parseFloat(state.display);
    if (isNaN(n)) return;
    state.display = Utils.formatNum(n / 100);
    render();
  }

  /** Square root */
  function sqrt() {
    const n = parseFloat(state.display);
    if (isNaN(n) || n < 0) { state.display = 'Error'; state.expr = '⚠ Negative sqrt'; render(); return; }
    const result = Math.sqrt(n);
    state.expr    = `√(${Utils.formatNum(n)})`;
    state.display = Utils.formatNum(result);
    state.justEvaluated = true;
    History.add(state.expr, state.display);
    render();
  }

  /** Square (x²) */
  function square() {
    const n = parseFloat(state.display);
    if (isNaN(n)) return;
    const result = n * n;
    state.expr    = `(${Utils.formatNum(n)})²`;
    state.display = Utils.formatNum(result);
    state.justEvaluated = true;
    History.add(state.expr, state.display);
    render();
  }

  /** Reciprocal (1/x) */
  function inverse() {
    const n = parseFloat(state.display);
    if (isNaN(n) || n === 0) { state.display = 'Error'; state.expr = '⚠ Cannot divide by zero'; render(); return; }
    const result = 1 / n;
    state.expr    = `1/(${Utils.formatNum(n)})`;
    state.display = Utils.formatNum(result);
    state.justEvaluated = true;
    History.add(state.expr, state.display);
    render();
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} e
   */
  function handleKeyboard(e) {
    const key = e.key;
    if (/^[0-9]$/.test(key))        { inputNum(key); return; }
    if (key === '.')                 { inputDecimal(); return; }
    if (key === 'Backspace')         { backspace(); return; }
    if (key === 'Escape')            { clear(); return; }
    if (key === 'Enter' || key==='=') { equals(); return; }
    if (key === '+')                 { inputOperator('+'); return; }
    if (key === '-')                 { inputOperator('−'); return; }
    if (key === '*')                 { inputOperator('×'); return; }
    if (key === '/')                 { e.preventDefault(); inputOperator('÷'); return; }
    if (key === '%')                 { percent(); return; }
  }

  /** Attach button event listeners */
  function bindButtons() {
    document.querySelectorAll('#tab-calculator .key[data-action]').forEach(btn => {
      btn.addEventListener('click', function () {
        const action = this.dataset.action;
        const val    = this.dataset.val;
        switch (action) {
          case 'num':       inputNum(val);       break;
          case 'op':        inputOperator(val);  break;
          case 'equals':    equals();            break;
          case 'clear':     clear();             break;
          case 'backspace': backspace();         break;
          case 'sign':      sign();              break;
          case 'percent':   percent();           break;
          case 'decimal':   inputDecimal();      break;
          case 'sqrt':      sqrt();              break;
          case 'square':    square();            break;
          case 'inverse':   inverse();           break;
        }
      });
    });
  }

  function init() {
    bindButtons();
    document.addEventListener('keydown', function (e) {
      // Only if basic calc tab is active
      if (document.getElementById('tab-calculator').classList.contains('active')) {
        handleKeyboard(e);
      }
    });
    render();
  }

  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 4: SCIENTIFIC CALCULATOR ENGINE
   ══════════════════════════════════════════════════════════════ */
const SciCalc = (function () {
  let state = {
    display: '0', expr: '', operand1: null, operator: null,
    waitingForOperand: false, justEvaluated: false, useRadians: false
  };

  const displayEl = document.getElementById('sciDisplay');
  const exprEl    = document.getElementById('sciExpr');

  function render() {
    if (!displayEl) return;
    displayEl.textContent = state.display;
    exprEl.textContent    = state.expr;
    const len = state.display.length;
    displayEl.style.fontSize = len > 12 ? 'clamp(1.2rem,5vw,1.6rem)' : len > 9 ? 'clamp(1.6rem,6vw,2rem)' : '';
    displayEl.classList.toggle('error', state.display === 'Error');
  }

  function calculate(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': if (b === 0) return NaN; return a / b;
      case '^': return Math.pow(a, b);
      default:  return b;
    }
  }

  /** Convert degrees to radians if needed */
  function toRad(deg) { return state.useRadians ? deg : deg * (Math.PI / 180); }

  /** Validate result before showing */
  function setResult(val, exprStr) {
    if (isNaN(val) || !isFinite(val)) {
      state.display = 'Error'; state.expr = '⚠ Invalid operation';
    } else {
      state.display = Utils.formatNum(val);
      state.expr    = exprStr || '';
      History.add(exprStr || state.display, state.display);
    }
    state.justEvaluated = true;
    render();
  }

  /** Factorial — only for non-negative integers up to 20 */
  function factorial(n) {
    if (!Number.isInteger(n) || n < 0) return NaN;
    if (n > 20) return Infinity;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  /** Handle scientific function buttons */
  function applySci(fn) {
    const n = parseFloat(state.display);
    if (isNaN(n)) return;
    let result, label;
    const modeStr = state.useRadians ? 'rad' : 'deg';

    switch (fn) {
      case 'sin':   result = Math.sin(toRad(n));    label = `sin(${n}°)`; break;
      case 'cos':   result = Math.cos(toRad(n));    label = `cos(${n}°)`; break;
      case 'tan':
        // tan(90) is undefined
        if (!state.useRadians && (n % 180 === 90)) { setResult(NaN, `tan(${n}°)`); return; }
        result = Math.tan(toRad(n));    label = `tan(${n}°) [${modeStr}]`; break;
      case 'log':
        if (n <= 0) { setResult(NaN, `log(${n})`); return; }
        result = Math.log10(n);         label = `log(${n})`; break;
      case 'ln':
        if (n <= 0) { setResult(NaN, `ln(${n})`); return; }
        result = Math.log(n);           label = `ln(${n})`; break;
      case 'pi':    state.display = Utils.formatNum(Math.PI); state.expr = 'π'; render(); return;
      case 'e':     state.display = Utils.formatNum(Math.E);  state.expr = 'e'; render(); return;
      case 'pow':
        // Set operator to power, wait for second operand
        state.operand1 = n; state.operator = '^'; state.waitingForOperand = true;
        state.expr = `${Utils.formatNum(n)} ^`; render(); return;
      case 'cbrt':  result = Math.cbrt(n);          label = `∛(${n})`; break;
      case 'abs':   result = Math.abs(n);            label = `|${n}|`; break;
      case 'fact':
        result = factorial(Math.round(n));            label = `${Math.round(n)}!`; break;
      case 'floor': result = Math.floor(n);          label = `⌊${n}⌋`; break;
      case 'ceil':  result = Math.ceil(n);           label = `⌈${n}⌉`; break;
      case 'exp':   result = Math.exp(n);            label = `e^${n}`; break;
      case 'round': result = Math.round(n);          label = `round(${n})`; break;
      default: return;
    }
    setResult(result, label);
  }

  function inputNum(digit) {
    if (state.waitingForOperand || state.justEvaluated) {
      state.display = digit; state.waitingForOperand = false; state.justEvaluated = false;
    } else {
      state.display = (state.display === '0') ? digit : state.display + digit;
      if (state.display.replace('-','').replace('.','').length > 15) return;
    }
    render();
  }
  function inputDecimal() {
    if (state.waitingForOperand) { state.display = '0.'; state.waitingForOperand = false; render(); return; }
    if (!state.display.includes('.')) { state.display += '.'; render(); }
  }
  function inputOperator(op) {
    const val = parseFloat(state.display);
    if (isNaN(val)) return;
    if (state.operator && !state.waitingForOperand) {
      const result = calculate(state.operand1, state.operator, val);
      if (isNaN(result) || !isFinite(result)) { state.display = 'Error'; state.expr = '⚠'; state.operator = null; state.operand1 = null; render(); return; }
      state.operand1 = result; state.display = Utils.formatNum(result);
    } else { state.operand1 = val; }
    state.operator = op; state.waitingForOperand = true; state.justEvaluated = false;
    state.expr = `${Utils.formatNum(state.operand1)} ${op}`;
    render();
  }
  function equals() {
    if (state.operator === null || state.operand1 === null) return;
    const val2 = parseFloat(state.display);
    if (isNaN(val2)) return;
    const fullExpr = `${Utils.formatNum(state.operand1)} ${state.operator} ${Utils.formatNum(val2)}`;
    const result   = calculate(state.operand1, state.operator, val2);
    if (!isFinite(result) || isNaN(result)) {
      state.display = 'Error'; state.expr = val2 === 0 && state.operator === '÷' ? '⚠ Div by zero' : '⚠ Error';
      History.add(fullExpr, 'Error');
    } else {
      state.display = Utils.formatNum(result); state.expr = `${fullExpr} =`;
      state.operand1 = result; History.add(fullExpr, state.display);
    }
    state.operator = null; state.waitingForOperand = false; state.justEvaluated = true;
    render();
  }
  function clear() {
    state = { display:'0', expr:'', operand1:null, operator:null, waitingForOperand:false, justEvaluated:false, useRadians: state.useRadians };
    render();
  }
  function backspace() {
    if (state.justEvaluated || state.waitingForOperand) return;
    state.display = state.display.length > 1 ? state.display.slice(0,-1) : '0'; render();
  }
  function sign() {
    if (state.display === '0' || state.display === 'Error') return;
    state.display = state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display; render();
  }
  function percent() {
    const n = parseFloat(state.display); if (isNaN(n)) return;
    state.display = Utils.formatNum(n / 100); render();
  }
  function sqrt() {
    const n = parseFloat(state.display);
    if (n < 0) { setResult(NaN, `√(${n})`); return; }
    setResult(Math.sqrt(n), `√(${n})`);
  }

  function bindButtons() {
    // Scientific function buttons
    document.querySelectorAll('.key-sci[data-sci]').forEach(btn => {
      btn.addEventListener('click', function () { applySci(this.dataset.sci); });
    });
    // Standard keypad in sci panel
    document.querySelectorAll('#tab-scientific .key[data-sci-action]').forEach(btn => {
      btn.addEventListener('click', function () {
        const action = this.dataset.sciAction, val = this.dataset.val;
        switch (action) {
          case 'num':         inputNum(val);      break;
          case 'op':          inputOperator(val); break;
          case 'equals':      equals();           break;
          case 'clear':       clear();            break;
          case 'backspace':   backspace();        break;
          case 'sign':        sign();             break;
          case 'percent':     percent();          break;
          case 'decimal':     inputDecimal();     break;
          case 'sqrt':        sqrt();             break;
          case 'paren-open':  /* optional future */ break;
          case 'paren-close': /* optional future */ break;
        }
      });
    });
    // Radian/Degree toggle
    const radToggle = document.getElementById('radToggle');
    const radLabel  = document.getElementById('radLabel');
    if (radToggle) {
      radToggle.addEventListener('change', function () {
        state.useRadians = this.checked;
        radLabel.textContent = this.checked ? 'RAD' : 'DEG';
      });
    }
  }

  function init() { bindButtons(); render(); }
  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 5: UNIT CONVERTER
   ══════════════════════════════════════════════════════════════ */
const UnitConverter = (function () {

  /**
   * Conversion definitions — all relative to a base unit (first in array)
   * factor = how many base units this unit equals
   */
  const UNITS = {
    length: [
      { name: 'Meter (m)',       code: 'm',   factor: 1 },
      { name: 'Kilometer (km)',  code: 'km',  factor: 1000 },
      { name: 'Centimeter (cm)',code: 'cm',  factor: 0.01 },
      { name: 'Millimeter (mm)',code: 'mm',  factor: 0.001 },
      { name: 'Mile (mi)',       code: 'mi',  factor: 1609.344 },
      { name: 'Yard (yd)',       code: 'yd',  factor: 0.9144 },
      { name: 'Foot (ft)',       code: 'ft',  factor: 0.3048 },
      { name: 'Inch (in)',       code: 'in',  factor: 0.0254 },
      { name: 'Nautical Mile',   code: 'nmi', factor: 1852 },
    ],
    weight: [
      { name: 'Kilogram (kg)',   code: 'kg',  factor: 1 },
      { name: 'Gram (g)',        code: 'g',   factor: 0.001 },
      { name: 'Milligram (mg)',  code: 'mg',  factor: 0.000001 },
      { name: 'Pound (lb)',      code: 'lb',  factor: 0.453592 },
      { name: 'Ounce (oz)',      code: 'oz',  factor: 0.0283495 },
      { name: 'Tonne (t)',       code: 't',   factor: 1000 },
      { name: 'US Ton',          code: 'ton', factor: 907.185 },
      { name: 'Stone (st)',      code: 'st',  factor: 6.35029 },
    ],
    temperature: [
      { name: 'Celsius (°C)',    code: 'C' },
      { name: 'Fahrenheit (°F)', code: 'F' },
      { name: 'Kelvin (K)',      code: 'K' },
    ],
    area: [
      { name: 'Square Meter (m²)',  code: 'm2',   factor: 1 },
      { name: 'Square km (km²)',    code: 'km2',  factor: 1e6 },
      { name: 'Square cm (cm²)',    code: 'cm2',  factor: 1e-4 },
      { name: 'Square ft (ft²)',    code: 'ft2',  factor: 0.092903 },
      { name: 'Square inch (in²)',  code: 'in2',  factor: 0.00064516 },
      { name: 'Acre',               code: 'acre', factor: 4046.86 },
      { name: 'Hectare (ha)',       code: 'ha',   factor: 10000 },
    ],
    speed: [
      { name: 'Meter/sec (m/s)',    code: 'ms',  factor: 1 },
      { name: 'Km/hour (km/h)',     code: 'kmh', factor: 0.277778 },
      { name: 'Mile/hour (mph)',    code: 'mph', factor: 0.44704 },
      { name: 'Knot (kn)',          code: 'kn',  factor: 0.514444 },
      { name: 'Foot/sec (ft/s)',    code: 'fts', factor: 0.3048 },
    ],
  };

  let currentType = 'length';

  /** Convert temperature (special case — not simple factor multiplication) */
  function convertTemperature(val, from, to) {
    // Convert from → Celsius first
    let celsius;
    switch (from) {
      case 'C': celsius = val; break;
      case 'F': celsius = (val - 32) * 5 / 9; break;
      case 'K': celsius = val - 273.15; break;
      default:  return NaN;
    }
    // Celsius → target
    switch (to) {
      case 'C': return celsius;
      case 'F': return (celsius * 9 / 5) + 32;
      case 'K': return celsius + 273.15;
      default:  return NaN;
    }
  }

  /**
   * Convert value between two units
   * @param {number} val
   * @param {string} fromCode
   * @param {string} toCode
   * @param {string} type
   * @returns {{ result: number, formula: string }}
   */
  function convert(val, fromCode, toCode, type) {
    if (isNaN(val)) return { result: NaN, formula: '' };

    if (type === 'temperature') {
      const result = convertTemperature(val, fromCode, toCode);
      const formulae = {
        'CF': `(${val}°C × 9/5) + 32`,
        'CK': `${val} + 273.15`,
        'FC': `(${val}°F − 32) × 5/9`,
        'FK': `(${val}°F − 32) × 5/9 + 273.15`,
        'KC': `${val} − 273.15`,
        'KF': `(${val} − 273.15) × 9/5 + 32`,
      };
      return { result, formula: formulae[fromCode + toCode] || '' };
    }

    const units  = UNITS[type];
    const fromU  = units.find(u => u.code === fromCode);
    const toU    = units.find(u => u.code === toCode);
    if (!fromU || !toU) return { result: NaN, formula: '' };

    const inBase = val * fromU.factor;
    const result = inBase / toU.factor;
    const formula = `${val} ${fromCode} × ${fromU.factor} ÷ ${toU.factor}`;
    return { result, formula };
  }

  /** Populate unit dropdowns */
  function populateSelects(type) {
    const units    = UNITS[type];
    const fromSel  = document.getElementById('fromUnit');
    const toSel    = document.getElementById('toUnit');
    if (!fromSel || !toSel) return;

    [fromSel, toSel].forEach((sel, i) => {
      const prev = sel.value;
      sel.innerHTML = units.map(u => `<option value="${u.code}">${u.name}</option>`).join('');
      // Default: from=first, to=second
      if (i === 1 && units.length > 1) sel.selectedIndex = 1;
      // Restore previous selection if still valid
      if (prev && units.find(u => u.code === prev)) sel.value = prev;
    });
  }

  function doConvert() {
    const val     = Utils.parseNum(document.getElementById('convInput').value);
    const fromCode = document.getElementById('fromUnit').value;
    const toCode   = document.getElementById('toUnit').value;
    const resultEl = document.getElementById('convResult');
    const formulaEl= document.getElementById('convFormula');

    if (isNaN(val)) { Utils.toast('Please enter a valid number'); return; }

    const { result, formula } = convert(val, fromCode, toCode, currentType);

    if (isNaN(result)) {
      resultEl.textContent = 'Invalid conversion';
      formulaEl.textContent = '';
    } else {
      const fromName = UNITS[currentType].find(u => u.code === fromCode)?.name || fromCode;
      const toName   = UNITS[currentType].find(u => u.code === toCode)?.name || toCode;
      resultEl.textContent = `${val} ${fromName} = ${parseFloat(result.toPrecision(8))} ${toName}`;
      formulaEl.textContent = formula ? `Formula: ${formula}` : '';
      History.add(`${val} ${fromCode} → ${toCode}`, Utils.formatNum(result));
    }
  }

  function init() {
    // Sub-tab switching
    document.querySelectorAll('#tab-converter .sub-tab[data-unit]').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#tab-converter .sub-tab').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentType = this.dataset.unit;
        populateSelects(currentType);
        document.getElementById('convResult').textContent = '';
        document.getElementById('convFormula').textContent = '';
      });
    });

    // Swap button
    document.getElementById('swapUnits')?.addEventListener('click', function () {
      const f = document.getElementById('fromUnit');
      const t = document.getElementById('toUnit');
      const tmp = f.value; f.value = t.value; t.value = tmp;
    });

    // Convert button
    document.getElementById('convertBtn')?.addEventListener('click', doConvert);

    // Auto-convert on input change
    ['convInput', 'fromUnit', 'toUnit'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', function () {
        if (document.getElementById('convInput').value) doConvert();
      });
    });

    populateSelects('length');
  }

  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 6: BMI CALCULATOR
   ══════════════════════════════════════════════════════════════ */
const BMICalc = (function () {

  let useMetric = true;

  /**
   * Determine BMI category
   * @param {number} bmi
   * @returns {{ cat: string, label: string, color: string, advice: string }}
   */
  function getCategory(bmi) {
    if (bmi < 18.5) return {
      cat: 'underweight', label: '⚡ Underweight', color: '#60aaff',
      advice: 'Your BMI indicates you are underweight. Consider consulting a nutritionist to develop a healthy weight-gain plan with balanced meals.'
    };
    if (bmi < 25) return {
      cat: 'normal', label: '✅ Normal Weight', color: '#50e890',
      advice: 'Great news! Your BMI is in the healthy range. Maintain this with regular physical activity and a balanced diet.'
    };
    if (bmi < 30) return {
      cat: 'overweight', label: '⚠️ Overweight', color: '#ffc832',
      advice: 'Your BMI indicates you are overweight. Regular exercise (30 min/day) and reduced calorie intake can help achieve a healthy weight.'
    };
    return {
      cat: 'obese', label: '🔴 Obese', color: '#e05080',
      advice: 'Your BMI is in the obese range. Please consult a healthcare professional for a personalized weight management plan.'
    };
  }

  /** Calculate marker position (0–100%) on the BMI scale bar
   *  Scale: 10 → 0%, 40 → 100%
   */
  function markerPos(bmi) {
    return Utils.clamp(((bmi - 10) / 30) * 100, 2, 98);
  }

  function calculate() {
    const w = Utils.parseNum(document.getElementById('bmiWeight').value);
    const h = Utils.parseNum(document.getElementById('bmiHeight').value);
    const resultDiv = document.getElementById('bmiResult');

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      Utils.toast('Please enter valid weight and height'); return;
    }

    let bmi;
    if (useMetric) {
      // Metric: weight kg, height cm
      const hm = h / 100; // convert cm to m
      bmi = w / (hm * hm);
    } else {
      // Imperial: weight lbs, height inches
      bmi = (w / (h * h)) * 703;
    }

    bmi = Math.round(bmi * 10) / 10;
    const { cat, label, color, advice } = getCategory(bmi);

    document.getElementById('bmiScore').textContent  = bmi.toFixed(1);
    document.getElementById('bmiScore').style.color  = color;
    document.getElementById('bmiLabel').textContent  = label;
    document.getElementById('bmiLabel').style.color  = color;
    document.getElementById('bmiAdvice').textContent = advice;
    document.getElementById('bmiMarker').style.left  = markerPos(bmi) + '%';

    // Highlight active range
    document.querySelectorAll('.bmi-range').forEach(el => {
      el.classList.toggle('current', el.dataset.cat === cat);
    });

    resultDiv.classList.remove('hidden');
    History.add(`BMI (${w}${useMetric?'kg':'lb'}, ${h}${useMetric?'cm':'in'})`, bmi.toFixed(1));
  }

  function init() {
    // Unit system toggle
    document.querySelectorAll('#tab-bmi .sub-tab[data-bmi-unit]').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#tab-bmi .sub-tab').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        useMetric = this.dataset.bmiUnit === 'metric';
        document.getElementById('bmiWeightLabel').textContent = useMetric ? 'Weight (kg)' : 'Weight (lbs)';
        document.getElementById('bmiHeightLabel').textContent = useMetric ? 'Height (cm)' : 'Height (inches)';
        document.getElementById('bmiResult').classList.add('hidden');
      });
    });
    document.getElementById('calcBmi')?.addEventListener('click', calculate);
  }

  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 7: AGE CALCULATOR
   ══════════════════════════════════════════════════════════════ */
const AgeCalc = (function () {

  /**
   * Calculate precise age between two dates
   * @param {Date} birth
   * @param {Date} target
   * @returns {{ years, months, days, totalDays, totalMonths, totalWeeks, totalHours }}
   */
  function calcAge(birth, target) {
    let years  = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    let days   = target.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) { years -= 1; months += 12; }

    const msPerDay  = 1000 * 60 * 60 * 24;
    const totalDays = Math.floor((target - birth) / msPerDay);
    return {
      years, months, days,
      totalDays,
      totalWeeks: Math.floor(totalDays / 7),
      totalMonths: years * 12 + months,
      totalHours: totalDays * 24
    };
  }

  /** Get next birthday from today */
  function nextBirthday(birth, today) {
    const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (next <= today) next.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function calculate() {
    const birthVal  = document.getElementById('birthDate').value;
    const targetVal = document.getElementById('targetDate').value;

    if (!birthVal) { Utils.toast('Please select your date of birth'); return; }

    const birth  = new Date(birthVal);
    const target = targetVal ? new Date(targetVal) : new Date();

    if (birth > target) { Utils.toast('Birth date cannot be in the future'); return; }

    const age     = calcAge(birth, target);
    const daysToB = nextBirthday(birth, new Date());

    // Primary display
    document.getElementById('agePrimary').innerHTML =
      `${age.years} <small style="font-size:1rem;color:var(--text-secondary)">years</small> ` +
      `${age.months} <small style="font-size:1rem;color:var(--text-secondary)">months</small> ` +
      `${age.days} <small style="font-size:1rem;color:var(--text-secondary)">days</small>`;

    // Detail tiles
    document.getElementById('ageDetails').innerHTML = `
      <div class="age-tile"><div class="val">${age.totalDays.toLocaleString()}</div><div class="lbl">Total Days</div></div>
      <div class="age-tile"><div class="val">${age.totalWeeks.toLocaleString()}</div><div class="lbl">Total Weeks</div></div>
      <div class="age-tile"><div class="val">${age.totalMonths.toLocaleString()}</div><div class="lbl">Total Months</div></div>
    `;

    // Fun facts
    document.getElementById('ageFun').innerHTML =
      `⏰ <b>${age.totalHours.toLocaleString()}</b> hours lived<br>` +
      `🎂 <b>${daysToB}</b> days until next birthday<br>` +
      `💓 Approx. <b>${(age.totalDays * 100800).toLocaleString()}</b> heartbeats (70 bpm avg)`;

    document.getElementById('ageResult').classList.remove('hidden');
    History.add(`Age from ${birthVal}`, `${age.years}y ${age.months}m ${age.days}d`);
  }

  function init() {
    // Set default dates
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('targetDate').value = todayStr;
    document.getElementById('birthDate').max = todayStr;

    document.getElementById('calcAge')?.addEventListener('click', calculate);
  }

  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 8: EMI CALCULATOR
   ══════════════════════════════════════════════════════════════ */
const EMICalc = (function () {

  /**
   * EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1)
   * @param {number} principal
   * @param {number} annualRate (%)
   * @param {number} tenureMonths
   * @returns {{ emi, totalPayment, totalInterest }}
   */
  function calcEMI(principal, annualRate, tenureMonths) {
    const r = (annualRate / 100) / 12;  // Monthly interest rate

    // Edge case: zero interest rate
    if (r === 0) {
      const emi = principal / tenureMonths;
      return { emi, totalPayment: principal, totalInterest: 0 };
    }

    const rn  = Math.pow(1 + r, tenureMonths);
    const emi = (principal * r * rn) / (rn - 1);
    const totalPayment  = emi * tenureMonths;
    const totalInterest = totalPayment - principal;

    return { emi, totalPayment, totalInterest };
  }

  /** Draw a simple pie chart on canvas (no external lib) */
  function drawPie(principal, interest) {
    const canvas = document.getElementById('emiPie');
    if (!canvas || !canvas.getContext) return;
    const ctx    = canvas.getContext('2d');
    const cx = 100, cy = 100, r = 80;
    const total = principal + interest;
    const slice1 = (principal / total) * 2 * Math.PI;  // Principal slice
    ctx.clearRect(0, 0, 200, 200);

    // Principal slice
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + slice1);
    ctx.closePath();
    ctx.fillStyle = '#60aaff'; ctx.fill();

    // Interest slice
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2 + slice1, -Math.PI / 2 + 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#e05080'; ctx.fill();

    // Centre hole (donut style)
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, 2 * Math.PI);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card') || '#13131a';
    ctx.fill();
  }

  function calculate() {
    const P = Utils.parseNum(document.getElementById('emiPrincipal').value);
    const R = Utils.parseNum(document.getElementById('emiRate').value);
    const N = Utils.parseNum(document.getElementById('emiTenure').value);

    if (isNaN(P) || P <= 0) { Utils.toast('Enter a valid loan amount'); return; }
    if (isNaN(R) || R <= 0) { Utils.toast('Enter a valid interest rate'); return; }
    if (isNaN(N) || N <= 0) { Utils.toast('Enter a valid tenure'); return; }

    const { emi, totalPayment, totalInterest } = calcEMI(P, R, N);

    document.getElementById('emiMain').textContent = `Monthly EMI: ${Utils.formatCurrency(emi)}`;
    document.getElementById('emiBreakdown').innerHTML = `
      <div class="emi-tile"><div class="lbl">Principal Amount</div><div class="val" style="color:var(--accent2)">${Utils.formatCurrency(P)}</div></div>
      <div class="emi-tile"><div class="lbl">Total Interest</div><div class="val" style="color:var(--accent4)">${Utils.formatCurrency(totalInterest)}</div></div>
      <div class="emi-tile"><div class="lbl">Total Payment</div><div class="val" style="color:var(--accent)">${Utils.formatCurrency(totalPayment)}</div></div>
      <div class="emi-tile"><div class="lbl">Tenure</div><div class="val">${N} months</div></div>
    `;

    document.getElementById('pieLegend').innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:#60aaff"></span>Principal: ${((P/totalPayment)*100).toFixed(1)}%</div>
      <div class="legend-item"><span class="legend-dot" style="background:#e05080"></span>Interest: ${((totalInterest/totalPayment)*100).toFixed(1)}%</div>
    `;

    document.getElementById('emiResult').classList.remove('hidden');
    drawPie(P, totalInterest);
    History.add(`EMI ₹${P} @${R}% ${N}mo`, Utils.formatCurrency(emi));
  }

  function init() {
    document.getElementById('calcEmi')?.addEventListener('click', calculate);
  }

  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 9: CURRENCY CONVERTER (Offline Demo)
   ══════════════════════════════════════════════════════════════ */
const CurrencyConverter = (function () {

  /**
   * Static exchange rates — USD as base (approximate reference rates)
   * For a production app, these would be fetched from an API
   */
  const RATES = {
    USD: { name: 'US Dollar',          symbol: '$',   rate: 1       },
    EUR: { name: 'Euro',               symbol: '€',   rate: 0.85    },
    GBP: { name: 'British Pound',      symbol: '£',   rate: 0.74    },
    INR: { name: 'Indian Rupee',       symbol: '₹',   rate: 93.38   },
    JPY: { name: 'Japanese Yen',       symbol: '¥',   rate: 158.87  },
    CNY: { name: 'Chinese Yuan',       symbol: '¥',   rate: 6.81    },
    AUD: { name: 'Australian Dollar',  symbol: 'A$',  rate: 1.40    },
    CAD: { name: 'Canadian Dollar',    symbol: 'C$',  rate: 1.37    },
    CHF: { name: 'Swiss Franc',        symbol: 'Fr',  rate: 0.85    },
    SGD: { name: 'Singapore Dollar',   symbol: 'S$',  rate: 1.27    },
    HKD: { name: 'Hong Kong Dollar',   symbol: 'HK$', rate: 7.81    },
    MYR: { name: 'Malaysian Ringgit',  symbol: 'RM',  rate: 3.95    },
    SAR: { name: 'Saudi Riyal',        symbol: '﷼',  rate: 3.75    },
    AED: { name: 'UAE Dirham',         symbol: 'د.إ', rate: 3.67     },
    KRW: { name: 'South Korean Won',   symbol: '₩',   rate: 1481.4  },
    BRL: { name: 'Brazilian Real',     symbol: 'R$',  rate: 4.99    },
    ZAR: { name: 'South African Rand', symbol: 'R',   rate: 18.42   },
  };

  /**
   * Convert amount from one currency to another
   * All conversions go through USD as intermediate base
   */
  function convert(amount, fromCode, toCode) {
    const from = RATES[fromCode];
    const to   = RATES[toCode];
    if (!from || !to || isNaN(amount)) return NaN;
    const inUSD = amount / from.rate;
    return inUSD * to.rate;
  }

  function populateSelects() {
    const fromSel = document.getElementById('fromCurr');
    const toSel   = document.getElementById('toCurr');
    if (!fromSel || !toSel) return;

    const options = Object.entries(RATES)
      .map(([code, d]) => `<option value="${code}">${code} — ${d.name}</option>`)
      .join('');

    fromSel.innerHTML = options;
    toSel.innerHTML   = options;
    fromSel.value = 'USD';
    toSel.value   = 'INR';
  }

  function doConvert() {
    const amount   = Utils.parseNum(document.getElementById('currAmount').value);
    const fromCode = document.getElementById('fromCurr').value;
    const toCode   = document.getElementById('toCurr').value;

    if (isNaN(amount) || amount < 0) { Utils.toast('Enter a valid amount'); return; }

    const result = convert(amount, fromCode, toCode);
    const from   = RATES[fromCode];
    const to     = RATES[toCode];

    document.getElementById('currResult').textContent =
      `${from.symbol}${amount.toLocaleString()} = ${to.symbol}${parseFloat(result.toFixed(4)).toLocaleString()}`;
    document.getElementById('currRate').textContent =
      `1 ${fromCode} = ${parseFloat((RATES[toCode].rate / RATES[fromCode].rate).toFixed(6))} ${toCode} (reference rate)`;

    // Show quick reference grid for common currencies from the fromCode
    const topCodes = ['USD','EUR','GBP','INR','JPY','AUD','CAD','SGD'];
    const inFrom = 1;
    document.getElementById('currGrid').innerHTML = topCodes.map(code => {
      const val = convert(inFrom, fromCode, code);
      return `<div class="curr-chip"><div class="code">${code}</div><div class="rate">${parseFloat(val.toFixed(4))}</div></div>`;
    }).join('');

    History.add(`${amount} ${fromCode} → ${toCode}`, `${to.symbol}${parseFloat(result.toFixed(2))}`);
  }

  function init() {
    populateSelects();
    document.getElementById('convertCurr')?.addEventListener('click', doConvert);
    document.getElementById('swapCurr')?.addEventListener('click', function () {
      const f = document.getElementById('fromCurr');
      const t = document.getElementById('toCurr');
      const tmp = f.value; f.value = t.value; t.value = tmp;
    });
  }

  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   MODULE 10: UI — Tabs, Theme, Splash, Keyboard shortcuts
   ══════════════════════════════════════════════════════════════ */
const UI = (function () {

  let currentTheme = localStorage.getItem('calcpro_theme') || 'dark';

  /** Apply theme to root element */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('calcpro_theme', theme);
  }

  /** Toggle between dark and light mode */
  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
  }

  /** Switch to a tab by name */
  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
      btn.setAttribute('aria-selected', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
  }

  /** Show/hide history overlay */
  function showHistory() {
    History.render();
    document.getElementById('historyOverlay').classList.remove('hidden');
  }
  function hideHistory() {
    document.getElementById('historyOverlay').classList.add('hidden');
  }

  /** Splash screen dismissal */
  function hideSplash() {
    const splash = document.getElementById('splash');
    const app    = document.getElementById('app');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.classList.add('hidden');
      app.classList.remove('hidden');
    }, 500);
  }

  function init() {
    // Apply saved theme
    applyTheme(currentTheme);

    // Splash: dismiss after load animation (1.8s fill + 0.3s grace)
    setTimeout(hideSplash, 2200);

    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function () { switchTab(this.dataset.tab); });
    });

    // History panel
    document.getElementById('historyBtn')?.addEventListener('click', showHistory);
    document.getElementById('closeHistory')?.addEventListener('click', hideHistory);
    document.getElementById('historyOverlay')?.addEventListener('click', function (e) {
      if (e.target === this) hideHistory();
    });
    document.getElementById('clearHistory')?.addEventListener('click', function () {
      History.clear();
      Utils.toast('History cleared');
    });

    // Keyboard: Escape closes overlay
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideHistory();
    });

    // Prevent pull-to-refresh on mobile (UX improvement)
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
  }

  return { init };
})();


/* ══════════════════════════════════════════════════════════════
   APPLICATION BOOTSTRAP — Entry point
   ══════════════════════════════════════════════════════════════ */
(function bootstrap() {
  document.addEventListener('DOMContentLoaded', function () {
    // Initialise all modules in order
    History.load();
    UI.init();
    BasicCalc.init();
    SciCalc.init();
    UnitConverter.init();
    BMICalc.init();
    AgeCalc.init();
    EMICalc.init();
    CurrencyConverter.init();

    // Service Worker registration for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // SW registration failed silently — app still works
      });
    }
  });
})();
