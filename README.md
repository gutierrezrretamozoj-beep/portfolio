# David's World

Portafolio personal explorable de José Gutiérrez. El canvas 3D es el mundo principal; una interfaz ligera permite caminar, descubrir lugares e interactuar con su historia, habilidades y proyectos.

## Tecnologías

- Vite y React 19 con TypeScript
- Tailwind CSS 4 y CSS para el sistema visual
- Three.js, React Three Fiber y Drei para terreno, agua, vegetación, estructuras y cámara
- Motion para respetar la preferencia de movimiento reducido
- Lucide React para iconos

## Desarrollo local

Requiere Node.js 20.19+ y npm.

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. Para validar una compilación de producción:

```bash
npm run lint
npm run build
npm run preview
```

## Estructura

```text
src/
	app/              Estilos globales
	components/
		player/         Movimiento, cámara y joystick
		ui/             Loading, menú, mapa y paneles
		world/          Terreno, río, entorno, vegetación y landmarks
	data/             Perfil, proyectos, skills, journey y mapa
	hooks/            Detección de capacidad del dispositivo
	types/            Datos de portfolio y mundo
public/
	images/           Fotografías
	models/           Reservado para GLB/GLTF con licencia
	textures/         Reservado para texturas optimizadas con licencia
```

La aplicación se monta desde `src/main.tsx`; `WorldExperience` administra estado y controles, y `WorldCanvas` compone la escena R3F como un chunk cargado de forma diferida. El mapa compacto conecta bosque/About, claro Digital DNA, río y puente, Project Valley, jardín, Natural Tech Lab, cabaña y lago de contacto. WASD/flechas mueven, el arrastre mira, `E` interactúa y `M` abre/cierra el mapa. En móvil aparecen joystick, zona de mirada y botón de interacción.

Los hotspots de proyectos se generan desde `src/data/projects.ts`; los enlaces siguen como “Coming soon” hasta incorporar URLs reales. No se descargaron modelos externos. Para sustituir la geometría de placeholder, registra nombre del asset, fuente y licencia junto al GLB/GLTF correspondiente.

## Personalización

- Actualiza nombre, enlaces y rutas de imagen en `src/data/profile.ts`.
- Sustituye los datos provisionales de proyectos en `src/data/projects.ts`.
- Ajusta habilidades, trayectoria, intereses y aprendizaje en los módulos vecinos de `src/data/`.
- Los puntos, waypoints y árboles del mapa se editan en `src/data/world.ts`.
- Coloca la segunda foto (retrato principal) en `public/images/david-profile.jpg` y, si se desea, la foto lifestyle en `public/images/david-lifestyle.jpg`. Los JPG actuales son píxeles de 1×1; el mundo no inventa un rostro y deja un placeholder hasta sustituirlos por fotos reales.
- La paleta, HUD, paneles y controles responsivos viven en `src/app/globals.css`.
- El viento ambiental se sintetiza localmente y solo empieza al pulsar `SOUND ON`; no se reproduce ni descarga audio automáticamente.

## Publicación

Sube el repositorio a GitHub y conecta la rama con un proveedor de hosting estático. El comando de build es `npm run build` y la carpeta generada es `dist`; no se requieren variables de entorno para esta versión.
