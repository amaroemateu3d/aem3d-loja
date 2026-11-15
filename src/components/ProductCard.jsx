import { useState } from 'react';
import { formatBRL, calcPixPrice } from '../services/catalogo';

export default function ProductCard({ product, onSelect }) {
  const variacoesAtivas = (product.variacoes || []).filter((v) => Number(v.estoque || 0) > 0);
  const [selectedVarIdx, setSelectedVarIdx] = useState(0);

  const activeVar = variacoesAtivas[selectedVarIdx] || null;
  const mainPhoto =
    activeVar?.foto ||
    product.fotos?.[0] ||
    '/logo.png';

  const hasPrice = Number(product.preco || 0) > 0;
  const pixPrice = calcPixPrice(product.preco);
  const installment = Number(product.preco || 0) / 12;

  return (
    <article
      className="product-card"
      onClick={() => onSelect(product, activeVar)}
    >
      <div className="product-img-wrap">
        <img src={mainPhoto} alt={product.titulo} loading="lazy" />
        {hasPrice && <span className="product-badge-pix">5% OFF PIX</span>}
      </div>

      {variacoesAtivas.length > 0 && (
        <div
          className="swatch-row"
          onClick={(e) => e.stopPropagation()}
        >
          {variacoesAtivas.slice(0, 6).map((v, idx) =>
            v.foto ? (
              <button
                key={v.id || idx}
                type="button"
                className={`swatch-btn ${idx === selectedVarIdx ? 'active' : ''}`}
                title={v.nome}
                onClick={() => setSelectedVarIdx(idx)}
              >
                <img src={v.foto} alt={v.nome} />
              </button>
            ) : (
              <button
                key={v.id || idx}
                type="button"
                className={`swatch-text-pill ${idx === selectedVarIdx ? 'active' : ''}`}
                title={v.nome}
                onClick={() => setSelectedVarIdx(idx)}
              >
                {v.nome}
              </button>
            )
          )}
          {variacoesAtivas.length > 6 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              +{variacoesAtivas.length - 6}
            </span>
          )}
        </div>
      )}

      <h3 className="product-title">{product.titulo}</h3>

      {hasPrice ? (
        <>
          <div className="product-price-main">{formatBRL(product.preco)}</div>
          <div className="product-price-pix">
            {formatBRL(pixPrice)} no Pix
          </div>
          <div className="product-price-installments">
            ou 12x de {formatBRL(installment)}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
          Consulte o valor
        </div>
      )}
    </article>
  );
}
