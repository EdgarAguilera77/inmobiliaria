import React, { useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBath,
  faBed,
  faBuildingCircleCheck,
  faCar,
  faCheckCircle,
  faChevronLeft,
  faChevronRight,
  faXmark,
  faLocationDot,
  faMagnifyingGlass,
  faPhoneVolume,
  faRulerCombined,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { useRealEstate } from '../../contexts/RealEstateContext';
import jmLogo from '../../assets/JM.jpeg';

const currencyFormatter = new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  maximumFractionDigits: 0,
});

const formatPrice = (value, operation) =>
  `${currencyFormatter.format(value)}${operation === 'Renta' ? ' / mes' : ''}`;

const isPropertyPubliclyVisible = (property) =>
  property.active && property.publicationStatus === 'Publicada';

const ImageLightbox = ({ images, initialIndex = 0, title, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!images?.length) {
    return null;
  }

  const selectedImage = images[currentIndex];
  const goPrevious = () =>
    setCurrentIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  const goNext = () =>
    setCurrentIndex((current) => (current === images.length - 1 ? 0 : current + 1));

  return (
    <div className="image-lightbox" onClick={onClose}>
      <div className="image-lightbox-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="lightbox-close" onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <button type="button" className="lightbox-nav prev" onClick={goPrevious}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <img src={selectedImage} alt={title} className="lightbox-image" />
        <button type="button" className="lightbox-nav next" onClick={goNext}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
        <div className="lightbox-caption">
          <strong>{title}</strong>
          <span>
            Imagen {currentIndex + 1} de {images.length}
          </span>
        </div>
      </div>
    </div>
  );
};

