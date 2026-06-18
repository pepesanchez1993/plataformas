/**
 * Lógica de cálculo de hipoteca (España) — sistema de amortización francés.
 *
 * Funciones puras, sin dependencias. Reutilizable en navegador y en Node.
 * Importes en euros; tipos como porcentaje anual (p. ej. 2.5 = 2,5%).
 *
 * Ajustada al mercado de junio 2026:
 *   - Productos: fija, variable (Euríbor + diferencial) y mixta.
 *   - Euríbor 12M de referencia ≈ 2,80% (junio 2026).
 *   - Cálculo de TAE por TIR incluyendo comisión de apertura y vinculaciones.
 */

const MONTHS_PER_YEAR = 12;

/** Euríbor 12M de referencia (media provisional junio 2026, % anual). */
const EURIBOR_REF = 2.8;

/** Tipos de ITP (tipo general orientativo, vivienda usada) por CCAA — 2026. */
const ITP_BY_CCAA = {
  'Andalucía': 7,
  'Aragón': 8,
  'Asturias': 8,
  'Baleares': 8,
  'Canarias': 6.5,
  'Cantabria': 9,
  'Castilla-La Mancha': 9,
  'Castilla y León': 8,
  'Cataluña': 10,
  'Comunidad Valenciana': 10,
  'Extremadura': 8,
  'Galicia': 8,
  'Madrid': 6,
  'Murcia': 8,
  'Navarra': 6,
  'País Vasco': 7,
  'La Rioja': 7,
};

const round = (x) => Math.round(x);

/** Convierte un TIN anual (%) a tipo mensual en tanto por uno. */
function monthlyRate(annualRatePct) {
  return annualRatePct / 100 / MONTHS_PER_YEAR;
}

/**
 * Cuota constante (sistema francés) para un capital, tipo mensual y nº de cuotas.
 *   cuota = P · i / (1 − (1 + i)^−n)
 */
function paymentFor(principal, monthlyI, n) {
  if (n <= 0) throw new Error('El plazo debe ser mayor que 0');
  if (principal <= 0) return 0;
  if (monthlyI === 0) return principal / n;
  return (principal * monthlyI) / (1 - Math.pow(1 + monthlyI, -n));
}

/** Cuota mensual constante a TIN fijo (atajo para producto fijo). */
function monthlyPayment(principal, annualRatePct, years) {
  const n = round(years * MONTHS_PER_YEAR);
  return paymentFor(principal, monthlyRate(annualRatePct), n);
}

/**
 * Cuadro de amortización a tipo fijo.
 * Devuelve { payment, totalPaid, totalInterest, schedule[] }.
 */
function amortizationSchedule(principal, annualRatePct, years) {
  const n = round(years * MONTHS_PER_YEAR);
  const rates = new Array(n).fill(annualRatePct);
  const r = amortizationVariable(principal, rates);
  return { payment: r.firstPayment, totalPaid: r.totalPaid, totalInterest: r.totalInterest, schedule: r.schedule };
}

/**
 * Cuadro de amortización con tipo variable mes a mes.
 * En cada cambio de tipo se recalcula la cuota sobre el capital pendiente y los
 * meses restantes — exactamente como hace la revisión de una hipoteca real.
 *
 * @param {number} principal
 * @param {number[]} monthlyRates  TIN anual (%) aplicable a cada mes (longitud = nº cuotas).
 */
function amortizationVariable(principal, monthlyRates) {
  const n = monthlyRates.length;
  if (n <= 0) throw new Error('El plazo debe ser mayor que 0');

  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  let payment = 0;

  for (let m = 1; m <= n; m++) {
    const annual = monthlyRates[m - 1];
    const i = monthlyRate(annual);
    const prev = m === 1 ? null : monthlyRates[m - 2];
    if (m === 1 || annual !== prev) {
      payment = paymentFor(balance, i, n - m + 1);
    }
    const interest = balance * i;
    let principalPart = payment - interest;
    if (m === n) principalPart = balance; // cierre exacto del saldo
    balance = Math.max(0, balance - principalPart);
    totalInterest += interest;
    schedule.push({
      month: m,
      rate: annual,
      payment: m === n ? principalPart + interest : payment,
      interest,
      principalPart,
      balance,
    });
  }

  return {
    firstPayment: schedule.length ? schedule[0].payment : 0,
    totalInterest,
    totalPaid: principal + totalInterest,
    schedule,
  };
}

