# Plan de Optimización y Migración a Modelos 3D (`.glb`)

Este documento define el plan técnico completo para migrar los personajes, animales, estructuras principales y props del mundo desde geometría procedural en código a modelos 3D optimizados en formato **glTF Binary (`.glb`)**, manteniendo el rendimiento fluido en WebGL.

---

## 1. Arquitectura Integrada de Carga Automática

El proyecto ya cuenta con el pipeline de detección y reemplazo automático implementado:

1. **Manifest Virtual en Build/Dev ([`vite.config.mts`](../vite.config.mts))**:
   - El plugin `portfolio-models-manifest` escanea `public/models/**/*.glb`, valida los 4 bytes de cabecera binaria (`"glTF"`) y expone `virtual:models-manifest` (`AVAILABLE_MODELS`).
   - Ventajas: **cero peticiones 404**, cero fallos por fallback HTML del servidor SPA, y reemplazo inmediato en caliente al guardar un `.glb` válido en `public/models/`.
2. **Catálogo Tipado ([`src/data/models-manifest.ts`](../src/data/models-manifest.ts))**:
   - Define `MODEL_SPECS` con altura objetivo (`targetHeight`), pivote (`alignBottom`), alias de clips de animación (`clips`) y presupuesto de triángulos por asset.
3. **Cargador Unificado ([`src/components/world/ModelAsset.tsx`](../src/components/world/ModelAsset.tsx))**:
   - `GLBOrFallback`: si no existe `.glb` en `AVAILABLE_MODELS`, renderiza el fallback procedural de forma síncrona sin `Suspense` ni consumo de red.
   - `AnimatedGLBAsset`: usa `SkeletonUtils.clone()` para que múltiples instancias (conejos, patos, ciervos, zorros, peces) animen de forma independiente, normaliza escala/altura y alinea la base en `y = 0`, activa sombras (`castShadow`/`receiveShadow`), sincroniza `AnimationAction` con transición suave (`fadeIn/fadeOut 0.22s`) y ajusta `timeScale` según la velocidad real del agente.
   - `ModelErrorBoundary`: captura cualquier error de parseo o red y vuelve al modelo procedural sin romper la escena.

---

## 2. Inventario Priorizado por Tiers y Presupuestos

### Tier 1 — Protagonista y Fauna Terrestre/Acuática Principal (Prioridad Alta)

| Slot ID | Ruta exacta en `public/models/` | Altura objetivo | Pivote | Clips requeridos | Presupuesto Máx. |
| :--- | :--- | :---: | :---: | :--- | :---: |
| `avatar` | `/models/avatar.glb` | `1.72 m` | Base `y = 0` | `idle`, `walk`, `run`, `wave` | 5k – 10k tris |
| `animals/cat` | `/models/animals/cat.glb` | `0.48 m` | Base `y = 0` | `idle`, `walk`, `run` | 2.5k – 5k tris |
| `animals/deer` | `/models/animals/deer.glb` | `1.45 m` | Base `y = 0` | `idle`, `walk`, `run` | 3k – 6k tris |
| `animals/fox` | `/models/animals/fox.glb` | `0.62 m` | Base `y = 0` | `idle`, `walk`, `run` | 2.5k – 5k tris |
| `animals/rabbit` | `/models/animals/rabbit.glb` | `0.42 m` | Base `y = 0` | `idle`, `hop` / `walk`, `run` | 1.5k – 3k tris |
| `animals/duck` | `/models/animals/duck.glb` | `0.44 m` | Base `y = 0` | `idle`, `swim` / `walk` | 1.5k – 3k tris |
| `animals/duckling` | `/models/animals/duckling.glb` | `0.28 m` | Base `y = 0` | `idle`, `swim` / `walk` | 1k – 2k tris |
| `animals/squirrel` | `/models/animals/squirrel.glb` | `0.36 m` | Base `y = 0` | `idle`, `run` / `walk` | 1.5k – 2.5k tris |

### Tier 2 — Fauna Secundaria y Estructuras Hero (Prioridad Media)

