import { LegalLink } from './LegalModal'
import '../../pages/TerminosComerciales.css'

// ---------------------------------------------------------
// Contenido de "Politica Comercial" — extraido de src/pages/TerminosComerciales.jsx.
// Se usa tanto en la pagina completa como dentro de LegalModal,
// para que el usuario pueda leerlo sin salir del formulario de
// registro y perder los datos ya escritos.
// ---------------------------------------------------------
function TerminosComercialesContent() {
  return (
    <>
      <section id="objeto" className="comercial-seccion">
        <h2>1. Objeto y Aceptación</h2>
        <p>
          Esta Política Comercial (la "<strong>Política</strong>") regula el funcionamiento de
          la <strong>Línea de Crédito B2B</strong> ofrecida por Droguería Carrisan ("
          <strong>Carrisan</strong>", "<strong>nosotros</strong>") a sus clientes institucionales,
          como modalidad de pago alternativa al contado dentro de la plataforma.
        </p>
        <p>
          Esta Política complementa —y no reemplaza— nuestros{' '}
          <LegalLink doc="terminos">Términos y Condiciones de Uso</LegalLink> y nuestro{' '}
          <LegalLink doc="privacidad">Aviso de Privacidad</LegalLink>. Al aceptarla durante tu registro, o al
          utilizar la Línea de Crédito una vez aprobada, aceptas quedar obligado por las
          condiciones aquí descritas.
        </p>
      </section>

      <section id="definiciones" className="comercial-seccion">
        <h2>2. Definiciones</h2>
        <ul className="comercial-lista">
          <li><strong>"Línea de Crédito":</strong> el cupo de compra a crédito asignado a tu cuenta, expresado en dólares estadounidenses (USD), sujeto a evaluación y aprobación de Carrisan.</li>
          <li><strong>"Compra de contado" o "efectiva":</strong> un pedido pagado bajo modalidad de contado cuyo comprobante de pago ha sido verificado por Carrisan (no basta con el reporte del pago por el cliente).</li>
          <li><strong>"Pedido a crédito":</strong> un pedido cargado a la Línea de Crédito en lugar de pagado de contado al momento de la orden.</li>
          <li><strong>"Plazo de crédito":</strong> el número de días, contados desde la creación del pedido, dentro de los cuales debe cancelarse un pedido a crédito.</li>
          <li><strong>"Vencido":</strong> un pedido a crédito cuyo plazo de crédito ha transcurrido sin haberse verificado el pago correspondiente.</li>
        </ul>
      </section>

      <section id="elegibilidad" className="comercial-seccion">
        <h2>3. Elegibilidad Inicial</h2>
        <p>
          Toda cuenta nueva opera <strong>exclusivamente bajo la modalidad de contado</strong>{' '}
          hasta cumplir con los siguientes requisitos:
        </p>
        <ul className="comercial-lista">
          <li>Completar <strong>3 (tres) compras efectivas</strong> de contado (ver definición en la Sección 2).</li>
          <li>Mantener el <strong>RIF actualizado y vigente</strong> en el perfil de la cuenta.</li>
        </ul>
        <p>
          No exigimos declaración de ISLR, solvencia SENIAT, ni ningún otro documento fiscal
          adicional para la evaluación de crédito. Cumplidos estos dos requisitos, la cuenta
          entra en <strong>revisión de aprobación de crédito</strong> por parte de nuestro
          equipo administrativo. Cumplir los requisitos de elegibilidad no garantiza la
          aprobación (ver Sección 4).
        </p>
      </section>

      <section id="aprobacion" className="comercial-seccion">
        <h2>4. Aprobación y Monto de la Línea de Crédito</h2>
        <p>
          El monto de la Línea de Crédito es determinado <strong>manualmente por nuestro
          equipo administrativo</strong>, con base en tu historial de compras y demás criterios
          internos de evaluación comercial. No existe una fórmula automática ni un monto
          mínimo o máximo publicado: cada aprobación es una decisión caso por caso.
        </p>
        <div className="comercial-destacado">
          La administración conserva en todo momento la facultad de modificar manualmente el
          monto de la Línea de Crédito ya aprobada —para aumentarla o reducirla— sin que ello
          requiera solicitud previa del cliente.
        </div>
      </section>

      <section id="plazo" className="comercial-seccion">
        <h2>5. Plazo de Crédito</h2>
        <p>
          El plazo estándar de la Línea de Crédito es de <strong>7 días</strong>, contados a
          partir de la fecha de creación de cada pedido.
        </p>
        <p>
          Excepcionalmente, clientes con <strong>historial crediticio favorable</strong> con
          Carrisan pueden acceder a un plazo extendido de <strong>14 días</strong>, sujeto
          también a evaluación y aprobación manual de nuestro equipo administrativo.
        </p>
        <p>
          El plazo de vencimiento de cada pedido queda fijado al momento de su creación y no
          varía posteriormente, independientemente de cambios futuros en esta Política.
        </p>
      </section>

      <section id="ampliacion" className="comercial-seccion">
        <h2>6. Ampliación de la Línea de Crédito</h2>
        <p>
          Puedes optar a una <strong>ampliación</strong> de tu Línea de Crédito aprobada si
          cumples, de forma sostenida durante <strong>3 meses consecutivos</strong>, con el
          siguiente criterio mínimo de compras:
        </p>
        <ul className="comercial-lista">
          <li>Un monto acumulado mínimo de <strong>USD 500</strong> en compras dentro de cada período de 30 días, y</li>
          <li><strong>3 (tres) o más pedidos</strong> dentro de ese mismo período de 30 días.</li>
        </ul>
        <p>
          Cumplir este criterio mínimo no es automático ni garantiza la ampliación: al igual
          que la aprobación inicial, toda solicitud de ampliación es evaluada y autorizada
          manualmente por nuestro equipo administrativo. Tu <strong>historial de pagos</strong>{' '}
          (puntualidad en la cancelación de pedidos a crédito) es un factor determinante en
          esta evaluación (ver Sección 9).
        </p>
      </section>

      <section id="moneda" className="comercial-seccion">
        <h2>7. Moneda de Referencia y Tasa de Cambio</h2>
        <p>
          El <strong>dólar estadounidense (USD)</strong> es la moneda de referencia para toda
          la operación de la Línea de Crédito (monto de línea aprobada, precios, saldos), con
          el fin de mantener la mayor transparencia y eficiencia posible frente a la variación
          cambiaria.
        </p>
        <div className="comercial-destacado">
          Cuando el pago de un pedido a crédito se realiza en bolívares, el monto se convierte
          aplicando la <strong>tasa de cambio vigente el día en que se efectúa y verifica el
          pago</strong> — no la tasa del día en que se emitió el pedido.
        </div>
      </section>

      <section id="facturacion" className="comercial-seccion">
        <h2>8. Facturación</h2>
        <p>
          La factura de un pedido a crédito se emite en la fecha en que el pago es{' '}
          <strong>cancelado y verificado</strong>, no en la fecha de creación del pedido. Esto
          es independiente del ciclo de vencimiento de 7 o 14 días descrito en la Sección 5,
          que se calcula siempre desde la creación del pedido.
        </p>
        <p>
          Puedes consultar tus facturas, pagos y estado de cuenta desde tu panel de cliente en
          todo momento.
        </p>
      </section>

      <section id="mora" className="comercial-seccion">
        <h2>9. Mora e Incumplimiento de Pago</h2>
        <p>
          Carrisan <strong>no aplica intereses, recargos ni penalidades monetarias</strong> por
          atraso en el pago de pedidos a crédito.
        </p>
        <p>
          Sin embargo, el historial de atrasos —aunque no penalizado directamente en el
          momento— <strong>sí es considerado como factor negativo</strong> en la evaluación de
          futuras solicitudes de ampliación de tu Línea de Crédito (Sección 6), y puede
          motivar la reducción o revocación de la línea ya aprobada (Sección 10).
        </p>
      </section>

      <section id="suspension" className="comercial-seccion">
        <h2>10. Suspensión y Revocación de la Línea</h2>
        <p>
          Nos reservamos el derecho de suspender, reducir o revocar la Línea de Crédito de
          cualquier cliente en cualquier momento, de forma manual, cuando lo consideremos
          pertinente con base en el comportamiento de pago o cualquier otro criterio interno de
          riesgo comercial.
        </p>
      </section>

      <section id="bloqueo-checkout" className="comercial-seccion">
        <h2>11. Bloqueo de Compras a Crédito</h2>
        <p>
          Si tu cuenta acumula uno o más pedidos <strong>vencidos</strong> (no pagados dentro
          del plazo de 7 o 14 días correspondiente) con más de <strong>20 días de atraso</strong>,
          el sistema bloquea automáticamente la creación de <strong>nuevas compras a crédito</strong>{' '}
          hasta que dichos pedidos sean regularizados. Esto no afecta tu posibilidad de seguir
          comprando de contado.
        </p>
        <p>
          Adicionalmente, podemos bloquear tu Línea de Crédito de forma manual cuando lo
          consideremos pertinente (ver Sección 10), incluso antes de cumplirse dicho atraso.
        </p>
      </section>

      <section id="modificaciones" className="comercial-seccion">
        <h2>12. Modificaciones a esta Política</h2>
        <p>
          Podemos actualizar esta Política periódicamente. Los cambios entran en vigor al
          publicarse en esta página, salvo que se indique lo contrario. Los plazos y montos ya
          fijados en pedidos existentes al momento del cambio no se ven afectados
          retroactivamente. El uso continuado de la Línea de Crédito tras una actualización
          implica tu aceptación de la Política revisada.
        </p>
      </section>

      <section id="ley-aplicable" className="comercial-seccion">
        <h2>13. Ley Aplicable y Jurisdicción</h2>
        <p>
          Esta Política se rige por las leyes de la República Bolivariana de Venezuela.
          Cualquier controversia derivada de su interpretación o cumplimiento será sometida a
          los tribunales competentes de Venezuela, salvo que las partes acuerden expresamente
          un mecanismo distinto de resolución.
        </p>
      </section>

      <section id="contacto" className="comercial-seccion">
        <h2>14. Contacto</h2>
        <p>
          Si tienes preguntas sobre esta Política Comercial o sobre el estado de tu Línea de
          Crédito, puedes escribirnos a{' '}
          <a href="mailto:dcarrisan@gmail.com">dcarrisan@gmail.com</a>.
        </p>
      </section>
    </>
  )
}

export default TerminosComercialesContent