const PropertyCard = ({ property }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const galleryImages = property.images?.length ? property.images : [property.coverImage];

  return (
    <>
      <article className="property-card">
        <button
          type="button"
          className="property-card-media property-image-trigger"
          onClick={() => setIsLightboxOpen(true)}
        >
          <img src={property.coverImage} alt={property.title} />
          {property.featured && (
            <span className="property-badge">
              <FontAwesomeIcon icon={faStar} />
              Destacada
            </span>
          )}
        </button>
        <div className="property-card-body">
          <div className="property-card-meta">
            <span>{property.operation}</span>
            <span>{property.type?.name}</span>
          </div>
          <h3>{property.title}</h3>
          <p className="property-card-location">
            <FontAwesomeIcon icon={faLocationDot} />
            {property.zone?.name}, {property.zone?.city}
          </p>
          <div className="property-card-specs">
            <span>
              <FontAwesomeIcon icon={faBed} />
              {property.bedrooms || '--'}
            </span>
            <span>
              <FontAwesomeIcon icon={faBath} />
              {property.bathrooms || '--'}
            </span>
            <span>
              <FontAwesomeIcon icon={faCar} />
              {property.parking || '--'}
            </span>
            <span>
              <FontAwesomeIcon icon={faRulerCombined} />
              {property.area} m2
            </span>
          </div>
          <div className="property-card-footer">
            <strong>{formatPrice(property.price, property.operation)}</strong>
            <Link to={`/propiedades/${property.slug}`} className="primary-link">
              Ver detalle
            </Link>
          </div>
        </div>
      </article>
      {isLightboxOpen && (
        <ImageLightbox
          images={galleryImages}
          title={property.title}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};

const PublicHeader = () => {
  const { companyProfile } = useRealEstate();

  return (
    <header className="public-header">
      <div className="brand-block">
        <span className="brand-kicker">Inmobiliaria</span>
        <Link to="/" className="brand-name brand-name-with-logo">
          <img src={jmLogo} alt={companyProfile.name} className="brand-logo" />
          <span className="brand-copy">
            <strong className="brand-title-display">{companyProfile.name}</strong>
            <small className="brand-subtitle-display">
              Consultores inmobiliarios y servicios integrales
            </small>
          </span>
        </Link>
        <p className="brand-legal-line">Tu aliado integral en propiedad, leyes y tecnologia</p>
      </div>
      <nav className="public-nav">
        <NavLink to="/">Inicio</NavLink>
        <NavLink to="/propiedades">Propiedades</NavLink>
        <NavLink to="/servicios">Servicios</NavLink>
        <NavLink to="/nosotros">Nosotros</NavLink>
        <NavLink to="/contacto">Contacto</NavLink>
        <NavLink to="/login" className="nav-cta">
          Admin
        </NavLink>
      </nav>
    </header>
  );
};

const PublicFooter = () => {
  const { companyProfile } = useRealEstate();

  return (
    <footer className="public-footer">
      <div>
        <h4>{companyProfile.name}</h4>
        <p>Consultores inmobiliarios y servicios integrales</p>
        <small className="footer-brand-note">
          Tu aliado integral en propiedad, leyes y tecnologia
        </small>
      </div>
      <div>
        <h5>Contacto</h5>
        <p>{companyProfile.phone}</p>
        <p>{companyProfile.email}</p>
      </div>
      <div>
        <h5>Ubicacion</h5>
        <p>{companyProfile.address}</p>
        <div className="footer-socials">
          <a href="https://facebook.com" target="_blank" rel="noreferrer">
            Facebook
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://maps.google.com" target="_blank" rel="noreferrer">
            Mapa
          </a>
        </div>
      </div>
    </footer>
  );
};

export const PublicLayout = ({ children }) => {
  const { companyProfile } = useRealEstate();

  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-content">{children}</main>
      <a
        className="whatsapp-float"
        href={`https://wa.me/${companyProfile.whatsapp}`}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
      <PublicFooter />
    </div>
  );
};

export const HomePage = () => {
  const { properties, propertyTypes, saveContact, isLoading } = useRealEstate();
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const featuredProperties = properties
    .filter((property) => property.featured && isPropertyPubliclyVisible(property))
    .slice(0, 3);

  const submitContact = (event) => {
    event.preventDefault();
    saveContact(contactForm);
    setContactForm({ name: '', email: '', phone: '', message: '' });
  };

  if (isLoading) {
    return <section className="content-section"><h2>Cargando propiedades...</h2></section>;
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="section-chip">Portal inmobiliario</span>
          <h1>Encuentra propiedades con respaldo inmobiliario, legal y comercial en un solo lugar</h1>
          <p>
            Explora casas, apartamentos y terrenos con una experiencia clara, filtros utiles y
            acompanamiento profesional para compra, renta o inversion.
          </p>
          <div className="hero-actions">
            <Link to="/propiedades" className="primary-button">
              Explorar propiedades
            </Link>
            <Link to="/contacto" className="secondary-button">
              Hablar con un asesor
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-stat">
            <strong>{properties.filter((item) => isPropertyPubliclyVisible(item)).length}+</strong>
            <span>propiedades activas</span>
          </div>
          <div className="hero-stat">
            <strong>{propertyTypes.length}</strong>
            <span>tipos de propiedad</span>
          </div>
          <div className="hero-stat accent">
            <strong>24h</strong>
            <span>respuesta comercial</span>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <span className="section-chip">Destacadas</span>
            <h2>Propiedades destacadas</h2>
          </div>
          <Link to="/propiedades" className="primary-link">
            Ver todas <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
        <div className="property-grid">
          {featuredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      <section className="content-section split-section">
        <div>
          <span className="section-chip">Por tipo</span>
          <h2>Busca por categoria</h2>
          <p>
            Segmenta rapidamente tu busqueda por tipo de propiedad para encontrar opciones
            alineadas a tu objetivo de compra, renta o inversion.
          </p>
        </div>
        <div className="type-grid">
          {propertyTypes.map((type) => (
            <Link key={type.id} to={`/propiedades/tipo/${type.slug}`} className="type-card">
              <FontAwesomeIcon icon={faBuildingCircleCheck} />
              <h3>{type.name}</h3>
              <p>{type.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-section service-strip">
        <div className="service-card">
          <FontAwesomeIcon icon={faCheckCircle} />
          <h3>Asesoria personalizada</h3>
          <p>Evaluamos presupuesto, zona y objetivo para recomendar solo opciones utiles.</p>
        </div>
        <div className="service-card">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <h3>Gestion de busqueda</h3>
          <p>Filtramos propiedades activas, destacadas y por tipo en una sola plataforma.</p>
        </div>
        <div className="service-card">
          <FontAwesomeIcon icon={faPhoneVolume} />
          <h3>Atencion omnicanal</h3>
          <p>Recibimos consultas por formulario, llamada y acceso directo a WhatsApp.</p>
        </div>
      </section>

      <section className="content-section contact-highlight">
        <div>
          <span className="section-chip">Contacto rapido</span>
          <h2>Solicita una llamada o visita</h2>
          <p>
            Este formulario alimenta el panel administrativo, donde luego puedes gestionar el
            estado de cada solicitud.
          </p>
        </div>
        <form className="contact-form compact" onSubmit={submitContact}>
          <input
            value={contactForm.name}
            onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
            placeholder="Nombre completo"
            required
          />
          <input
            type="email"
            value={contactForm.email}
            onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
            placeholder="Correo"
            required
          />
          <input
            value={contactForm.phone}
            onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })}
            placeholder="Telefono"
            required
          />
          <textarea
            value={contactForm.message}
            onChange={(event) => setContactForm({ ...contactForm, message: event.target.value })}
            placeholder="Cuentales que propiedad buscas"
            rows="4"
            required
          />
          <button type="submit" className="primary-button">
            Enviar solicitud
          </button>
        </form>
      </section>
    </>
  );
};

export const PropertyListPage = () => {
  const { properties, propertyTypes, zones, isLoading } = useRealEstate();
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    zone: 'all',
    operation: 'all',
  });

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) => {
        if (!isPropertyPubliclyVisible(property)) return false;
        const matchesSearch = `${property.title} ${property.address}`
          .toLowerCase()
          .includes(filters.search.toLowerCase());
        const matchesType = filters.type === 'all' || String(property.typeId) === filters.type;
        const matchesZone = filters.zone === 'all' || String(property.zoneId) === filters.zone;
        const matchesOperation =
          filters.operation === 'all' || property.operation === filters.operation;

        return matchesSearch && matchesType && matchesZone && matchesOperation;
      }),
    [filters, properties]
  );

  if (isLoading) {
    return <section className="content-section"><h2>Cargando propiedades...</h2></section>;
  }

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <span className="section-chip">Catalogo</span>
          <h1>Listado de propiedades</h1>
        </div>
      </div>
      <div className="filter-bar">
        <input
          placeholder="Buscar por titulo o direccion"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
        <select
          value={filters.type}
          onChange={(event) => setFilters({ ...filters, type: event.target.value })}
        >
          <option value="all">Todos los tipos</option>
          {propertyTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <select
          value={filters.zone}
          onChange={(event) => setFilters({ ...filters, zone: event.target.value })}
        >
          <option value="all">Todas las zonas</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
        <select
          value={filters.operation}
          onChange={(event) => setFilters({ ...filters, operation: event.target.value })}
        >
          <option value="all">Venta y renta</option>
          <option value="Venta">Venta</option>
          <option value="Renta">Renta</option>
        </select>
      </div>
      <div className="property-grid">
        {filteredProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
};

export const PropertyTypePage = () => {
  const { slug } = useParams();
  const { properties, propertyTypes, isLoading } = useRealEstate();
  const propertyType = propertyTypes.find((type) => type.slug === slug);
  const typeProperties = properties.filter(
    (property) => isPropertyPubliclyVisible(property) && property.type?.slug === slug
  );

  if (isLoading) {
    return <section className="content-section"><h2>Cargando tipo de propiedad...</h2></section>;
  }

  if (!propertyType) {
    return (
      <section className="content-section">
        <h1>Tipo de propiedad no encontrado</h1>
      </section>
    );
  }

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <span className="section-chip">Tipo de propiedad</span>
          <h1>{propertyType.name}</h1>
          <p>{propertyType.description}</p>
        </div>
      </div>
      <div className="property-grid">
        {typeProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
};

export const PropertyDetailPage = () => {
  const { slug } = useParams();
  const { companyProfile, properties, saveContact, isLoading } = useRealEstate();
  const property = properties.find((item) => item.slug === slug);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: property ? `Hola, quiero mas informacion sobre ${property.title}.` : '',
  });

  if (isLoading) {
    return <section className="content-section"><h2>Cargando detalle de propiedad...</h2></section>;
  }

  if (!property) {
    return (
      <section className="content-section">
        <h1>Propiedad no encontrada</h1>
      </section>
    );
  }

  if (!isPropertyPubliclyVisible(property)) {
    return (
      <section className="content-section">
        <h1>Propiedad no disponible para publicacion</h1>
      </section>
    );
  }

  const submitRequest = (event) => {
    event.preventDefault();
    saveContact({ ...formData, propertyId: property.id });
    setFormData({
      name: '',
      email: '',
      phone: '',
      message: `Hola, quiero mas informacion sobre ${property.title}.`,
    });
  };

  const galleryImages = property.images?.length ? property.images : [property.coverImage];

  return (
    <>
      <section className="content-section property-detail">
        <div className="property-gallery">
          <button
            type="button"
            className="property-image-trigger property-cover-trigger"
            onClick={() => setSelectedImageIndex(0)}
          >
            <img src={property.coverImage} alt={property.title} className="property-cover" />
          </button>
          <div className="gallery-strip">
            {galleryImages.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                className="gallery-thumb-button"
                onClick={() => setSelectedImageIndex(index)}
              >
                <img src={image} alt={property.title} />
              </button>
            ))}
          </div>
        </div>
        <div className="property-detail-panel">
          <span className="section-chip">{property.operation}</span>
          <h1>{property.title}</h1>
          <p className="property-card-location">
            <FontAwesomeIcon icon={faLocationDot} />
            {property.address}
          </p>
          <strong className="detail-price">{formatPrice(property.price, property.operation)}</strong>
          <div className="detail-stats">
            <span>{property.bedrooms} habitaciones</span>
            <span>{property.bathrooms} banos</span>
            <span>{property.parking} estacionamientos</span>
            <span>{property.area} m2</span>
          </div>
          <p>{property.description}</p>
          <div className="agent-box">
            <img src={property.agent?.photo} alt={property.agent?.name} />
            <div>
              <strong>{property.agent?.name}</strong>
              <p>{property.agent?.role}</p>
              <p>{property.agent?.phone}</p>
            </div>
          </div>
          <form className="contact-form" onSubmit={submitRequest}>
            <h3>Formulario de contacto</h3>
            <input
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="Nombre"
              required
            />
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              placeholder="Correo"
              required
            />
            <input
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              placeholder="Telefono"
              required
            />
            <textarea
              rows="4"
              value={formData.message}
              onChange={(event) => setFormData({ ...formData, message: event.target.value })}
              required
            />
            <button type="submit" className="primary-button">
              Solicitar informacion
            </button>
          </form>
          <a
            className="secondary-button"
            href={`https://wa.me/${companyProfile.whatsapp}?text=Hola%2C%20quiero%20informacion%20sobre%20${encodeURIComponent(property.title)}`}
            target="_blank"
            rel="noreferrer"
          >
            Escribir por WhatsApp
          </a>
        </div>
      </section>
      {selectedImageIndex !== null && (
        <ImageLightbox
          images={galleryImages}
          initialIndex={selectedImageIndex}
          title={property.title}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </>
  );
};

