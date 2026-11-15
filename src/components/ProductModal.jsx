import { useState, useEffect } from 'react';
import { X, ShoppingBag, Check, Package, MessageCircle } from 'lucide-react';
import { formatBRL, calcPixPrice } from '../services/catalogo';
import { MODO_VITRINE, WHATSAPP_LOJA } from '../supabaseClient';

export default function ProductModal({ product, initialVariation, onClose, onAddToCart }) {
  const variacoes = Array.isArray(product?.variacoes) ? product.variacoes : [];
  const availableVars = variacoes.filter((v) => Number(v.estoque || 0) > 0);

  const [selectedVar, setSelectedVar] = useState(
    initialVariation && Number(initialVariation.estoque || 0) > 0
      ? initialVariation
      : availableVars[0] || null
  );

  const allPhotos = Array.from(
    new Set([
      ...(selectedVar?.foto ? [selectedVar.foto] : []),
      ...(product?.fotos || []),
    ].filter(Boolean))
  );

  const [activePhoto, setActivePhoto] = useState(allPhotos[0] || '/logo.png');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (selectedVar?.foto) {
      setActivePhoto(selectedVar.foto);
    } else if (product?.fotos?.[0]) {
      setActivePhoto(product.fotos[0]);
    }
    setQty(1);
  }, [selectedVar, product]);

  if (!product) return null;

  const maxStock = selectedVar
    ? Math.max(0, Number(selectedVar.estoque || 0))
    : Math.max(0, Number(product.estoque || 0));

  const hasPrice = Number(product.preco || 0) > 0;
  const pixPrice = calcPixPrice(product.preco);

  const handleAdd = () => {
    if (!hasPrice || maxStock <= 0) return;
    onAddToCart({
      ft_id: product.ft_id,
      titulo: product.titulo,
      preco: Number(product.preco),
      foto: selectedVar?.foto || product.fotos?.[0] || '/logo.png',
      variacaoId: selectedVar?.id || '',
      variacaoNome: selectedVar?.nome || '',
      sku: selectedVar?.sku || '',
      medida_com_caixa: product.medida_com_caixa || '',
      peso_com_caixa: product.peso_com_caixa || '',
      maxStock,
      qty,
    });
    onClose();
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        {/* Coluna de Fotos */}
        <div>
          <div
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
            }}
          >
            <img
              src={activePhoto}
              alt={product.titulo}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          {allPhotos.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {allPhotos.map((url, idx) => (
                <button
                  key={`${url}_${idx}`}
                  type="button"
                  onClick={() => setActivePhoto(url)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: activePhoto === url ? '2px solid var(--brand-purple)' : '1px solid var(--border-color)',
                    padding: '4px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Coluna de Informações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.25 }}>
              {product.titulo}
            </h2>
            {maxStock > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '6px' }}>
                <Check size={14} /> Em estoque ({maxStock} {maxStock === 1 ? 'unidade' : 'unidades'})
              </span>
            )}
          </div>

          {hasPrice ? (
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatBRL(product.preco)}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {formatBRL(pixPrice)} à vista no Pix (5% de desconto)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                ou em até 12x de {formatBRL(product.preco / 12)} no cartão
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Produto em atualização de preço — consulte via WhatsApp.
            </div>
          )}

          {/* Seletor de Variações */}
          {variacoes.length > 0 && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Escolha a variação: <strong style={{ color: 'var(--text-primary)' }}>{selectedVar?.nome}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {variacoes.map((v, idx) => {
                  const stock = Number(v.estoque || 0);
                  const isSelected = selectedVar?.id === v.id;
                  const disabled = stock <= 0;
                  return (
                    <button
                      key={v.id || idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedVar(v)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '6px 11px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--brand-purple)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(124, 58, 237, 0.06)' : '#ffffff',
                        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontSize: '0.83rem',
                        fontWeight: 600,
                        opacity: disabled ? 0.5 : 1,
                        textDecoration: disabled ? 'line-through' : 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {v.foto && (
                        <img
                          src={v.foto}
                          alt={v.nome}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                      )}
                      <span>{v.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantidade + Botão Comprar (ou Modo Vitrine) */}
          {MODO_VITRINE ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#92400E',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                🚧 Vendas pelo site estão sendo finalizadas. Você já pode consultar modelos e valores ou chamar no WhatsApp:
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(
                  `Olá! Tenho interesse no produto: ${product.titulo}${selectedVar?.nome ? ` (${selectedVar.nome})` : ''}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-brand"
                style={{ textDecoration: 'none', background: '#10b981' }}
              >
                <MessageCircle size={18} />
                Consultar / Pedir pelo WhatsApp
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  style={{ width: '36px', height: '44px', border: 'none', background: '#fff', fontSize: '1.1rem', fontWeight: 700 }}
                >
                  -
                </button>
                <span style={{ width: '38px', textAlign: 'center', fontWeight: 700, fontSize: '0.92rem' }}>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxStock || 1, q + 1))}
                  style={{ width: '36px', height: '44px', border: 'none', background: '#fff', fontSize: '1.1rem', fontWeight: 700 }}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn-primary-brand"
                disabled={!hasPrice || maxStock <= 0}
                onClick={handleAdd}
              >
                <ShoppingBag size={18} />
                {!hasPrice ? 'Preço indisponível' : maxStock <= 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}
              </button>
            </div>
          )}

          {/* Descrição */}
          {product.descricao && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '4px' }}>
              <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} /> Descrição do Produto
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                {product.descricao}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
