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

## Integraciones

Este MVP no carga mapas, servicios de geolocalización, fuentes externas ni proveedores de pago, identidad o seguros. El catálogo y los recursos visuales se sirven localmente. Los mapas de la versión anterior se retiraron de esta versión por alcance del MVP; permanecen en el historial del repositorio.
