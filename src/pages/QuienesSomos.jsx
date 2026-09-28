import './QuienesSomos.css'

const VALORES = [
  {
    icono: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    ),
    titulo: 'Compromiso familiar',
    desc: 'Somos una empresa familiar de principio a fin — eso significa que cada pedido lo atendemos como si fuera para alguien de nuestra propia familia.',
  },
  {
    icono: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
    titulo: 'Servicio esencial',
    desc: 'Entendemos que lo que distribuimos no es un producto más — es salud. Esa responsabilidad guía cada decisión que tomamos.',
  },
  {
    icono: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    titulo: 'Cercanía',
    desc: 'Conocemos a nuestros clientes por nombre, no por número de cuenta. Esa cercanía es lo que nos diferencia como distribuidor.',
  },
  {
    icono: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
    titulo: 'Confiabilidad',
    desc: 'Farmacias, clínicas y distribuidores cuentan con nosotros porque cumplimos lo que prometemos, pedido tras pedido.',
  },
]

function QuienesSomos() {
  return (
    <div className="qs-page">
      {/* Hero */}
      <section className="qs-hero">
        <div className="qs-hero__contenido">
          <p className="qs-hero__eyebrow">Droguería Carrisan · Desde 2010</p>
          <h1>Una empresa familiar, cerca de quienes cuidan la salud</h1>
          <p className="qs-hero__texto">
            Somos una empresa venezolana, familiar desde el primer día, dedicada a la distribución
            de medicamentos y material médico-quirúrgico para el sector farmacéutico y hospitalario.
            Crecimos pedido a pedido, relación a relación, sin dejar nunca de ser lo que somos.
          </p>
        </div>
      </section>

      {/* Franja de identidad */}
      <section className="qs-franja">
        <div className="qs-franja__item">
          <span className="qs-franja__valor">2010</span>
          <span className="qs-franja__label">Año de fundación</span>
        </div>
        <div className="qs-franja__item">
          <span className="qs-franja__valor">100%</span>
          <span className="qs-franja__label">Empresa familiar</span>
        </div>
        <div className="qs-franja__item">
          <span className="qs-franja__valor">Esencial</span>
          <span className="qs-franja__label">Incluso en pandemia</span>
        </div>
      </section>

      <div className="qs-container">
        {/* Quiénes somos */}
        <section className="qs-seccion">
          <h2>Quiénes somos</h2>
          <p>
            Droguería Carrisan nació en 2010 como un negocio familiar, y una década y media después
            seguimos siendo exactamente eso — una familia que trabaja para que farmacias, clínicas y
            distribuidores tengan lo que necesitan, cuando lo necesitan. No somos una corporación
            grande y anónima: somos personas que conocen a sus clientes, que responden el teléfono, y
            que entienden que detrás de cada pedido hay un paciente esperando su medicamento.
          </p>
        </section>

        {/* Bloque destacado COVID */}
        <section className="qs-destacado">
          <p className="qs-destacado__texto">
            "En 2020, cuando el mundo se detuvo, nosotros no pudimos. Seguimos trabajando para que los
            medicamentos llegaran a quienes los necesitaban."
          </p>
          <p className="qs-destacado__contexto">
            La pandemia nos recordó, de la forma más dura posible, por qué existe Droguería
            Carrisan. No distribuimos artículos — distribuimos salud. Esa responsabilidad no se
            apaga nunca, y menos cuando más se necesita.
          </p>
        </section>

        {/* Valores */}
        <section className="qs-seccion">
          <h2>Lo que nos define</h2>
          <div className="qs-valores">
            {VALORES.map((valor) => (
              <div key={valor.titulo} className="qs-valor-card">
                <span className="qs-valor-card__icono">{valor.icono}</span>
                <h3>{valor.titulo}</h3>
                <p>{valor.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Misión y Visión */}
        <section className="qs-seccion">
          <div className="qs-mision-vision">
            <div className="qs-mv-card">
              <h3>Misión</h3>
              <p>
                Proveer medicamentos y suministros médicos de calidad a precios competitivos,
                facilitando el acceso a través de nuestra plataforma digital B2B.
              </p>
            </div>
            <div className="qs-mv-card">
              <h3>Visión</h3>
              <p>
                Ser el aliado principal de farmacias, clínicas y distribuidores en Venezuela,
                destacando por nuestra eficiencia, cercanía y confiabilidad.
              </p>
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section className="qs-contacto">
          <h2>Contacto comercial</h2>
          <div className="qs-contacto__grid">
            <div>
              <span className="qs-contacto__label">Email</span>
              <a href="mailto:dcarrisan@gmail.com">dcarrisan@gmail.com</a>
            </div>
            <div>
              <span className="qs-contacto__label">Teléfono</span>
              <span>+58 414-1234567</span>
            </div>
            <div>
              <span className="qs-contacto__label">Horario</span>
              <span>Lunes a Viernes, 8:00 AM – 5:00 PM</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default QuienesSomos