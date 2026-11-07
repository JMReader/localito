const DISABLED_CURRENCIES = ["ARGt", "USDT", "USDC", "DAI"];

export default function CurrencyBar() {
  return (
    <section className="card currency-card" aria-labelledby="currency-title">
      <div className="section-head section-head-compact">
        <h2 id="currency-title" className="section-title">
          Moneda
        </h2>
        <span className="demo-chip">sólo demo</span>
      </div>

      <div className="currency-list" role="group" aria-label="Monedas">
        <button
          type="button"
          className="currency-pill is-active"
          aria-pressed="true"
        >
          TL
          <span>localito</span>
        </button>
        {DISABLED_CURRENCIES.map((currency) => (
          <button
            key={currency}
            type="button"
            className="currency-pill"
            disabled
            title={`${currency} no está disponible en esta demo`}
          >
            {currency}
          </button>
        ))}
      </div>

      <p className="section-hint">
        ARGt, USDT, USDC, DAI, swap y depósito están deshabilitados: esta demo
        corre únicamente con la moneda local sobre un ledger SQLite.
      </p>
    </section>
  );
}
