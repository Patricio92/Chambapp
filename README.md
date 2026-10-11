# Chambapp

Prototipo para conectar clientes y profesionales en Ciudad de México: 201 servicios organizados en 14 categorías, las 16 alcaldías y un catálogo postal histórico de 1,394 códigos con sus colonias.

## Ver la app

Necesitas Node.js 22 o posterior. En esta carpeta ejecuta:

```sh
npm ci --ignore-scripts --cache /tmp/chambapp-npm-cache
npm run dev
```

En tu computadora, abre http://localhost:3000 en el navegador. En un entorno remoto usa el acceso al puerto 3000 que ofrezca tu herramienta; la interfaz de onboarding no proporciona una vista web.

## Probar la intermediación con mapas

1. Como cliente, elige Plomería, escribe el código postal 06700 y selecciona Roma Norte. La alcaldía Cuauhtémoc se completa automáticamente.
2. Marca un punto en el mapa o pulsa **Usar mi ubicación** y acepta el permiso del navegador. Describe una fuga y envía la solicitud.
3. Cambia a **Soy profesional**. Regístrate con especialidad Plomería, código postal 06700 y colonia Roma Norte; marca una ubicación cercana y elige tu radio de cobertura.
4. Acepta la solicitud y envía el precio y lo que incluye. Un profesional con trabajo activo deja de recibir otras solicitudes.
5. Como cliente, abre **Mis solicitudes** y acepta o rechaza la cotización.
6. Si aceptas, como profesional pulsa **Voy en camino**, después **Ya llegué · comenzar trabajo** y finalmente **Marcar como terminado**.
7. Como cliente, califica de 1 a 5 estrellas.

Para comparar opciones, usa **Registrar otro profesional** y crea otro perfil cercano. El selector **Perfil de prueba activo** permite cambiar entre profesionales. En el formulario del cliente verás a los profesionales disponibles ordenados por distancia. **Disponible · Pausar solicitudes** cambia la disponibilidad. **Editar especialidad y ubicación** cambia especialidad, posición y radio sin perder los trabajos anteriores. **Actualizar mi ubicación** obtiene y guarda una posición nueva una sola vez.

### Qué hacen los mapas

- OpenStreetMap proporciona el fondo de calles; Leaflet 1.9.4 está incluido localmente, sin instalar paquetes adicionales.
- Se puede seleccionar un punto con clic o arrastrando el marcador. Con teclado, enfoca el mapa, muévelo con flechas y pulsa Enter para marcar el centro.
- La ubicación del navegador es opcional y se solicita solo al pulsar el botón. Funciona en localhost o HTTPS; si se deniega el permiso, puedes marcar manualmente.
- Los perfiles deben indicar su especialidad, posición, disponibilidad y cobertura entre 1 y 50 km.
- Chambapp muestra las solicitudes a perfiles compatibles y ordena candidatos por distancia geográfica, incluso entre alcaldías vecinas.
- Los mapas de cada trabajo muestran el punto del servicio y la última posición guardada del profesional. La línea punteada es una distancia directa, **no una ruta**.
- La selección de punto se limita a una extensión aproximada de CDMX; no es una comprobación del límite administrativo. El punto y la dirección postal se seleccionan por separado, sin geocodificación.

La demostración sigue guardando perfiles y solicitudes en localStorage. Permite varios profesionales y un cliente en el mismo navegador; **no conecta dispositivos diferentes ni incluye cuentas reales**. Recarga el estado desde almacenamiento antes de las acciones para reducir conflictos entre pestañas, pero no ofrece garantías de concurrencia de un servidor. No incluye pagos reales, comisión cobrada ni identidad verificada. La posición se actualiza manualmente; no hay rastreo continuo, rutas o tiempos estimados de llegada.

Los datos anteriores se conservan. Para solicitudes antiguas sin coordenadas se mantiene el filtro por alcaldía/colonia. Los perfiles anteriores necesitan añadir una posición para recibir las nuevas solicitudes por distancia. Para comenzar desde cero, borra los datos del sitio en el navegador.

