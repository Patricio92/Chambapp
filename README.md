# Chambapp

Prototipo para conectar clientes y profesionales de plomería, electricidad, pintura, carpintería, albañilería, cerrajería, limpieza, jardinería y reparación de electrodomésticos en Ciudad de México.

## Ver la app

Necesitas Node.js 22 o posterior. En esta carpeta ejecuta:

```sh
npm ci --ignore-scripts --cache /tmp/chambapp-npm-cache
npm run dev
```

En tu computadora, abre http://localhost:3000 en el navegador. En un entorno remoto usa el acceso al puerto 3000 que ofrezca tu herramienta; la interfaz de onboarding no proporciona una vista web.

## Probar el recorrido completo

1. Como cliente, elige Plomería, Roma Norte y describe una fuga. Envía la solicitud.
2. Cambia a **Soy profesional**. Regístrate con especialidad Plomería y colonia Roma Norte.
3. Acepta la solicitud y envía un precio y descripción de lo que incluye.
4. Cambia a **Soy cliente**, abre **Mis solicitudes** y acepta o rechaza la cotización.
5. Si aceptas, cambia al profesional y marca el trabajo como terminado.
6. Vuelve a cliente para calificar de 1 a 5 estrellas.

El profesional puede cambiar su especialidad y colonia con **Editar especialidad y colonia**, sin perder sus trabajos anteriores.

Las solicitudes persisten en el navegador con localStorage. La demo tiene un cliente y un profesional por navegador. La cercanía se simula por coincidencia de colonia. No incluye cuentas reales, servidor de datos, pagos, mapas ni identidad verificada. No ingresar datos sensibles. Para comenzar desde cero, borra los datos del sitio en tu navegador.

## Estructura

- `src/app.js`: pantallas, formularios y almacenamiento local.
- `src/model.js`: reglas para solicitudes y cotizaciones.
- `src/style.css`: diseño adaptable a móvil.
- `server.js`: servidor de desarrollo sin dependencias externas.
- `tests/model.test.js`: pruebas de reglas del servicio.

```sh
npm run check
npm test
```
