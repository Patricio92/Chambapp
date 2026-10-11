# Catálogos de Chambapp

## Servicios

El catálogo editorial incluye 201 servicios en 14 categorías, orientados a las necesidades de una ciudad como Ciudad de México. No existe una lista cerrada de todas las profesiones: este catálogo es ampliable. Cada servicio tiene nombre, descripción, categoría e icono en `src/data/services.js`.

Las categorías cubren hogar, limpieza, construcción, transporte, vehículos, tecnología, mascotas, cuidado, belleza, educación, eventos, oficios, negocios y mantenimiento comercial. Son opciones para una demostración; incluir una profesión no acredita a quien se registra. El prototipo sigue sin verificación de identidad, pagos ni mapas reales.

## Alcaldías y códigos postales

- Fuente original declarada por el proveedor: SEPOMEX, Servicio Postal Mexicano.
- Copia utilizada: [`@webrek/mx-cp@0.2.0`](https://www.npmjs.com/package/@webrek/mx-cp/v/0.2.0), distribuida mediante npm.
- Repositorio del proveedor: https://github.com/webrek/mx-cp
- Corte declarado: **abril de 2016**.
- Alcance extraído: todos los registros de ese paquete con entidad INEGI `09` (Ciudad de México), municipios `002` a `017`.
- Resultado: **1,394 códigos postales únicos**, **2,027 colonias/asentamientos** y **16 alcaldías**.
- Se conservan los ceros iniciales; no se generan rangos ni códigos inexistentes.
- `La Magdalena Contreras` conserva el nombre del catálogo.
- Licencia del proveedor: MIT, incluida íntegramente en `src/data/POSTAL-LICENSE.txt`.
- SHA-256 del tarball `webrek-mx-cp-0.2.0.tgz`: `26c2b1ff09fb6b5b02fd3e492675ebd79f66f81a692b59128170c6723b0dae86`.

**Limitación:** el catálogo es histórico. No se afirma que los 1,394 códigos sean la totalidad vigente, ni que todos sigan activos. La descarga oficial actual de Correos de México no fue accesible durante esta implementación: el proxy devolvió HTTP 403 al establecer el túnel HTTPS. El formulario indica la fecha del catálogo. Se debe contrastar con una exportación oficial actual antes de usarlo para cobertura postal real.

Portal oficial: https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx

### Reproducir la extracción histórica

Desde la carpeta del proyecto (requiere Node.js y npm):

```sh
mkdir -p /tmp/chambapp-postal-source
npm pack @webrek/mx-cp@0.2.0 --pack-destination /tmp/chambapp-postal-source --cache /tmp/chambapp-npm-cache
```

Verifica el SHA-256 anterior (`shasum -a 256` en Mac o `sha256sum` en Linux). Después:

```sh
tar -xzf /tmp/chambapp-postal-source/webrek-mx-cp-0.2.0.tgz -C /tmp/chambapp-postal-source
node scripts/import-postal.mjs /tmp/chambapp-postal-source/package
npm test
```

El script importa una versión fija y comprueba la cobertura antes de escribir. Una actualización a otra fuente o fecha necesita revisar sus asociaciones, licencia y pruebas; no se deben mezclar catálogos ni sustituir códigos por rangos numéricos.

## Mapas

- Biblioteca: [Leaflet 1.9.4](https://leafletjs.com/), obtenida del paquete npm fijo `leaflet@1.9.4` y copiada sin modificar a `src/vendor/leaflet/`.
- Licencia: BSD 2-Clause; texto completo incluido en `src/vendor/leaflet/LICENSE`.
- SHA-256 del tarball `leaflet-1.9.4.tgz`: `84c65a256e50657896f54c33bd857b6849ebe94c817803be818bf32a3dde0b77`.
- Imágenes de calles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, con atribución visible a OpenStreetMap y enlace a sus derechos de autor. No hay precarga masiva ni descarga offline.
- [Política de uso de imágenes](https://operations.osmfoundation.org/policies/tiles/): respetar atribución y caché HTTP; evaluar proveedor comercial o infraestructura propia para una operación con tráfico elevado.
- No se usa Nominatim, geocodificación automática, cálculo de rutas ni API de tiempos de viaje. Las distancias se calculan con la fórmula de Haversine entre puntos elegidos por el usuario.
- La biblioteca está verificada por las pruebas del navegador. Se verificó la descarga HTTPS de imágenes reales de CDMX desde el proveedor con el agente identificado como `Chambapp-development/0.1 (+https://github.com/Patricio92/Chambapp)` y referente local. Las imágenes se inspeccionaron y no eran respuestas de bloqueo. La carga directa en Chromium de este entorno sigue pendiente: el navegador no confía en el certificado del proxy y la revisión automática rechazó modificar su confianza. No se desactivó TLS ni se modificó el almacén de certificados. La descarga por las herramientas con la confianza ya instalada no valida el transporte HTTPS en Chromium.