/**
 * Construye el vector de tipos (TIN anual %) mes a mes según el producto.
 * @param {object} o
 * @param {('fija'|'variable'|'mixta')} o.product
 * @param {number} o.years
 * @param {number} [o.fixedRatePct]        TIN fijo (producto fija).
 * @param {number} [o.euribor]             Euríbor de referencia (variable/mixta).
 * @param {number} [o.differentialPct]     Diferencial sobre Euríbor.
 * @param {number} [o.firstYearRatePct]    Tipo bonificado del primer año (variable), opcional.
 * @param {number} [o.mixedFixedYears]     Años del tramo fijo (mixta).
 * @param {number} [o.mixedFixedRatePct]   TIN del tramo fijo (mixta).
 */
function ratePlan(o) {
  const {
    product,
    years,
    fixedRatePct = 2.5,
    euribor = EURIBOR_REF,
    differentialPct = 0.75,
    firstYearRatePct = null,
    mixedFixedYears = 10,
    mixedFixedRatePct = 2.3,
  } = o;

  const n = round(years * MONTHS_PER_YEAR);
  const arr = new Array(n);
  const variableRate = round((euribor + differentialPct) * 1e6) / 1e6;

  if (product === 'variable') {
    for (let m = 0; m < n; m++) {
      arr[m] = firstYearRatePct != null && m < MONTHS_PER_YEAR ? firstYearRatePct : variableRate;
    }
  } else if (product === 'mixta') {
    const fixedMonths = round(mixedFixedYears * MONTHS_PER_YEAR);
    for (let m = 0; m < n; m++) {
      arr[m] = m < fixedMonths ? mixedFixedRatePct : variableRate;
    }
  } else {
    // fija
    arr.fill(fixedRatePct);
  }
  return arr;
}

/**
 * TAE estimada por TIR (tasa interna de retorno) mensual capitalizada a anual.
 * Iguala el capital neto recibido al valor actual de todos los pagos del prestatario.
 * Incluye comisión de apertura, vinculaciones mensuales (seguros, etc.) y costes
 * únicos exigidos para conceder el préstamo (p. ej. tasación).
 */
function annualPercentageRate(o) {
  const {
    principal,
    monthlyRates,
    openingCommissionPct = 0,
    monthlyExtraCost = 0,
    oneOffCosts = 0,
  } = o;
  if (principal <= 0) return 0;

  const { schedule } = amortizationVariable(principal, monthlyRates);
  const flows = schedule.map((r) => r.payment + monthlyExtraCost);
  const net = principal - principal * (openingCommissionPct / 100) - oneOffCosts;

  const npv = (i) => flows.reduce((s, f, idx) => s + f / Math.pow(1 + i, idx + 1), 0) - net;

  // Bisección: npv(0) > 0 (se paga más de lo recibido), npv decrece con i.
  let lo = 0;
  let hi = 1; // 100% mensual: cota superior holgada
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  const iMonthly = (lo + hi) / 2;
  return (Math.pow(1 + iMonthly, MONTHS_PER_YEAR) - 1) * 100;
}

/**
 * Gastos de compraventa en España.
 * Usada: ITP (% según CCAA). Nueva: IVA (10%) + AJD (% según CCAA).
 * Más notaría, registro, gestoría y tasación.
 */
function purchaseCosts(opts) {
  const {
    price,
    type = 'usada',
    itpPct = 8,
    ivaPct = 10,
    ajdPct = 1.5,
    notary = estimateNotary(price),
    registry = estimateRegistry(price),
    agency = 350,
    appraisal = 350,
  } = opts;

  let tax;
  let taxLabel;
  if (type === 'nueva') {
    tax = price * (ivaPct / 100) + price * (ajdPct / 100);
    taxLabel = `IVA (${ivaPct}%) + AJD (${ajdPct}%)`;
  } else {
    tax = price * (itpPct / 100);
    taxLabel = `ITP (${itpPct}%)`;
  }

  const items = [
    { label: taxLabel, amount: tax },
    { label: 'Notaría', amount: notary },
    { label: 'Registro', amount: registry },
    { label: 'Gestoría', amount: agency },
    { label: 'Tasación', amount: appraisal },
  ];
  const total = items.reduce((s, it) => s + it.amount, 0);
  return { items, total };
}

