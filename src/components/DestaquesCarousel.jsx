import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';

export default function DestaquesCarousel({ products = [], onSelectProduct }) {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const items = products.slice(0, 10);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const timer = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 12;
      if (nearEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 260, behavior: 'smooth' });
      }
    }, 3800);
    return () => clearInterval(timer);
  }, [items.length, paused]);

  if (items.length === 0) return null;

  const scrollByAmount = (delta) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section
      className="container destaques-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="section-header-row">
        <h2 className="section-title">
          <Sparkles size={19} color="#7c3aed" />
          Destaques A&amp;M 3D
        </h2>
        <div className="carousel-controls">
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={() => scrollByAmount(-320)}
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={() => scrollByAmount(320)}
            aria-label="Próximo"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="carousel-track" ref={trackRef}>
        {items.map((prod) => (
          <div key={prod.ft_id} className="carousel-item">
            <ProductCard product={prod} onSelect={onSelectProduct} />
          </div>
        ))}
      </div>
    </section>
  );
}
