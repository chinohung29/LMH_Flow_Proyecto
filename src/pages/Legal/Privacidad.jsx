import LegalLayout from '../../components/LegalLayout'

export default function Privacidad() {
  return (
    <LegalLayout titulo="Política de Privacidad" actualizado="6 de agosto de 2026">
      <p>
        Esta política explica qué datos personales recolecta <strong>LMH Flow</strong> (el
        "Servicio"), para qué se usan y qué derechos tenés sobre ellos, en línea con la Ley
        25.326 de Protección de Datos Personales de la República Argentina.
      </p>

      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable de los datos personales tratados a través de LMH Flow es{' '}
          <strong>Luis Martínez</strong> (LMH Consulting), CUIT 20-95684445-3, con domicilio en
          Quirós 2757, Ciudad Autónoma de Buenos Aires, Argentina. Podés contactarnos por
          cualquier consulta de privacidad a{' '}
          <a href="mailto:lamh2903@gmail.com">lamh2903@gmail.com</a> o por WhatsApp al{' '}
          <a href="https://wa.me/541173724119" target="_blank" rel="noopener noreferrer">
            +54 9 11 7372-4119
          </a>
          .
        </p>
      </section>

      <section>
        <h2>2. Qué datos recolectamos</h2>
        <ul>
          <li>
            <strong>Datos de la cuenta:</strong> nombre, email y contraseña (almacenada de forma
            encriptada, nunca en texto plano) al registrarte.
          </li>
          <li>
            <strong>Datos de la empresa:</strong> el nombre de tu empresa y de las cuentas
            bancarias/cajas que crees dentro de la app.
          </li>
          <li>
            <strong>Datos financieros que vos cargás:</strong> movimientos (montos, fechas,
            descripciones, categorías), y los nombres de tus clientes y proveedores que
            registres. Estos datos son tuyos y los tratamos únicamente para prestarte el
            Servicio — nunca los usamos con otro fin ni los vendemos.
          </li>
          <li>
            <strong>Datos de facturación:</strong> si contratás un plan pago, Mercado Pago
            procesa el cobro y nos informa el estado de tu suscripción; LMH Flow no almacena
            números de tarjeta ni datos bancarios.
          </li>
          <li>
            <strong>Datos técnicos básicos:</strong> dirección IP y tipo de dispositivo/navegador,
            recolectados automáticamente por la infraestructura que aloja el Servicio (ver
            sección 4) para operar y dar soporte a la app.
          </li>
        </ul>
        <p className="mt-3">
          Si cargás datos personales de tus propios clientes o proveedores (por ejemplo, sus
          nombres) dentro de LMH Flow, sos responsable de haberlos obtenido de forma lícita y de
          contar con base legal para tratarlos vos mismo.
        </p>
      </section>

      <section>
        <h2>3. Para qué usamos tus datos</h2>
        <ul>
          <li>Darte acceso al Servicio y mostrarte tu información financiera.</li>
          <li>Procesar el cobro de tu suscripción y gestionar tu plan.</li>
          <li>Responder consultas de soporte.</li>
          <li>
            Si usás la función "IA Financiera", generar las respuestas o análisis que
            solicitás (ver sección 5 sobre esta función en particular).
          </li>
          <li>Cumplir obligaciones legales e impositivas que nos correspondan.</li>
          <li>Mejorar el Servicio (sin vender ni ceder tus datos a terceros con fines comerciales).</li>
        </ul>
      </section>

      <section>
        <h2>4. Con quién compartimos datos (proveedores/encargados del tratamiento)</h2>
        <p>
          Para operar LMH Flow usamos los siguientes proveedores externos, que actúan como
          encargados del tratamiento y solo acceden a los datos necesarios para prestar su
          servicio:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> (Canadá): aloja la base de datos y gestiona la
            autenticación de usuarios. Es donde vive toda tu información.
          </li>
          <li>
            <strong>Netlify</strong>: aloja la aplicación web (frontend).
          </li>
          <li>
            <strong>Mercado Pago</strong> (Argentina): procesa los cobros de las suscripciones
            pagas.
          </li>
          <li>
            <strong>Groq</strong> (Estados Unidos): si usás la función "IA Financiera", tu
            consulta y un resumen de tus datos financieros (saldos, movimientos recientes,
            categorías) se envían a la API de Groq para generar la respuesta. Esta función es
            opcional — si no la usás, no se envía ningún dato a este proveedor.
          </li>
          <li>
            <strong>dolarapi.com</strong>: consultamos la cotización pública del dólar oficial
            para calcular precios en pesos; no se envía ningún dato personal en esa consulta.
          </li>
        </ul>
        <p className="mt-3">
          Como algunos de estos proveedores procesan datos fuera de Argentina, esto implica una
          transferencia internacional de datos en los términos del art. 12 de la Ley 25.326;
          todos ellos cuentan con sus propias políticas de seguridad y privacidad.
        </p>
      </section>

      <section>
        <h2>5. Función "IA Financiera"</h2>
        <p>
          Esta función (disponible en el plan Platinum) usa un modelo de lenguaje de un tercero
          (actualmente Groq) para responder preguntas y generar observaciones sobre tus datos
          financieros. Es una función opcional: solo se activa cuando entrás a esa sección o
          apretás "Analizar con IA". Las respuestas se generan automáticamente y pueden contener
          errores — no reemplazan el asesoramiento de un contador o asesor financiero.
        </p>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Como titular de tus datos personales, tenés derecho a acceder, rectificar, actualizar
          y suprimir tus datos (Ley 25.326, arts. 14 a 16), así como a revocar el consentimiento
          prestado. Podés ejercerlos:
        </p>
        <ul>
          <li>
            Vos mismo, directamente desde la app: podés editar tus datos, exportar tus
            movimientos a Excel en cualquier momento, y eliminar cuentas/movimientos/clientes.
          </li>
          <li>
            Escribiéndonos a <a href="mailto:lamh2903@gmail.com">lamh2903@gmail.com</a> para
            pedir la baja completa de tu cuenta o cualquier otro reclamo vinculado a tus datos.
          </li>
        </ul>
        <p className="mt-3">
          La Agencia de Acceso a la Información Pública (AAIP), en su carácter de Órgano de
          Control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que
          se interpongan con relación al incumplimiento de las normas sobre protección de datos
          personales.
        </p>
      </section>

      <section>
        <h2>7. Conservación de los datos</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si pedís la baja, eliminamos tus
          datos dentro de un plazo razonable, salvo la información que debamos conservar por
          obligaciones legales o impositivas.
        </p>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>
          Tus datos viajan siempre encriptados (HTTPS) y en la base de datos aplicamos reglas de
          acceso (Row Level Security) para que cada empresa solo pueda ver y editar su propia
          información. Ningún sistema es 100% infalible, pero tomamos medidas razonables acordes
          al estándar de la industria para proteger tu información.
        </p>
      </section>

      <section>
        <h2>9. Cookies y almacenamiento local</h2>
        <p>
          LMH Flow no usa cookies de publicidad ni de rastreo (no tenemos Google Analytics ni
          píxeles de redes sociales). Usamos únicamente almacenamiento local del navegador
          (localStorage) para guardar tu sesión iniciada, algo estrictamente necesario para que
          la app funcione.
        </p>
      </section>

      <section>
        <h2>10. Menores de edad</h2>
        <p>LMH Flow está dirigido a personas mayores de 18 años que contratan el Servicio para su actividad profesional o comercial.</p>
      </section>

      <section>
        <h2>11. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política ocasionalmente. Si hacemos cambios importantes, te
          avisaremos por email o dentro de la app antes de que entren en vigencia.
        </p>
      </section>

      <section>
        <h2>12. Contacto</h2>
        <p>
          Luis Martínez (LMH Consulting) · CUIT 20-95684445-3 · Quirós 2757, CABA, Argentina ·{' '}
          <a href="mailto:lamh2903@gmail.com">lamh2903@gmail.com</a>
        </p>
      </section>
    </LegalLayout>
  )
}
