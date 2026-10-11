# Chambapp

**Una mano, justo cuando la necesitas.**

Servicios para tu hogar con profesionales verificados, precio aprobado, pago protegido y garantía.

MVP funcional de demostración para Ciudad de México. Cliente, profesional y administrador de condominio pueden recorrer la experiencia en el mismo navegador. Los pagos, verificaciones, garantías y protección son **simulados**: no existe un cobro, una verificación de identidad ni un seguro real. No se conectan mapas, WhatsApp, SAT, aseguradoras o bancos.

## Abrirlo en tu Mac

1. Instala Node.js **22 o posterior** (la versión LTS del instalador oficial incluye npm).
2. En [GitHub](https://github.com/Patricio92/Chambapp), pulsa **Code → Download ZIP**. Abre el ZIP para descomprimirlo.
3. Abre **Terminal**: presiona `⌘ + espacio`, escribe Terminal y presiona Enter.
4. Escribe `cd `, con un espacio al final. Arrastra la **carpeta descomprimida Chambapp-main** desde Finder a Terminal y presiona Enter.
5. Copia estas dos líneas dentro de Terminal y presiona Enter:

```sh
npm install
npm run dev
```

6. Mantén Terminal abierta. En Chrome, Safari o Firefox escribe `http://localhost:3000` en la barra de direcciones.

Para detener la aplicación, vuelve a Terminal y presiona `Control + C`. Para abrirla otro día, vuelve a entrar en la carpeta y ejecuta `npm run dev`. Si ya tenías una versión anterior, detén esa versión y descarga nuevamente el ZIP; verifica que Terminal esté dentro de la carpeta nueva.

En el entorno de desarrollo remoto, usa el acceso al puerto que ofrezca la herramienta. La interfaz de onboarding no proporciona una vista web.

## Recorrer la experiencia

### Cliente y profesional

1. Como **Cliente**, crea tu cuenta con datos de prueba. Elige **Plomería**, escribe **06700**, selecciona **Roma Norte**, explica el problema y adjunta fotos si deseas. Puedes marcar **Necesito atención urgente**.
2. Revisa y confirma la visita: **$250 MXN**. La reparación se cotiza por separado. **Si aceptas continuar, los $250 se descuentan del total de reparación.** La urgencia no aumenta el precio en este MVP.
3. En el detalle del servicio, pulsa **Simular pago protegido de visita**. No se cobra dinero.
4. Cambia a **Profesional**. Mariana Soto es un perfil de ejemplo para plomería; Luis Herrera lo es para electricidad. También puedes registrar tu propio profesional y simular sus indicadores de verificación.
5. Abre la solicitud y acepta la visita. Envía una cotización formal con diagnóstico, mano de obra, materiales, alcances, exclusiones, tiempo, garantía, notas y fotos opcionales. El total incluye el diagnóstico: por ejemplo, $800 de mano de obra + $200 de materiales = $1,000; quedan $750 por proteger después de descontar la visita.
6. Como **Cliente**, abre **Mis servicios**. Revisa la cotización y acéptala o recházala. Si la aceptas, simula el pago protegido del saldo. La cotización aprobada queda guardada con fecha y nombre del cliente.
7. Como **Profesional**, inicia **En reparación**, adjunta fotos antes/durante/después y pulsa **Informar que terminé el servicio**. No puedes empezar sin aprobación y pago simulado protegido.
8. Como **Cliente**, revisa la evidencia y pulsa **Confirmar servicio terminado y liberar pago**. Solo entonces se libera el pago simulado y comienzan los **7 días de garantía sobre mano de obra**, también simulados. Califica al profesional.
9. Desde el historial, abre **Reportar problema con este servicio**, explica qué sucedió y adjunta fotos. Puedes simular las etapas Revisión → Contactando profesional → Revisión técnica → Resuelto. Una reclamación abierta impide terminar o confirmar el trabajo. Si el pago ya se había liberado, la reclamación no lo recupera automáticamente. La resolución de ejemplo no decide reembolsos ni indemnizaciones.

Si rechazas la cotización, el profesional no puede reparar. El cliente puede confirmar que recibió el diagnóstico para liberar únicamente los $250 simulados de la visita.

### Administrador de condominio

Cambia a **Administrador** para ver dos edificios y un gasto de ejemplo. Registra otro edificio, solicita un servicio para áreas comunes y recorre el mismo proceso de cotización y confirmación con el profesional. Consulta el historial, guarda profesionales favoritos y descarga comprobantes de demostración. El botón de invitación muestra una simulación; no invita ni envía mensajes reales a residentes. Los comprobantes son archivos de texto, **no facturas SAT**.

## Qué se conserva

El detalle incluye fecha, cliente, profesional, categoría, domicilio/colonia, descripción, fotos del problema, diagnóstico, versiones de cotización, aceptación, estados, pagos simulados, garantía, evidencia por etapa, calificación y reclamaciones. Se almacena en **IndexedDB en ese navegador** para poder guardar fotografías. No se pierde al recargar o reiniciar el servidor si conservas el mismo navegador, dirección y puerto.

Las solicitudes y perfiles de versiones anteriores se importan conservando una copia. No se inventan pagos, aceptaciones ni garantías para ese historial. Los trabajos anteriores en curso requieren una cotización formal nueva; sus cotizaciones antiguas siguen visibles. No se cobra retrospectivamente una visita a esos trabajos.

**Este MVP no tiene autenticación ni servidor de datos compartido.** Cambiar el tipo de cuenta o la cuenta de demostración permite representar a distintas personas en el mismo navegador. No conecta usuarios en dispositivos distintos; usa datos ficticios. Borrar los datos del sitio borra el historial. Trabaja en una sola pestaña para evitar cambios simultáneos; el prototipo no ofrece coordinación entre pestañas.

## Catálogos y confianza

Se conservan **201 servicios en 14 categorías**, las **16 alcaldías** y **1,394 códigos postales con 2,027 colonias/asentamientos** de una copia histórica de SEPOMEX, abril de 2016. No se afirma que sea el catálogo vigente. Ver [SOURCES.md](SOURCES.md).

El profesional recibe solicitudes compatibles con su especialidad, disponibilidad y alcaldía, o con todas las alcaldías si selecciona esa cobertura de demostración. No hay cálculo de distancias ni mapas. Un trabajo activo lo mantiene ocupado hasta la confirmación del cliente.

Los indicadores de identidad, teléfono, dirección, referencias y capacitación están señalados como simulados. **Profesional Verificado Chambapp**, **Chambapp Pro** y **Chambapp Score** son ejemplos provisionales. El score considera calificación, trabajos terminados, cancelaciones, reclamaciones, puntualidad y aceptación de cotizaciones; los perfiles de ejemplo tienen métricas ficticias. Los umbrales de la insignia superior no son todavía una política comercial definitiva.

**Protección Chambapp** contempla una futura integración contra daños accidentales; no hay seguro ni aseguradora conectada. La garantía demostrativa es de 7 días sobre mano de obra; las condiciones definitivas podrán variar por categoría.

## Desarrollo y pruebas

No hay dependencias externas para ejecutar la aplicación. Para una instalación reproducible:

```sh
npm ci --ignore-scripts --cache /tmp/chambapp-npm-cache
npm run check
npm test
npm run dev
```

Las pruebas de reglas comprueban aprobación previa, descuento del diagnóstico, pagos, autorización por cuenta, cotizaciones, fotografías, reclamaciones, garantía, migración y el flujo de las 201 especialidades.

La prueba de navegador es opcional para desarrollo y requiere Playwright instalado aparte. No es una dependencia de Chambapp:

```sh
npm install --prefix /tmp/chambapp-browser --cache /tmp/chambapp-npm-cache playwright
CHAMBAPP_PLAYWRIGHT_MODULE=/tmp/chambapp-browser/node_modules/playwright/index.mjs CHAMBAPP_BROWSER_PATH=/usr/bin/chromium node scripts/browser-mvp-smoke.mjs
```

En otras máquinas, usa el navegador instalado por Playwright y omite `CHAMBAPP_BROWSER_PATH`. `CHAMBAPP_TEST_URL` permite elegir otro puerto. El recorrido comprueba cliente, profesional y administrador en tamaños de escritorio y celular, fotos, cotización aprobada/rechazada, pago, evidencia, confirmación, calificación, reclamación, persistencia y comprobantes. Las capturas y resultados se escriben fuera del proyecto en `/tmp/chambapp-mvp-tests`.

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para la estructura y las integraciones futuras.