| Slot ID | Ruta exacta en `public/models/` | Altura objetivo | Pivote | Clips / Tipo | Presupuesto Máx. |
| :--- | :--- | :---: | :---: | :--- | :---: |
| `animals/bird` | `/models/animals/bird.glb` | `0.28 m` | Centro | Animado (`idle`, `fly`) | 800 – 1.8k tris |
| `animals/fish` | `/models/animals/fish.glb` | `0.22 m` | Centro | Animado (`swim`) | 600 – 1.5k tris |
| `landmarks/cabin` | `/models/landmarks/cabin.glb` | `6.40 m` | Base `y = 0` | Estático | 8k – 15k tris |
| `landmarks/tech-lab` | `/models/landmarks/tech-lab.glb` | `5.50 m` | Base `y = 0` | Estático | 6k – 12k tris |
| `landmarks/bridge` | `/models/landmarks/bridge.glb` | `2.20 m` | Base `y = 0` | Estático | 4k – 8k tris |
| `landmarks/riwi-pavilion` | `/models/landmarks/riwi-pavilion.glb` | `4.50 m` | Base `y = 0` | Estático | 5k – 10k tris |
| `landmarks/lake-pier` | `/models/landmarks/lake-pier.glb` | `1.80 m` | Base `y = 0` | Estático | 2.5k – 5k tris |

### Tier 3 — Props de Intereses (Prioridad Detalle)

| Slot ID | Ruta exacta en `public/models/` | Altura objetivo | Pivote | Presupuesto Máx. |
| :--- | :--- | :---: | :---: | :---: |
| `props/gamepad` | `/models/props/gamepad.glb` | `0.45 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/headphones` | `/models/props/headphones.glb` | `0.65 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/laptop` | `/models/props/laptop.glb` | `0.68 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/cat-figure` | `/models/props/cat-figure.glb` | `0.72 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/code-sculpture` | `/models/props/code-sculpture.glb` | `0.75 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/design-palette` | `/models/props/design-palette.glb` | `0.68 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/plant-pot` | `/models/props/plant-pot.glb` | `0.72 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/suitcase` | `/models/props/suitcase.glb` | `0.66 m` | Base `y = 0` | 1k – 2.5k tris |
| `props/culinary-pot` | `/models/props/culinary-pot.glb` | `0.62 m` | Base `y = 0` | 1k – 2.5k tris |

---

## 3. Estándares de Exportación desde Blender / Herramientas 3D

Para garantizar integración directa sin rotaciones ni escalas rotas:

1. **Sistema de Ejes**: `Y-Up` (estándar glTF), frente del personaje/animal apuntando hacia **`+Z`** (todos los controladores de movimiento y FSM calculan `Math.atan2(dx, dz)` respecto a `+Z`).
2. **Escala y Transformaciones**: aplicar `Ctrl + A -> All Transforms` en Blender antes de exportar.
3. **Texturas y Materiales**:
   - Usar **PBR Stylized Low-Poly** (palette atlas o color por vértice + `Roughness` sin mapas normales pesados cuando no haga falta).
   - Resolución máxima de textura embebida: **`512x512` px** para fauna/props, **`1024x1024` px** para edificios Tier 2. Formato **WebP** o **KTX2** dentro del `.glb`.
4. **Compresión Recomendada (`gltf-transform`)**:
   Antes de colocar cada archivo final en `public/models/`, optimizar geometría y animaciones:
   ```bash
   npx @gltf-transform/cli optimize input.glb public/models/animals/fox.glb --compress draco --texture-compress webp --texture-size 512
   ```
5. **Licencias**:
   - Todo modelo descargado de terceros (Kenney, Quaternius, Poly Pizza, Sketchfab CC0/CC-BY) debe registrarse en [`public/models/README.md`](../public/models/README.md) con nombre, fuente URL y licencia exacta.
   - Si se crean modelos propios en Blender o mediante generación 3D (Meshy/Tripo + retopología/rigging en Blender/Mixamo), marcar autoría propia como `Original / MIT`.

---

## 4. Qué Se Mantiene Procedural y Por Qué

No conviene reemplazar vegetación repetitiva o terreno por archivos `.glb` individuales:
- **Pasto instanciado (`InstancedGrass`), bosques (`Forest`), flores silvestres (`WildflowerMeadow`), rocas (`StylizedRocks`), arbustos (`Shrubs`), hongos (`FairyMushrooms`) y faroles (`StreetLamps`)** permanecen procedurales con `InstancedMesh`, logrando miles de objetos en **1 draw call por geometría**, muy superior a cargar docenas de mallas glTF separadas.
- **Río y Lago (`River.tsx`)**: usan shaders custom UV/vertex sobre `MeshStandardMaterial` ligeros para el flujo del caudal y espumas de orilla.
