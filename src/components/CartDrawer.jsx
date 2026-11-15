import { useState } from 'react';
import { X, Trash2, Truck, CreditCard, QrCode, CheckCircle2 } from 'lucide-react';
import { formatBRL } from '../services/catalogo';
import { supabase, EMPRESA_ID, MODO_VITRINE } from '../supabaseClient';

export default function CartDrawer({
  isOpen,
  onClose,
  items = [],
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) {
  const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
  const [cep, setCep] = useState('');
  const [freteOptions, setFreteOptions] = useState([]);
  const [selectedFrete, setSelectedFrete] = useState(null);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [freteMsg, setFreteMsg] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [customer, setCustomer] = useState({
    nome: '',
    cpf: '',
    email: '',
    whatsapp: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.preco * item.qty, 0);
  const descontoPix = paymentMethod === 'pix' ? subtotal * 0.05 : 0;
  const freteValor = Number(selectedFrete?.price || 0);
  const total = Math.max(0, subtotal - descontoPix + freteValor);

  const handleCepLookup = async (rawCep) => {
    const clean = rawCep.replace(/\D/g, '').slice(0, 8);
    setCep(clean);
    if (clean.length !== 8) return;

    setLoadingFrete(true);
    setFreteMsg('');
    try {
      // 1. Preenche endereço via ViaCEP
      const viaRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`).then((r) => r.json());
      if (!viaRes.erro) {
        setCustomer((prev) => ({
          ...prev,
          rua: viaRes.logradouro || prev.rua,
          bairro: viaRes.bairro || prev.bairro,
          cidade: viaRes.localidade || prev.cidade,
          uf: viaRes.uf || prev.uf,
        }));
      }

      // 2. Consulta frete na API (/api/frete -> Melhor Envio)
      const freteRes = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cepDestino: clean, items }),
      });

      if (freteRes.ok) {
        const data = await freteRes.json();
        if (Array.isArray(data.options) && data.options.length > 0) {
          setFreteOptions(data.options);
          setSelectedFrete(data.options[0]);
        } else {
          setFreteOptions([]);
          setFreteMsg(data.message || 'Frete a combinar após o pedido.');
        }
      } else {
        setFreteOptions([]);
        setFreteMsg('Cálculo automático de frete será ativado com a chave do Melhor Envio.');
      }
    } catch {
      setFreteMsg('CEP localizado! Frete será confirmado no atendimento.');
    } finally {
      setLoadingFrete(false);
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!customer.nome.trim() || !customer.whatsapp.trim()) {
      alert('Preencha pelo menos seu Nome e WhatsApp.');
      return;
    }

    setSubmitting(true);
    try {
      // Tenta via /api/checkout (Vercel Serverless -> Supabase + Mercado Pago)
      let resData = null;
      try {
        const apiRes = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresaId: EMPRESA_ID,
            customer,
            cep,
            items,
            subtotal,
            descontoPix,
            freteValor,
            freteServico: selectedFrete?.name || '',
            fretePrazo: selectedFrete?.delivery_time || '',
            total,
            paymentMethod,
          }),
        });
        if (apiRes.ok) {
          resData = await apiRes.json();
        }
      } catch {
        // fallback abaixo via RPC direto do Supabase
      }

      if (resData?.init_point) {
        onClearCart();
        window.location.href = resData.init_point;
        return;
      }

      if (!resData?.numeroPedido) {
        const { data, error } = await supabase.rpc('create_loja_pedido', {
          p_cliente_nome: customer.nome.trim(),
          p_cliente_cpf: customer.cpf.trim(),
          p_cliente_email: customer.email.trim(),
          p_cliente_whatsapp: customer.whatsapp.trim(),
          p_endereco: {
            cep,
            rua: customer.rua,
            numero: customer.numero,
            complemento: customer.complemento,
            bairro: customer.bairro,
            cidade: customer.cidade,
            uf: customer.uf,
          },
          p_itens: items,
          p_subtotal: subtotal,
          p_desconto_pix: descontoPix,
          p_frete_valor: freteValor,
          p_frete_servico: selectedFrete?.name || '',
          p_frete_prazo: selectedFrete?.delivery_time || '',
          p_total: total,
          p_metodo_pagamento: paymentMethod,
          p_empresa_id: EMPRESA_ID,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        resData = { pedidoId: row?.id, numeroPedido: row?.numero_pedido };
      }

      setCreatedOrder(resData);
      onClearCart();
      setStep('success');
    } catch (err) {
      alert('Não foi possível finalizar o pedido: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header do Drawer */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800 }}>
            {step === 'cart' && `Seu Carrinho (${items.reduce((a, b) => a + b.qty, 0)})`}
            {step === 'checkout' && 'Finalizar Pedido'}
            {step === 'success' && 'Pedido Registrado!'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '32px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={52} color="#10b981" />
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Pedido #{createdOrder?.numeroPedido || ''} recebido!
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Seu pedido foi salvo com sucesso. Em instantes entraremos em contato pelo WhatsApp{' '}
                <strong>{customer.whatsapp}</strong> para confirmar o pagamento e o envio.
              </p>
              <button
                type="button"
                className="btn-primary-brand"
                onClick={() => {
                  setStep('cart');
                  onClose();
                }}
              >
                Continuar comprando
              </button>
            </div>
          )}

          {step === 'cart' && (
            <>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                  Seu carrinho está vazio. Escolha suas peças favoritas na loja!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {items.map((item) => (
                    <div
                      key={`${item.ft_id}_${item.variacaoId}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '64px 1fr auto',
                        gap: '12px',
                        alignItems: 'center',
                        paddingBottom: '12px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <img
                        src={item.foto}
                        alt={item.titulo}
                        style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', background: 'var(--bg-card-img)' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.3 }}>
                          {item.titulo}
                        </div>
                        {item.variacaoNome && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--brand-purple)', fontWeight: 600 }}>
                            Variação: {item.variacaoNome}
                          </div>
                        )}
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, marginTop: '4px' }}>
                          {formatBRL(item.preco * item.qty)}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.ft_id, item.variacaoId, item.qty - 1)}
                            style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', fontWeight: 700 }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.ft_id, item.variacaoId, item.qty + 1)}
                            style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', fontWeight: 700 }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.ft_id, item.variacaoId)}
                        style={{ background: 'transparent', border: 'none', color: '#dc2626', padding: '4px' }}
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                1. Seus Dados
              </div>
              <input
                type="text"
                required
                placeholder="Nome completo *"
                value={customer.nome}
                onChange={(e) => setCustomer({ ...customer, nome: e.target.value })}
                style={inputStyle}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="CPF (para etiqueta/NF)"
                  value={customer.cpf}
                  onChange={(e) => setCustomer({ ...customer, cpf: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="tel"
                  required
                  placeholder="WhatsApp *"
                  value={customer.whatsapp}
                  onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <input
                type="email"
                placeholder="E-mail"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                style={inputStyle}
              />

              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '6px' }}>
                2. Entrega &amp; Frete
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="CEP (ex: 01001000)"
                  value={cep}
                  onChange={(e) => handleCepLookup(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleCepLookup(cep)}
                  disabled={loadingFrete}
                  style={{ padding: '0 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', fontWeight: 700, fontSize: '0.82rem' }}
                >
                  {loadingFrete ? '...' : 'Calcular'}
                </button>
              </div>

              {freteOptions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {freteOptions.map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: selectedFrete?.id === opt.id ? '2px solid var(--brand-purple)' : '1px solid var(--border-color)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="radio"
                          name="freteOpt"
                          checked={selectedFrete?.id === opt.id}
                          onChange={() => setSelectedFrete(opt)}
                        />
                        <Truck size={14} /> {opt.name} ({opt.delivery_time} dias)
                      </span>
                      <strong>{formatBRL(opt.price)}</strong>
                    </label>
                  ))}
                </div>
              )}

              {freteMsg && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{freteMsg}</div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Rua / Avenida"
                  value={customer.rua}
                  onChange={(e) => setCustomer({ ...customer, rua: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Número"
                  value={customer.numero}
                  onChange={(e) => setCustomer({ ...customer, numero: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={customer.bairro}
                  onChange={(e) => setCustomer({ ...customer, bairro: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Cidade - UF"
                  value={customer.cidade ? `${customer.cidade}${customer.uf ? `/${customer.uf}` : ''}` : ''}
                  onChange={(e) => setCustomer({ ...customer, cidade: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '6px' }}>
                3. Pagamento
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: paymentMethod === 'pix' ? '2px solid #10b981' : '1px solid var(--border-color)',
                    background: paymentMethod === 'pix' ? 'rgba(16,185,129,0.08)' : '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  <QrCode size={18} color="#059669" />
                  Pix (5% OFF)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cartao')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: paymentMethod === 'cartao' ? '2px solid var(--brand-purple)' : '1px solid var(--border-color)',
                    background: paymentMethod === 'cartao' ? 'rgba(124,58,237,0.08)' : '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  <CreditCard size={18} color="#7c3aed" />
                  Cartão (até 12x)
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer do Drawer */}
        {items.length > 0 && step !== 'success' && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            {descontoPix > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#059669', fontWeight: 700, marginBottom: '4px' }}>
                <span>Desconto Pix (5%)</span>
                <span>- {formatBRL(descontoPix)}</span>
              </div>
            )}
            {freteValor > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Frete ({selectedFrete?.name})</span>
                <span>{formatBRL(freteValor)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, margin: '8px 0 12px' }}>
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>

            {MODO_VITRINE ? (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#92400E',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              >
                🚧 Vendas online pausadas durante os testes finais.
              </div>
            ) : step === 'cart' ? (
              <button type="button" className="btn-primary-brand" onClick={() => setStep('checkout')}>
                Continuar para Entrega e Pagamento
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#fff', fontWeight: 700 }}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="btn-primary-brand"
                >
                  {submitting ? 'Finalizando...' : 'Confirmar Pedido'}
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  fontSize: '0.86rem',
  outline: 'none',
};
