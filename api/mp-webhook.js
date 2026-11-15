import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!mpToken || !serviceKey) {
      return res.status(200).json({ received: true });
    }

    const paymentId = req.body?.data?.id || req.query?.['data.id'];
    if (!paymentId) {
      return res.status(200).json({ received: true });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const payment = await mpRes.json();
    const pedidoId = payment?.external_reference;

    if (pedidoId) {
      const supabase = createClient(process.env.VITE_SUPABASE_URL, serviceKey);
      const nextStatus =
        payment.status === 'approved'
          ? 'pago'
          : payment.status === 'rejected' || payment.status === 'cancelled'
          ? 'cancelado'
          : 'aguardando_pagamento';

      await supabase
        .from('loja_pedidos')
        .update({
          mp_payment_id: String(paymentId),
          mp_status: payment.status || '',
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pedidoId);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(200).json({ received: true, error: err.message });
  }
}
