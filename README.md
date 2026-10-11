# Chambapp

Prototipo para conectar clientes y profesionales en Ciudad de México: 201 servicios organizados en 14 categorías, las 16 alcaldías y un catálogo postal histórico de 1,394 códigos con sus colonias.

## Ver la app

Necesitas Node.js 22 o posterior. En esta carpeta ejecuta:

```sh
npm ci --ignore-scripts --cache /tmp/chambapp-npm-cache
npm run dev
```

En tu computadora, abre http://localhost:3000 en el navegador. En un entorno remoto usa el acceso al puerto 3000 que ofrezca tu herramienta; la interfaz de onboarding no proporciona una vista web.

## Probar el recorrido completo

1. Como cliente, elige Plomería, escribe el código postal 06700 y selecciona Roma Norte. La alcaldía Cuauhtémoc se completa automáticamente. Describe una fuga. Envía la solicitud.
2. Cambia a **Soy profesional**. Regístrate con especialidad Plomería, código postal 06700 y colonia Roma Norte.
3. Acepta la solicitud y envía un precio y descripción de lo que incluye.
4. Cambia a **Soy cliente**, abre **Mis solicitudes** y acepta o rechaza la cotización.
5. Si aceptas, cambia al profesional y marca el trabajo como terminado.
6. Vuelve a cliente para calificar de 1 a 5 estrellas.

El profesional puede cambiar su especialidad y colonia con **Editar especialidad y ubicación**, sin perder sus trabajos anteriores.

Las solicitudes persisten en el navegador con localStorage. La demo tiene un cliente y un profesional por navegador. Las solicitudes se filtran por especialidad y alcaldía; no se calcula distancia. Las solicitudes antiguas se conservan y, cuando falta una alcaldía, se mantiene la coincidencia por colonia. No incluye cuentas reales, servidor de datos, pagos, mapas ni identidad verificada. No ingresar datos sensibles. Para comenzar desde cero, borra los datos del sitio en tu navegador.

## Catálogo y ubicación

Busca servicios por nombre o descripción (con o sin acentos), filtra por categoría o pulsa **Ver los 201 servicios**. Los formularios incluyen todas las especialidades; el registro profesional también permite buscar.

Elige una alcaldía para reducir las sugerencias de códigos postales, o escribe directamente un código de cinco dígitos. El formulario encuentra la alcaldía y ofrece las colonias asociadas. Rechaza códigos ajenos al catálogo o combinaciones incorrectas.

**Los códigos postales proceden de una copia SEPOMEX con corte de abril de 2016.** El catálogo incluye todos los registros CDMX de esa copia; no se garantiza que sea la totalidad vigente. Ver [SOURCES.md](SOURCES.md) para origen, licencia, limitaciones y reproducción de la extracción.

## Estructura

- `src/app.js`: pantallas, formularios y almacenamiento local.
- `src/model.js`: reglas para solicitudes y cotizaciones.
- `src/data/services.js`: catálogo de 201 servicios.
- `src/data/postal.js`: códigos postales, alcaldías y colonias.
- `src/location.js`: validación de ubicación, compatibilidad y cobertura por alcaldía.
- `src/style.css`: diseño adaptable a móvil.
- `server.js`: servidor de desarrollo sin dependencias externas.
- `tests/model.test.js`: pruebas de reglas del servicio.

```sh
npm run check
npm test
```