export const AboutPage = () => (
  <section className="content-section narrative-page">
    <span className="section-chip">Nosotros</span>
    <h1>Somos una inmobiliaria orientada a confianza, curaduria y velocidad comercial</h1>
    <p>
      Nova Casa combina presentacion moderna, gestion comercial y seguimiento de prospectos en
      una sola plataforma. El objetivo es que el cliente vea propiedades activas y que el equipo
      administre catalogo, agentes, tipos, zonas y solicitudes desde un panel central.
    </p>
    <div className="service-strip">
      <div className="service-card">
        <h3>Vision comercial</h3>
        <p>Conectar mejor oferta, mejor ubicacion y mejor narrativa para cerrar mas rapido.</p>
      </div>
      <div className="service-card">
        <h3>Operacion ordenada</h3>
        <p>Las propiedades se activan, destacan o despublican desde administracion.</p>
      </div>
      <div className="service-card">
        <h3>Atencion continua</h3>
        <p>Cada formulario y contacto queda registrado para dar seguimiento.</p>
      </div>
    </div>
  </section>
);

export const ServicesPage = () => (
  <section className="content-section narrative-page">
    <span className="section-chip">Servicios</span>
    <h1>Pagina de servicios</h1>
    <div className="service-strip">
      <div className="service-card">
        <h3>Venta de propiedades</h3>
        <p>Promocion profesional, fotografia, filtros por tipo y publicacion destacada.</p>
      </div>
      <div className="service-card">
        <h3>Renta residencial y corporativa</h3>
        <p>Selecciones curadas para ejecutivos, familias y proyectos con requerimientos puntuales.</p>
      </div>
      <div className="service-card">
        <h3>Gestion de inversion</h3>
        <p>Soporte para analizar retorno, plusvalia y oportunidades por ciudad o zona.</p>
      </div>
    </div>
  </section>
);