/** Estimación orientativa de notaría según precio. */
function estimateNotary(price) {
  if (price <= 0) return 0;
  return Math.max(600, Math.min(price * 0.004, 1200));
}

/** Estimación orientativa de registro según precio. */
function estimateRegistry(price) {
  if (price <= 0) return 0;
  return Math.max(400, Math.min(price * 0.0025, 800));
}

function describeProduct(p) {
  if (!p) return 'Tipo fijo';
  if (p.product === 'variable') {
    return `Variable · Euríbor ${p.euribor ?? EURIBOR_REF}% + ${p.differentialPct ?? 0.75}%`;
  }
  if (p.product === 'mixta') {
    return `Mixta · ${p.mixedFixedRatePct ?? 2.3}% los ${p.mixedFixedYears ?? 10} años, luego Euríbor + ${p.differentialPct ?? 0.75}%`;
  }
  return `Fija · ${p.fixedRatePct ?? 2.5}%`;
}

/**
 * Resumen completo de la operación.
 * @param {object} opts
 * @param {number} opts.price
 * @param {number} opts.downPayment
 * @param {number} opts.years
 * @param {('usada'|'nueva')} [opts.type]            Tipo de vivienda (impuesto).
 * @param {number} [opts.annualRatePct]              TIN fijo (modo simple, si no hay `product`).
 * @param {object} [opts.product]                    Config de producto para ratePlan().
 * @param {number} [opts.openingCommissionPct]       Comisión de apertura (%).
 * @param {number} [opts.monthlyExtraCost]           Coste mensual de vinculaciones (€).
 * @param {object} [opts.costOverrides]              Overrides para purchaseCosts.
 */
function summarize(opts) {
  const { price, downPayment, years, type = 'usada', costOverrides = {} } = opts;
  const loanAmount = Math.max(0, price - downPayment);
  const months = round(years * MONTHS_PER_YEAR);

  let monthlyRates;
  let productLabel;
  if (opts.product) {
    monthlyRates = ratePlan({ ...opts.product, years });
    productLabel = describeProduct(opts.product);
  } else {
    const r = opts.annualRatePct ?? 0;
    monthlyRates = new Array(months).fill(r);
    productLabel = `Fija · ${r}%`;
  }

  const amort = amortizationVariable(loanAmount, monthlyRates);
  const costs = purchaseCosts({ price, type, ...costOverrides });
  const ltv = price > 0 ? (loanAmount / price) * 100 : 0;
  const upfrontCash = downPayment + costs.total;

  const tae = annualPercentageRate({
    principal: loanAmount,
    monthlyRates,
    openingCommissionPct: opts.openingCommissionPct || 0,
    monthlyExtraCost: opts.monthlyExtraCost || 0,
    oneOffCosts: 0,
  });

  const payments = amort.schedule.map((s) => s.payment);
  const minPayment = payments.length ? Math.min(...payments) : 0;
  const maxPayment = payments.length ? Math.max(...payments) : 0;

  return {
    loanAmount,
    ltv,
    monthlyPayment: amort.firstPayment,
    minPayment,
    maxPayment,
    paymentVaries: maxPayment - minPayment > 0.01,
    totalInterest: amort.totalInterest,
    totalPaid: amort.totalPaid,
    tae,
    productLabel,
    monthlyRates,
    costs,
    upfrontCash,
    schedule: amort.schedule,
  };
}

const api = {
  MONTHS_PER_YEAR,
  EURIBOR_REF,
  ITP_BY_CCAA,
  monthlyRate,
  paymentFor,
  monthlyPayment,
  amortizationSchedule,
  amortizationVariable,
  ratePlan,
  annualPercentageRate,
  purchaseCosts,
  estimateNotary,
  estimateRegistry,
  describeProduct,
  summarize,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else if (typeof window !== 'undefined') {
  window.Mortgage = api;
}
