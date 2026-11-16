import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.MELHOR_ENVIO_TOKEN;
  const cepOrigem = (process.env.MELHOR_ENVIO_CEP_ORIGEM || '13347458').replace(/\D/g, '');
  if (!token) {
    return res.status(400).json({ error: 'MELHOR_ENVIO_TOKEN não configurado.' });
  }

  try {
    const { pedidoId } = req.body || {};
    if (!pedidoId) return res.status(400).json({ error: 'Informe pedidoId.' });

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Verifica autenticação do admin enviado no header Authorization
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const userClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: pedidoRow, error: pErr } = await userClient
        .from('loja_pedidos')
        .select('*')
        .eq('id', pedidoId)
        .single();
      if (pErr || !pedidoRow) {
        return res.status(403).json({ error: 'Pedido não encontrado ou sem permissão.' });
      }

      const end = pedidoRow.endereco || {};
      const itens = Array.isArray(pedidoRow.itens) ? pedidoRow.itens : [];

      // 1. Busca dados do remetente na conta do Melhor Envio
      const meRes = await fetch('https://melhorenvio.com.br/api/v2/me', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'AEM3D Loja (contato@aem3d.com.br)',
        },
      });
      const meData = await meRes.json();

      // 2. Cota serviços disponíveis para escolher o serviço correspondente (ou PAC/Jadlog mais próximo)
      const calcRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'AEM3D Loja (contato@aem3d.com.br)',
        },
        body: JSON.stringify({
          from: { postal_code: cepOrigem },
          to: { postal_code: String(end.cep || '').replace(/\D/g, '') },
          products: itens.map((it, idx) => ({
            id: String(it.ft_id || idx),
            width: 16,
            height: 8,
            length: 20,
            weight: 0.3,
            insurance_value: Math.max(1, Number(it.preco || 20)),
            quantity: Math.max(1, Number(it.qty || 1)),
          })),
        }),
      });
      const calcList = await calcRes.json();
      const validServices = (Array.isArray(calcList) ? calcList : []).filter((s) => !s.error && Number(s.price) > 0);
      const chosenService =
        validServices.find((s) =>
          `${s.company?.name || ''} ${s.name || ''}`.toLowerCase().includes((pedidoRow.frete_servico || '').toLowerCase())
        ) || validServices[0];

      if (!chosenService) {
        return res.status(400).json({ error: 'Nenhum serviço de frete disponível para o CEP deste pedido.' });
      }

      // 3. Insere etiqueta no carrinho do Melhor Envio
      const cartRes = await fetch('https://melhorenvio.com.br/api/v2/me/cart', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'AEM3D Loja (contato@aem3d.com.br)',
        },
        body: JSON.stringify({
          service: chosenService.id,
          from: {
            name: `${meData.firstname || 'A&M'} ${meData.lastname || '3D'}`.trim(),
            phone: meData.phone?.phone || '19999380929',
            email: meData.email || 'amaroemateu3d@gmail.com',
            document: String(meData.document || '').replace(/\D/g, ''),
            address: meData.address?.address || 'Rua',
            number: String(meData.address?.number || 'SN'),
            district: meData.address?.district || 'Centro',
            city: meData.address?.city?.city || 'Indaiatuba',
            state_abbr: meData.address?.city?.state?.state_abbr || 'SP',
            country_id: 'BR',
            postal_code: cepOrigem,
          },
          to: {
            name: pedidoRow.cliente_nome,
            phone: String(pedidoRow.cliente_whatsapp || '').replace(/\D/g, ''),
            email: pedidoRow.cliente_email || 'cliente@aem3d.com.br',
            document: String(pedidoRow.cliente_cpf || '').replace(/\D/g, ''),
            address: end.rua || 'Rua',
            complement: end.complemento || '',
            number: String(end.numero || 'SN'),
            district: end.bairro || 'Bairro',
            city: String(end.cidade || '').split('/')[0].trim(),
            state_abbr: end.uf || (String(end.cidade || '').split('/')[1] || 'SP').trim(),
            country_id: 'BR',
            postal_code: String(end.cep || '').replace(/\D/g, ''),
          },
          products: itens.map((it) => ({
            name: `${it.titulo}${it.variacaoNome ? ` (${it.variacaoNome})` : ''}`,
            quantity: Math.max(1, Number(it.qty || 1)),
            unitary_value: Math.max(1, Number(it.preco || 20)),
          })),
          volumes: [
            {
              height: 10,
              width: 16,
              length: 20,
              weight: 0.4,
            },
          ],
          options: {
            insurance_value: Math.max(1, Number(pedidoRow.subtotal || 20)),
            receipt: false,
            own_hand: false,
            non_commercial: true,
          },
        }),
      });

      const cartData = await cartRes.json();
      if (!cartRes.ok || !cartData?.id) {
        return res.status(400).json({
          error: cartData?.message || JSON.stringify(cartData?.errors || cartData) || 'Erro ao enviar etiqueta para o Melhor Envio.',
        });
      }

      const etiquetaUrl = 'https://melhorenvio.com.br/carrinho';
      await supabase.rpc('set_loja_pedido_etiqueta', {
        p_pedido_id: pedidoId,
        p_melhor_envio_order_id: String(cartData.id),
        p_etiqueta_url: etiquetaUrl,
      });

      return res.status(200).json({
        success: true,
        melhorEnvioOrderId: cartData.id,
        protocol: cartData.protocol,
        etiquetaUrl,
      });
    }

    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
