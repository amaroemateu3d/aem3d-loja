import { Search, ShoppingBag } from 'lucide-react';
import { MODO_VITRINE } from '../supabaseClient';

export default function Header({
  searchTerm,
  onSearchChange,
  cartCount,
  onOpenCart,
  categorias = [],
  selectedCategoria,
  onSelectCategoria,
}) {
  return (
    <>
      <div className="top-banner">
        {MODO_VITRINE
          ? '🚧 Site em fase de lançamento • Catálogo aberto para consulta — compras online em breve!'
          : '✨ 5% OFF no Pix em toda a loja • Peças exclusivas em Impressão 3D • Enviamos para todo o Brasil 🇧🇷'}
      </div>

      <header className="site-header">
        <div className="container header-bar-single">
          {/* Navegação de Categorias */}
          <nav className="header-category-nav" aria-label="Categorias da loja">
            <button
              type="button"
              className={`cat-pill ${selectedCategoria === 'all' ? 'active' : ''}`}
              onClick={() => onSelectCategoria('all')}
            >
              Todos os Produtos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`cat-pill ${selectedCategoria === cat.id ? 'active' : ''}`}
                onClick={() => onSelectCategoria(cat.id)}
              >
                {cat.nome}
              </button>
            ))}
          </nav>

          {/* Busca + Carrinho na mesma linha */}
          <div className="header-right-tools">
            <div className="header-search">
              <Search size={16} className="header-search-icon" />
              <input
                type="text"
                placeholder="Buscar produtos (ex: chaveiro, batom...)"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <button type="button" className="cart-btn" onClick={onOpenCart}>
              <ShoppingBag size={17} />
              <span>Carrinho</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
