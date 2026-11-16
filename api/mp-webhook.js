import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!mpToken || !supabaseUrl || !supabaseKey) {
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
      const supabase = createClient(supabaseUrl, supabaseKey);
      const nextStatus =
        payment.status === 'approved'
          ? 'pago'
          : payment.status === 'rejected' || payment.status === 'cancelled'
          ? 'cancelado'
          : 'aguardando_pagamento';

      await supabase.rpc('confirm_loja_pedido_mp', {
        p_pedido_id: pedidoId,
        p_mp_payment_id: String(paymentId),
        p_mp_status: String(payment.status || ''),
        p_status: nextStatus,
      });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(200).json({ received: true, error: err.message });
  }
}
