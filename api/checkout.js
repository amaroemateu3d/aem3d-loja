import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.VITE_LOJA_MODO_VITRINE !== 'false') {
    return res.status(403).json({
      error: 'Vendas online temporariamente bloqueadas durante os testes de lançamento.',
    });
  }

  try {
    const {
      empresaId,
      customer = {},
      cep = '',
      items = [],
      subtotal = 0,
      descontoPix = 0,
      freteValor = 0,
      freteServico = '',
      fretePrazo = '',
      total = 0,
      paymentMethod = 'pix',
    } = req.body || {};

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc('create_loja_pedido', {
      p_cliente_nome: String(customer.nome || '').trim(),
      p_cliente_cpf: String(customer.cpf || '').trim(),
      p_cliente_email: String(customer.email || '').trim(),
      p_cliente_whatsapp: String(customer.whatsapp || '').trim(),
      p_endereco: {
        cep,
        rua: customer.rua || '',
        numero: customer.numero || '',
        complemento: customer.complemento || '',
        bairro: customer.bairro || '',
        cidade: customer.cidade || '',
        uf: customer.uf || '',
      },
      p_itens: items,
      p_subtotal: Number(subtotal || 0),
      p_desconto_pix: Number(descontoPix || 0),
      p_frete_valor: Number(freteValor || 0),
      p_frete_servico: String(freteServico || ''),
      p_frete_prazo: String(fretePrazo || ''),
      p_total: Number(total || 0),
      p_metodo_pagamento: paymentMethod,
      p_empresa_id: empresaId || process.env.VITE_EMPRESA_ID,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const pedidoId = row?.id;
    const numeroPedido = row?.numero_pedido;

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken || !pedidoId) {
      return res.status(200).json({ mode: 'registered', pedidoId, numeroPedido });
    }

    const siteUrl = process.env.SITE_URL || 'https://aem3d.com.br';
    const mpBody = {
      items: [
        {
          title: `Pedido #${numeroPedido} — A&M 3D`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(Number(total || 0).toFixed(2)),
        },
      ],
      payer: {
        name: customer.nome || '',
        email: customer.email || 'cliente@aem3d.com.br',
      },
      external_reference: String(pedidoId),
      back_urls: {
        success: `${siteUrl}?pedido=${numeroPedido}&status=sucesso`,
        failure: `${siteUrl}?pedido=${numeroPedido}&status=falha`,
        pending: `${siteUrl}?pedido=${numeroPedido}&status=pendente`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/mp-webhook`,
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok || !mpData?.init_point) {
      return res.status(200).json({ mode: 'registered', pedidoId, numeroPedido });
    }

    await supabase.rpc('set_loja_pedido_preference', {
      p_pedido_id: pedidoId,
      p_mp_preference_id: String(mpData.id),
    });

    return res.status(200).json({
      mode: 'mercadopago',
      pedidoId,
      numeroPedido,
      init_point: mpData.init_point,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
