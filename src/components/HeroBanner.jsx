import { MessageCircle, Instagram } from 'lucide-react';

export default function HeroBanner() {
  return (
    <section className="hero-banner-section">
      <div className="hero-banner-card">
        <img
          src="/banner-topo.png"
          alt="A&M 3D — Impressão 3D. Ideias em novas dimensões."
          className="hero-banner-img"
        />
        <div className="hero-banner-actions">
          <a
            href="https://wa.me/5519999380929?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20A%26M%203D"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-btn hero-btn-whatsapp"
            title="Conversar no WhatsApp"
          >
            <MessageCircle size={18} />
            <span>Conversar no WhatsApp</span>
          </a>
          <a
            href="https://instagram.com/aem3d_"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-btn hero-btn-instagram"
            title="Seguir no Instagram"
          >
            <Instagram size={18} />
            <span>@aem3d_</span>
          </a>
        </div>
      </div>
    </section>
  );
}
