function parseDimensions(medidaStr) {
  const nums = String(medidaStr || '')
    .replace(/,/g, '.')
    .match(/\d+(\.\d+)?/g);
  if (nums && nums.length >= 3) {
    return {
      width: Math.max(11, Math.round(Number(nums[0]))),
      height: Math.max(2, Math.round(Number(nums[1]))),
      length: Math.max(16, Math.round(Number(nums[2]))),
    };
  }
  return { width: 16, height: 8, length: 20 };
}

function parseWeightKg(pesoStr) {
  const raw = String(pesoStr || '').trim().toLowerCase().replace(',', '.');
  const num = parseFloat(raw);
  if (!num || Number.isNaN(num)) return 0.3;
  if (raw.includes('kg')) return Math.max(0.05, num);
  return Math.max(0.05, num / 1000);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.MELHOR_ENVIO_TOKEN;
  const cepOrigem = (process.env.MELHOR_ENVIO_CEP_ORIGEM || '').replace(/\D/g, '');

  if (!token || !cepOrigem) {
    return res.status(200).json({
      options: [],
      message: 'Frete automático será ativado após configurar MELHOR_ENVIO_TOKEN na Vercel.',
    });
  }

  try {
    const { cepDestino, items = [] } = req.body || {};
    const cleanDestino = String(cepDestino || '').replace(/\D/g, '');
    if (cleanDestino.length !== 8) {
      return res.status(400).json({ error: 'CEP de destino inválido.' });
    }

    const baseUrl =
      process.env.MELHOR_ENVIO_SANDBOX === 'true'
        ? 'https://sandbox.melhorenvio.com.br'
        : 'https://melhorenvio.com.br';

    const products = (Array.isArray(items) && items.length > 0 ? items : [{}]).map((it, idx) => {
      const dims = parseDimensions(it.medida_com_caixa);
      return {
        id: String(it.ft_id || `item_${idx}`),
        width: dims.width,
        height: dims.height,
        length: dims.length,
        weight: parseWeightKg(it.peso_com_caixa),
        insurance_value: Math.max(1, Number(it.preco || 20)),
        quantity: Math.max(1, Number(it.qty || 1)),
      };
    });

    const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'AEM3D Loja (contato@aem3d.com.br)',
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cleanDestino },
        products,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(200).json({ options: [], message: 'Não foi possível cotar agora. Frete a combinar.' });
    }

    const options = (Array.isArray(data) ? data : [])
      .filter((s) => !s.error && Number(s.price) > 0)
      .map((s) => ({
        id: s.id,
        name: `${s.company?.name || ''} ${s.name || ''}`.trim(),
        price: Number(s.custom_price || s.price),
        delivery_time: s.custom_delivery_time || s.delivery_time || 5,
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);

    return res.status(200).json({ options });
  } catch (err) {
    return res.status(200).json({ options: [], message: err.message });
  }
}
