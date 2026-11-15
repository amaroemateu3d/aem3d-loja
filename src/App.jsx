import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import DestaquesCarousel from './components/DestaquesCarousel';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import {
  fetchLojaCatalogo,
  fetchLojaCategorias,
  isProdutoDisponivel,
} from './services/catalogo';

export default function App() {
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('destaque');

  const [modalState, setModalState] = useState({ product: null, variation: null });
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('aem3d_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('aem3d_cart', JSON.stringify(cart));
    } catch {
      // ignora erro de quota
    }
  }, [cart]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, prods] = await Promise.all([
          fetchLojaCategorias(),
          fetchLojaCatalogo(),
        ]);
        if (!active) return;
        setCategorias(cats);
        // Produtos sem estoque não aparecem na loja
        setProducts(prods.filter(isProdutoDisponivel));
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Erro ao carregar o catálogo.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const destaques = useMemo(() => {
    const flagged = products.filter((p) => p.destaque);
    if (flagged.length > 0) return flagged.slice(0, 10);
    return products.slice(0, 10);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategoria !== 'all') {
        if (!Array.isArray(p.categorias) || !p.categorias.includes(selectedCategoria)) {
          return false;
        }
      }
      if (q) {
        const matchTitle = (p.titulo || '').toLowerCase().includes(q);
        const matchDesc = (p.descricao || '').toLowerCase().includes(q);
        const matchVar = (p.variacoes || []).some((v) =>
          (v.nome || '').toLowerCase().includes(q)
        );
        if (!matchTitle && !matchDesc && !matchVar) return false;
      }
      return true;
    });

    if (sortBy === 'menor_preco') {
      return [...list].sort((a, b) => (a.preco || 999999) - (b.preco || 999999));
    }
    if (sortBy === 'maior_preco') {
      return [...list].sort((a, b) => (b.preco || 0) - (a.preco || 0));
    }
    if (sortBy === 'az') {
      return [...list].sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
    }
    return list;
  }, [products, selectedCategoria, searchTerm, sortBy]);

  const handleAddToCart = (newItem) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.ft_id === newItem.ft_id && i.variacaoId === newItem.variacaoId
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qty: Math.min(newItem.maxStock, next[idx].qty + newItem.qty),
        };
        return next;
      }
      return [...prev, newItem];
    });
    setCartOpen(true);
  };

  const handleUpdateQty = (ftId, varId, nextQty) => {
    if (nextQty <= 0) {
      handleRemoveItem(ftId, varId);
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.ft_id === ftId && i.variacaoId === varId
          ? { ...i, qty: Math.min(i.maxStock || 99, nextQty) }
          : i
      )
    );
  };

  const handleRemoveItem = (ftId, varId) => {
    setCart((prev) =>
      prev.filter((i) => !(i.ft_id === ftId && i.variacaoId === varId))
    );
  };

  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);

  return (
    <div>
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        categorias={categorias}
        selectedCategoria={selectedCategoria}
        onSelectCategoria={setSelectedCategoria}
      />

      <main>
        {selectedCategoria === 'all' && !searchTerm.trim() && (
          <HeroBanner />
        )}

        {loading ? (
          <div className="container" style={{ padding: '72px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Carregando catálogo A&amp;M 3D...
          </div>
        ) : error ? (
          <div className="container" style={{ padding: '72px 20px', textAlign: 'center', color: '#dc2626' }}>
            {error}
          </div>
        ) : (
          <>
            {selectedCategoria === 'all' && !searchTerm.trim() && (
              <DestaquesCarousel
                products={destaques}
                onSelectProduct={(product, variation) =>
                  setModalState({ product, variation })
                }
              />
            )}

            <section className="container">
              <div className="catalog-toolbar">
                <div className="catalog-count">
                  <strong>{filteredProducts.length}</strong>{' '}
                  {filteredProducts.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
                </div>

                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Ordenar produtos"
                >
                  <option value="destaque">Ordenar: Destaques</option>
                  <option value="menor_preco">Menor preço</option>
                  <option value="maior_preco">Maior preço</option>
                  <option value="az">A – Z</option>
                </select>
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhum produto encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.ft_id}
                      product={prod}
                      onSelect={(product, variation) =>
                        setModalState({ product, variation })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong className="brand-font">A&amp;M 3D</strong> — Impressão 3D, Presentes &amp; Decoração
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              aem3d.com.br • Pagamento seguro via Mercado Pago • Envios via Melhor Envio
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} A&amp;M 3D. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <ProductModal
        product={modalState.product}
        initialVariation={modalState.variation}
        onClose={() => setModalState({ product: null, variation: null })}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
      />
    </div>
  );
}