export const ContactPage = () => {
  const { companyProfile, properties, saveContact, isLoading } = useRealEstate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyId: '',
    message: '',
  });

  const submitForm = (event) => {
    event.preventDefault();
    saveContact(formData);
    setFormData({ name: '', email: '', phone: '', propertyId: '', message: '' });
  };

  if (isLoading) {
    return <section className="content-section"><h2>Cargando contacto...</h2></section>;
  }

  return (
    <section className="content-section contact-page-grid">
      <div className="contact-card">
        <span className="section-chip">Contacto</span>
        <h1>Formulario de contacto</h1>
        <p>{companyProfile.address}</p>
        <p>{companyProfile.phone}</p>
        <p>{companyProfile.email}</p>
      </div>
      <form className="contact-form" onSubmit={submitForm}>
        <input
          value={formData.name}
          onChange={(event) => setFormData({ ...formData, name: event.target.value })}
          placeholder="Nombre completo"
          required
        />
        <input
          type="email"
          value={formData.email}
          onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          placeholder="Correo"
          required
        />
        <input
          value={formData.phone}
          onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
          placeholder="Telefono"
          required
        />
        <select
          value={formData.propertyId}
          onChange={(event) => setFormData({ ...formData, propertyId: event.target.value })}
        >
          <option value="">Consulta general</option>
          {properties
            .filter((property) => isPropertyPubliclyVisible(property))
            .map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
        </select>
        <textarea
          rows="5"
          value={formData.message}
          onChange={(event) => setFormData({ ...formData, message: event.target.value })}
          placeholder="Escribe tu mensaje"
          required
        />
        <button type="submit" className="primary-button">
          Enviar
        </button>
      </form>
    </section>
  );
};
