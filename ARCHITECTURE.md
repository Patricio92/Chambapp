# Arquitectura de Chambapp

MVP sin dependencias de ejecución: HTML/CSS, módulos JavaScript y servidor HTTP Node.js para servir archivos. No hay endpoints de negocio ni proveedores externos activos. Las reglas y la persistencia se separan de las pantallas para poder trasladarlas a un servidor posteriormente.

| Archivo | Responsabilidad |
| --- | --- |
| `src/app.js` | Pantallas, tres roles, formularios y controles de la simulación |
| `src/model.js` | Creación de solicitudes, cotizaciones, aceptación, servicio, evidencia, garantía y reclamaciones |
| `src/payments.js` | Estados y adaptador de pago simulado |
| `src/config.js` | Marca, política de precio y garantía, con versiones |
| `src/storage.js` | IndexedDB, cuentas y edificios de ejemplo, migración del historial anterior |
| `src/photos.js` | Validar y comprimir fotos en el navegador; máximo 5 por adjunto/etapa |
| `src/trust.js` | Verificaciones, métricas, insignias y score provisional |
| `src/broker.js` | Especialidad, disponibilidad y cobertura simulada por alcaldía |
| `src/location.js`, `src/data/` | Catálogos de servicios y validación postal |
| `manifest.webmanifest`, `src/icon.svg` | Identidad Chambapp; no se implementa servicio offline instalable |

## Contrato del servicio

Solicitud → pago simulado de visita protegido → profesional asignado → cotización formal → aceptación → pago simulado del saldo protegido → En reparación → Esperando confirmación → cliente confirma → Servicio terminado y Pago liberado.

Cada acción devuelve una copia del servicio y registra actor y fecha. La propiedad del servicio se valida en las acciones del modelo. No es autenticación: cualquier persona con acceso al navegador puede seleccionar una cuenta de demo. Debe implementarse autorización real en un servidor antes de operar con personas reales.

La tarifa de visita se captura al crear la solicitud junto con su versión y aceptación. `pricing.rules` permite reglas futuras por servicio, urgencia, zona y hora; actualmente ninguna cambia los $250. El diagnóstico se descuenta del total por decisión del negocio. El ejemplo de $1,000 requiere $250 de visita + $750 de saldo, no $1,250. Si el total equivale a $250, el saldo simulado es cero. Las cotizaciones deben incluir al menos el diagnóstico previamente aprobado.

La cotización guarda diagnóstico, mano de obra, materiales, total, inclusiones, exclusiones, tiempo, garantía, notas, fotos y términos. Se conserva cada versión previa a la aprobación. La aceptación copia la versión elegida con fecha y cliente; cambiar otra copia de la cotización no modifica ese registro. No se permiten cotizaciones nuevas después de la aceptación en este MVP. Las ampliaciones futuras necesitarán un flujo explícito de nueva aprobación, sin sobrescribir el contrato anterior.

La finalización del profesional no libera el pago. La confirmación del cliente libera visita y saldo simulados e inicia los 7 días de garantía. Rechazar una cotización no autoriza una reparación; existe una confirmación separada del diagnóstico para liberar la visita. No se fijan comisiones, recargos urgentes, penalizaciones, políticas de cancelación o reembolsos reales.

## Persistencia y fotografías

IndexedDB guarda el estado y fotografías comprimidas como JPEG de máximo 1,200 píxeles por lado mayor. Se aceptan JPG/PNG/WebP de hasta 8 MB, máximo 5 por selección y 5 por etapa de evidencia; el modelo limita también el tamaño final. No se aceptan SVG ni documentos como fotos. La evidencia conserva profesional, etapa y fecha por fotografía. El historial anterior de `chambapp-demo-v1` se conserva íntegro como respaldo y se migra sin inventar pagos ni aceptación.

Al integrar un servidor: usar base de datos compartida, autenticación y sesiones, controles de acceso del lado del servidor, almacenamiento privado para fotos, URLs temporales, cuotas, validación de archivos y copias de respaldo. El almacenamiento local no es un registro inviolable ni un respaldo externo.

## Pago, verificación y protección futuras

El adaptador de simulación no envía dinero ni información bancaria. Para conectar Stripe, Mercado Pago, Conekta u otro proveedor, implementar un adaptador **en el servidor**, con credenciales seguras, identificación de la operación, idempotencia, webhooks verificados y conciliación. Los estados visibles actuales pueden mantenerse, pero la disponibilidad legal y técnica de retención/liberación debe comprobarse con el proveedor elegido antes de prometerla comercialmente.

Los indicadores de verificación son campos del perfil. Integraciones futuras deben guardar proveedor, estado, fechas y evidencia de revisión en servidor; el botón de simulación desaparecerá de la experiencia real. El score actual pondera calificación, volumen, cancelaciones, reclamaciones, puntualidad y aceptación. La puntualidad, cancelaciones y métricas iniciales son datos ficticios; no se obtienen de GPS ni de comprobaciones externas. La insignia Pro provisional usa verificación, score ≥90 y ≥20 servicios; estos umbrales son parámetros de demostración pendientes de política comercial.

Protección Chambapp es un concepto visual futuro. No hay póliza, prima, aseguradora ni siniestro real. Una integración deberá incluir coberturas y consentimiento explícitos; no se confunde con la garantía simulada de mano de obra.

## Reclamaciones

Se conserva explicación, fotos, fecha, cobertura simulada y cada etapa: Revisión → Contactando profesional → Revisión técnica → Resuelto. La cobertura depende del periodo registrado al confirmar el servicio, sin cobertura retroactiva de servicios importados. Se permiten reportes fuera del periodo, identificados sin cobertura confirmada.

Un reporte durante el trabajo o esperando confirmación pone el saldo En disputa y bloquea finalización/liberación. Una revisión simulada devuelve el estado anterior sin decidir una compensación. Un reporte posterior al pago liberado no revierte el pago ni altera su fecha de liberación. Los controles de avance corresponden únicamente a la demo; el soporte real debe tener un rol y autorización propios.

## Condominios

Las cuentas de administrador tienen edificios, favoritos y solicitudes de áreas comunes. Los trabajos usan el mismo contrato y se ligan a `buildingId`; los gastos de ejemplo están separados. Las descargas son comprobantes de texto de demostración, no CFDI. Invitaciones muestran un aviso sin enviar nada. Contabilidad empresarial, permisos de residentes, facturación y notificaciones quedan para una etapa posterior.
