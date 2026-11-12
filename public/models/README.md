# 3D Models Directory (`public/models/`)

Este directorio activa **reemplazo automático** de modelos en tiempo de compilación y desarrollo mediante `virtual:models-manifest` (ver [`docs/3D-MODEL-PLAN.md`](../../docs/3D-MODEL-PLAN.md)).

## Cómo integrar un modelo 3D (`.glb`)

1. Exporta o optimiza el archivo en formato binario `.glb` (`Y-Up`, frente mirando a `+Z`, cabecera válida `glTF`).
2. Colócalo exactamente en la ruta correspondiente:
   - `public/models/avatar.glb`
   - `public/models/animals/{cat,deer,fox,rabbit,duck,duckling,squirrel,bird,fish}.glb`
   - `public/models/landmarks/{cabin,tech-lab,bridge,riwi-pavilion,lake-pier}.glb`
   - `public/models/props/{gamepad,headphones,laptop,cat-figure,code-sculpture,design-palette,plant-pot,suitcase,culinary-pot}.glb`
3. Registra **obligatoriamente** el asset en la tabla de licencias inferior antes de hacer commit.
4. No necesitas editar código: Vite detectará el archivo válido automáticamente y `GLBOrFallback` reemplazará la versión procedural manteniendo la física, colisiones e IA existentes.

## Registro de Assets y Licencias

| Archivo `.glb` | Nombre del Asset | Fuente / Autor | Licencia |
| :--- | :--- | :--- | :--- |
| `avatar.glb` | Hoodie Character (animated) | [Poly Pizza](https://poly.pizza/m/gKLBoRsyKe) — Quaternius | CC0 1.0 |
| `animals/bird.glb` | Bird + Idle/Walk/Flap/Glide animations (merged, uncompressed) | [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app) | CC0 1.0 |
| `animals/cat.glb` | Cat (`IdleCat`) | [Poly Pizza](https://poly.pizza/m/DJ9rpAhrh3) — J-Toastie | CC-BY 3.0 |
| `animals/deer.glb` | Deer (Ultimate Animated Animals) | [Quaternius Showcase](https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/animals_pack/Deer.glb) — Quaternius | CC0 1.0 |
| `animals/fox.glb` | Fox (Ultimate Animated Animals) | [Quaternius Showcase](https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/animals_pack/Fox.glb) — Quaternius | CC0 1.0 |
| `animals/fish.glb` | Koi (Cute Fish Pack, animated) | [Quaternius Showcase](https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/cute_fish_pack/Koi.glb) — Quaternius | CC0 1.0 |
| `animals/rabbit.glb` | Rabbit | [Poly Pizza](https://poly.pizza/m/9OBTRVYUSmt) — Poly by Google | CC-BY 3.0 |
| `animals/duck.glb` | Mallard duck | [Poly Pizza](https://poly.pizza/m/frSLi6b6Vid) — Poly by Google | CC-BY 3.0 |
| `animals/duckling.glb` | Duckling | [Poly Pizza](https://poly.pizza/m/cGH2xtNdS4i) — Poly by Google | CC-BY 3.0 |
| `animals/squirrel.glb` | SQUIRREL | [Poly Pizza](https://poly.pizza/m/1-x1WzixbjR) — Danni Bittman | CC-BY 3.0 |
| `props/laptop.glb` | Laptop (Furniture Kit) | [Kenney](https://github.com/shorepine/kenney/blob/main/3d/furniture/laptop.glb) — Kenney | CC0 1.0 |
| `props/plant-pot.glb` | Potted Plant (Furniture Kit) | [Kenney](https://github.com/shorepine/kenney/blob/main/3d/furniture/pottedPlant.glb) — Kenney | CC0 1.0 |
| `props/culinary-pot.glb` | Pot (Survival Pack) | [Quaternius Showcase](https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/survival_pack/Pot.glb) — Quaternius | CC0 1.0 |
| `props/headphones.glb` | Headphones | [Poly Pizza](https://poly.pizza/m/PSsWSIAYIL) — CreativeTrio | CC0 1.0 |
| `props/gamepad.glb` | Videogame Controller | [Poly Pizza](https://poly.pizza/m/6365MG_Pr_f) — Poly by Google | CC-BY 3.0 |
| `props/suitcase.glb` | Suitcase | [Poly Pizza](https://poly.pizza/m/041xs8FnZZ) — J-Toastie | CC-BY 3.0 |
| `props/cat-figure.glb` | Cat (figurine) | [Poly Pizza](https://poly.pizza/m/YvVobPlTlQ) — madtrollstudio | CC-BY 3.0 |
| `landmarks/cabin.glb` | Modern House | [Poly Pizza](https://poly.pizza/m/d_k2teZePG6) — henry ham | CC-BY 3.0 |
| `landmarks/tech-lab.glb` | Building 1 Small (Modern City) | [Quaternius Showcase](https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/buildings_pack_2/Building1_Small.glb) — Quaternius | CC0 1.0 |
| `landmarks/bridge.glb` | Arched Wooden Bridge (exported from portfolio scene) | Proyecto propio | CC0 1.0 |
| `landmarks/riwi-pavilion.glb` | Pergola (wooden shade cover) | [Poly Pizza](https://poly.pizza/m/akMzoP0qU7f) — Daniel Doran | CC-BY 3.0 |
| `landmarks/lake-pier.glb` | Dock Long (Cute Fish Pack) | [Quaternius Showcase](https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/cute_fish_pack/Dock_Long.glb) — Quaternius | CC0 1.0 |

> **Nota sobre slots procedurales:** `props/code-sculpture` y `props/design-palette` conservan su geometría procedural personalizada del portafolio.
