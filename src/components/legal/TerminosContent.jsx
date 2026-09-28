import '../../pages/Terminos.css'

// ---------------------------------------------------------
// Contenido de "Terminos y Condiciones" — extraido de src/pages/Terminos.jsx.
// Se usa tanto en la pagina completa como dentro de LegalModal,
// para que el usuario pueda leerlo sin salir del formulario de
// registro y perder los datos ya escritos.
// ---------------------------------------------------------
function TerminosContent() {
  return (
    <>
      <section id="aceptacion" className="terminos-seccion">
        <h2>1. Aceptación de los Términos</h2>
        <p>
          Estos Términos y Condiciones de Uso (los "<strong>Términos</strong>") rigen el acceso
          y uso de la plataforma de Droguería Carrisan (el "<strong>Sitio</strong>"), disponible en
          nuestro dominio web y aplicaciones asociadas. Al crear una cuenta, iniciar sesión o
          realizar un pedido a través del Sitio, aceptas quedar obligado por estos Términos. Si no
          estás de acuerdo con alguna parte, debes abstenerte de usar la plataforma.
        </p>
        <p>
          El Sitio está dirigido exclusivamente a clientes comerciales (farmacias, distribuidores,
          instituciones de salud y perfiles autorizados) y no constituye una tienda de venta al
          público general. Podemos actualizar estos Términos de tiempo en tiempo; la fecha de
          "Última actualización" indica cuándo se hizo el cambio más reciente.
        </p>
      </section>

      <section id="definiciones" className="terminos-seccion">
        <h2>2. Definiciones</h2>
        <ul className="terminos-lista">
          <li><strong>"Nosotros", "Carrisan" o "la Empresa":</strong> Droguería Carrisan y sus operadores.</li>
          <li><strong>"Tú" o "el Cliente":</strong> la persona natural o jurídica que usa el Sitio con una cuenta autorizada.</li>
          <li><strong>"Plataforma":</strong> el sitio web, catálogo, carrito, panel de cuenta y cualquier funcionalidad ofrecida por Carrisan en línea.</li>
          <li><strong>"Productos":</strong> los artículos farmacéuticos, hospitalarios y de cuidado personal listados en el catálogo.</li>
          <li><strong>"Línea de Crédito":</strong> el cupo de compra a crédito asignado a tu cuenta, si aplica, según evaluación comercial de Carrisan.</li>
        </ul>
      </section>

      <section id="cuenta" className="terminos-seccion">
        <h2>3. Elegibilidad y Registro de Cuenta</h2>
        <p>
          El acceso al catálogo con precios y a la posibilidad de generar pedidos requiere una
          cuenta creada por nuestro equipo comercial. Al registrarte, te comprometes a
          proporcionar información veraz, completa y actualizada sobre tu identidad, RIF o cédula,
          dirección de entrega y datos de contacto.
        </p>
        <p>
          Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Cualquier
          actividad realizada desde tu cuenta se presume autorizada por ti, salvo que nos notifiques
          lo contrario de forma inmediata ante un uso no autorizado.
        </p>
      </section>

      <section id="uso-permitido" className="terminos-seccion">
        <h2>4. Uso Permitido de la Plataforma</h2>
        <p>Al usar el Sitio, te comprometes a NO:</p>
        <ul className="terminos-lista">
          <li>Usar la plataforma con fines distintos a la gestión de tus pedidos comerciales con Carrisan.</li>
          <li>Intentar acceder a cuentas, datos o áreas administrativas que no te correspondan.</li>
          <li>Copiar, extraer masivamente o reutilizar el catálogo, precios o contenido del Sitio con fines comerciales ajenos a Carrisan.</li>
          <li>Interferir con el funcionamiento técnico del Sitio o de los servidores que lo alojan.</li>
          <li>Suministrar información falsa sobre tu identidad, RIF o capacidad de pago.</li>
        </ul>
      </section>

      <section id="catalogo-precios" className="terminos-seccion">
        <h2>5. Catálogo, Precios y Disponibilidad</h2>
        <p>
          Los precios se muestran en dólares estadounidenses (USD), con una referencia informativa
          en bolívares (VES) calculada según la tasa de cambio vigente al momento de la consulta.
          Esta conversión es solo referencial; el monto a facturar se fija en USD (o su equivalente
          en VES a la tasa aplicable el día de la orden, según lo acordado con cada cliente).
        </p>
        <p>
          Los precios, descuentos, existencias y fichas de producto pueden cambiar sin previo aviso
          y no constituyen una oferta irrevocable. Si detectamos un error evidente de precio o
          inventario después de recibir tu pedido, podremos contactarte para confirmar el precio
          correcto o cancelar la orden, notificándotelo en cualquier caso.
        </p>
      </section>

      <section id="pedidos" className="terminos-seccion">
        <h2>6. Proceso de Pedidos</h2>
        <p>
          Un pedido se considera <strong>solicitado</strong> cuando confirmas tu carrito desde la
          plataforma, y <strong>aceptado</strong> únicamente cuando nuestro equipo confirma
          disponibilidad y condiciones finales de precio, pago y despacho. Recibirás una
          notificación con el número de orden y su estado en cada etapa.
        </p>
        <p>
          Nos reservamos el derecho de ajustar cantidades, rechazar o cancelar pedidos por falta de
          disponibilidad, inconsistencias en el pago, o cuando existan indicios razonables de uso
          indebido de la cuenta o de la Línea de Crédito.
        </p>
      </section>

      <section id="pagos" className="terminos-seccion">
        <h2>7. Pagos y Línea de Crédito</h2>
        <h3>A. Métodos de pago</h3>
        <p>
          Aceptamos transferencia bancaria y pago móvil. Los datos de pago se comunican al
          confirmar la orden. El pedido se procesa una vez verificado el pago o, si aplica, cargado
          a tu Línea de Crédito.
        </p>
        <h3>B. Línea de Crédito</h3>
        <p>
          La Línea de Crédito, cuando es otorgada, es un cupo revisable a discreción comercial de
          Carrisan en función de tu historial de pago y volumen de compra. Podemos suspender,
          reducir o retirar el cupo en cualquier momento, notificándotelo con antelación razonable
          salvo casos de mora o riesgo de incumplimiento.
        </p>
        <h3>C. Facturación</h3>
        <p>
          Puedes consultar tus facturas, pagos y estado de cuenta desde tu panel de cliente. Ante
          cualquier discrepancia, debes notificarla dentro de los 5 días hábiles siguientes a la
          emisión de la factura.
        </p>
      </section>

      <section id="envio" className="terminos-seccion">
        <h2>8. Envío, Retiro y Entrega</h2>
        <p>
          El despacho se coordina directamente con cada cliente según la modalidad disponible
          (retiro en punto acordado o entrega a domicilio). Los tiempos estimados se comunican al
          confirmar la orden y pueden variar según ubicación, volumen del pedido y disponibilidad
          logística.
        </p>
        <p>
          El riesgo sobre los Productos se transfiere a ti en el momento de la entrega o retiro. Es
          tu responsabilidad verificar el estado y cantidad de los Productos recibidos al momento de
          la entrega.
        </p>
      </section>

      <section id="devoluciones" className="terminos-seccion">
        <h2>9. Devoluciones y Garantías</h2>
        <p>
          Solo se aceptan devoluciones por Productos vencidos, dañados o defectuosos al momento de
          la entrega. Debes notificarlo dentro de las 48 horas siguientes a la recepción, adjuntando
          evidencia fotográfica y el número de orden correspondiente.
        </p>
        <div className="terminos-destacado">
          Por tratarse de productos farmacéuticos y de cuidado de la salud, no se aceptan
          devoluciones de Productos abiertos, manipulados o cuya cadena de frío o almacenamiento no
          pueda garantizarse una vez entregados, salvo defecto de fábrica comprobable.
        </div>
      </section>

      <section id="propiedad-intelectual" className="terminos-seccion">
        <h2>10. Propiedad Intelectual</h2>
        <p>
          El logo, nombre comercial, diseño de la plataforma, fichas de producto redactadas por
          Carrisan y demás contenido del Sitio son propiedad de Droguería Carrisan o de sus
          licenciantes, y están protegidos por las leyes de propiedad intelectual aplicables. Se te
          concede una licencia limitada, no exclusiva y revocable para acceder y usar el Sitio
          únicamente con fines de compra dentro de tu actividad comercial autorizada.
        </p>
        <p>
          No está permitido reproducir, distribuir o crear obras derivadas del contenido del Sitio
          sin autorización previa y por escrito de Carrisan.
        </p>
      </section>

      <section id="contenido-usuario" className="terminos-seccion">
        <h2>11. Contenido Generado por el Usuario</h2>
        <p>
          Si nos envías comentarios, sugerencias o cualquier tipo de retroalimentación sobre la
          plataforma, nos autorizas a usarla libremente para mejorar nuestros servicios, sin que
          esto genere obligación de compensación ni de atribución.
        </p>
      </section>

      <section id="privacidad" className="terminos-seccion">
        <h2>12. Privacidad y Protección de Datos</h2>
        <p>
          La información que nos proporcionas (datos de identificación, RIF, direcciones,
          información de pago) se utiliza exclusivamente para gestionar tu cuenta, procesar pedidos
          y darte soporte. No compartimos tus datos con terceros salvo que sea necesario para el
          despacho de tu pedido o por requerimiento legal.
        </p>
      </section>

      <section id="responsabilidad" className="terminos-seccion">
        <h2>13. Limitación de Responsabilidad</h2>
        <div className="terminos-destacado">
          En la medida permitida por la ley aplicable, Droguería Carrisan no será responsable por
          daños indirectos, incidentales o consecuenciales derivados del uso de la plataforma,
          retrasos logísticos fuera de nuestro control razonable, o del uso inadecuado de los
          Productos una vez entregados. Nuestra responsabilidad total frente a ti, en cualquier
          caso, no excederá el valor del pedido correspondiente.
        </div>
        <p>
          Nada en esta sección limita responsabilidades que no puedan excluirse conforme a la ley
          venezolana.
        </p>
      </section>

      <section id="indemnizacion" className="terminos-seccion">
        <h2>14. Indemnización</h2>
        <p>
          Aceptas indemnizar a Droguería Carrisan frente a reclamos de terceros que surjan del uso
          indebido de tu cuenta, del incumplimiento de estos Términos, o del uso inadecuado de los
          Productos adquiridos fuera de las condiciones informadas por el fabricante.
        </p>
      </section>

      <section id="terminacion" className="terminos-seccion">
        <h2>15. Suspensión y Terminación de Cuenta</h2>
        <p>
          Podemos suspender o cancelar tu acceso a la plataforma, con o sin previo aviso, en caso de
          incumplimiento de estos Términos, mora prolongada, o uso fraudulento de la cuenta o la
          Línea de Crédito. Las obligaciones de pago pendientes se mantienen vigentes tras la
          terminación de la cuenta.
        </p>
      </section>

      <section id="modificaciones" className="terminos-seccion">
        <h2>16. Modificaciones a estos Términos</h2>
        <p>
          Podemos actualizar estos Términos periódicamente. Los cambios entran en vigor al
          publicarse en esta página, salvo que se indique lo contrario. El uso continuado de la
          plataforma tras una actualización implica tu aceptación de los Términos revisados.
        </p>
      </section>

      <section id="ley-aplicable" className="terminos-seccion">
        <h2>17. Ley Aplicable y Jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier
          controversia derivada de su interpretación o cumplimiento será sometida a los tribunales
          competentes de Venezuela, salvo que las partes acuerden expresamente un mecanismo
          distinto de resolución.
        </p>
      </section>

      <section id="contacto" className="terminos-seccion">
        <h2>18. Contacto</h2>
        <p>
          Si tienes preguntas sobre estos Términos, puedes escribirnos a{' '}
          <a href="mailto:dcarrisan@gmail.com">dcarrisan@gmail.com</a>.
        </p>
      </section>
    </>
  )
}

export default TerminosContent