### Red y siguiente etapa

El mapa requiere internet hacia `tile.openstreetmap.org`. No necesita una clave de API para esta demostración. Si no se cargan las imágenes de calles, la app muestra un aviso; los cálculos locales siguen funcionando. Los servidores públicos de OpenStreetMap tienen políticas de uso y no garantizan servicio para una plataforma a gran escala. Antes de publicar comercialmente, se debe elegir un proveedor de mapas adecuado, incorporar servidor compartido, cuentas, control de acceso y notificaciones.

Validación realizada: pruebas de lógica y un recorrido en navegador con selección manual, ubicación concedida/denegada, varios perfiles, disponibilidad, cobertura, cotización, viaje, llegada, finalización y calificación. **Se verificó la entrega de imágenes reales de calles de CDMX por HTTPS**, conservando la verificación de certificados e identificando la aplicación al proveedor. La carga directa en Chromium de este entorno sigue bloqueada por el certificado del proxy. La revisión automática rechazó modificar su almacén de confianza, y no se desactivó la verificación TLS. Las pruebas del recorrido en navegador abortan las solicitudes de imágenes para comprobar el comportamiento sin red; no se presentan como prueba de la carga directa en Chromium. Es necesario comprobar esa carga en el navegador de tu Mac.

## Catálogo y ubicación

Busca servicios por nombre o descripción (con o sin acentos), filtra por categoría o pulsa **Ver los 201 servicios**. Los formularios incluyen todas las especialidades; el registro profesional también permite buscar.

Elige una alcaldía para reducir las sugerencias de códigos postales, o escribe directamente un código de cinco dígitos. El formulario encuentra la alcaldía y ofrece las colonias asociadas. Rechaza códigos ajenos al catálogo o combinaciones incorrectas.

**Los códigos postales proceden de una copia SEPOMEX con corte de abril de 2016.** El catálogo incluye todos los registros CDMX de esa copia; no se garantiza que sea la totalidad vigente. Ver [SOURCES.md](SOURCES.md) para origen, licencia, limitaciones y reproducción de la extracción.

## Estructura

- `src/app.js`: pantallas, formularios y almacenamiento local.
- `src/model.js`: reglas para solicitudes y cotizaciones.
- `src/data/services.js`: catálogo de 201 servicios.
- `src/data/postal.js`: códigos postales, alcaldías y colonias.
- `src/location.js`: validación postal y compatibilidad con datos anteriores.
- `src/geo.js`: coordenadas y distancias geográficas.
- `src/broker.js`: candidatos por especialidad, disponibilidad y cobertura.
- `src/maps.js`: mapa, marcadores y selección de ubicación.
- `src/vendor/leaflet/`: biblioteca de mapas y licencia BSD 2-Clause.
- `src/style.css`: diseño adaptable a móvil.
- `server.js`: servidor de desarrollo sin dependencias externas.
- `tests/model.test.js`: pruebas de reglas del servicio.

```sh
npm run check
npm test
```

### Prueba de navegador para desarrollo

La app no depende de Playwright. Si quieres repetir la comprobación automatizada, instala Playwright aparte (por ejemplo, `npm install --prefix /tmp/chambapp-browser --cache /tmp/chambapp-npm-cache playwright`) y ejecuta el servidor. En el entorno Linux usado para validar:

```sh
CHAMBAPP_PLAYWRIGHT_MODULE=/tmp/chambapp-browser/node_modules/playwright/index.mjs CHAMBAPP_BROWSER_PATH=/usr/bin/chromium node scripts/browser-broker-smoke.mjs
```

En otras máquinas usa la instalación de navegador de Playwright y omite `CHAMBAPP_BROWSER_PATH`. `CHAMBAPP_TEST_URL` permite elegir otro puerto. La prueba abre perfiles de navegador temporales, concede o deniega geolocalización de prueba, verifica ambos casos y bloquea expresamente las imágenes del proveedor para comprobar el aviso sin red. No verifica la carga directa de calles reales.
