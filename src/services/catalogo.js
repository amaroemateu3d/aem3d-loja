import { supabase, EMPRESA_ID } from '../supabaseClient';

export function formatBRL(value) {
  const num = Number(value || 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function calcPixPrice(value) {
  return Math.max(0, Number(value || 0) * 0.95);
}

export function getProdutoEstoqueTotal(prod) {
  const vars = Array.isArray(prod?.variacoes) ? prod.variacoes : [];
  if (vars.length > 0) {
    return vars.reduce((acc, v) => acc + Math.max(0, Number(v?.estoque || 0)), 0);
  }
  return Math.max(0, Number(prod?.estoque || 0));
}

export function isProdutoDisponivel(prod) {
  return getProdutoEstoqueTotal(prod) > 0;
}

export async function fetchLojaCategorias() {
  const { data, error } = await supabase
    .from('loja_categorias')
    .select('id, nome, slug, ordem')
    .eq('empresa_id', EMPRESA_ID)
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchLojaCatalogo() {
  const { data, error } = await supabase.rpc('get_loja_catalogo', {
    p_empresa_id: EMPRESA_ID,
  });

  if (error) throw error;
  return (data || []).map((item) => ({
    ...item,
    preco: Number(item.preco || 0),
    estoque: Number(item.estoque || 0),
    fotos: Array.isArray(item.fotos) ? item.fotos : [],
    categorias: Array.isArray(item.categorias) ? item.categorias : [],
    variacoes: Array.isArray(item.variacoes) ? item.variacoes : [],
  }));
}
