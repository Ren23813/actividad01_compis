/* 
   CONFIGURACIÓN - editar nombres cuando decidamos qué repartir
    */
const CONFIG = {
  integrantes: ['Nombre Completo 1', 'Nombre Completo 2', 'Nombre Completo 3'],
  // A = presentador(a) / historia · B = teoría de autómatas · C = análisis léxico 
  roles: { A: 'Persona A', B: 'Persona B', C: 'Persona C' },
  universidad: 'Universidad del Valle de Guatemala',
  curso: 'Construcción de Compiladores',
  catedratico: 'Carlos Valdez',
  ciclo: 'Segundo ciclo · 2026',
};

/* Notas del presentador (tecla N). Resumen del guion por escena. */
const NOTAS = {
  q0: ['A', 'Abrir con la pregunta del título. Dejar que el autómata del fondo escriba «while» y «whlie» una vez.'],
  q1: ['A + C', 'C narra el editor (whlie, @). A narra el celular (estsa → estás). → revela las 3 preguntas.'],
  q2: ['A', 'Explicar las 6 fases. Clic en «Análisis léxico». Leer los tokens del ejemplo clásico del Libro del Dragón.'],
  q3: ['A (B comenta)', '→ recorre los 12 hitos. Enfatizar Kleene, Rabin–Scott, Thompson y Lex (Eric Schmidt).'],
  q4: ['B', 'Definir la 5-tupla pasando el mouse por cada parte. Moneda, empujar, empujar con el torniquete.'],
  q5: ['B + C', 'Expendedora (Mealy) → Semáforo (Moore) → PIN 2-0-2-2-0-2-6 → divisible entre 3 con el 21. → cambia de pestaña.'],
  q6: ['A', 'Recorrer 3–4 tarjetas rápido. Remate: «el autocorrector también es un autómata… volveremos a eso».'],
  q7: ['B', 'Ejecutar «abab» paso a paso. Mostrar que {0,1} del AFN = estado {0,1} del AFD.'],
  q8: ['B', 'Las 3 operaciones + piezas de Thompson. Probar: while, while2, 3.14, >=.'],
  q9: ['B', '→ avanza cada paso de la receta. Al final probar 3.14 ✓, 3. ✗, 3.1.4 ✗.'],
  q10: ['B + C', '→ Thompson, filas A–E de la tabla, AFD, AFD mínimo (A=C), código en C.'],
  q11: ['C', 'Token / lexema / patrón. → la oración se parte en tokens. → tabla de símbolos.'],
  q12: ['C', 'Clic en cada caso: >=, iffy if, 3.x (retrocede), a===b.'],
  q13: ['C (A pregunta)', 'Preset «Condicional» con ▶. Luego «Typo whlie» y «Errores léxicos». Señalar ↩ retroceso.'],
  q14: ['Todos', 'A lee cada código, B y C «compiten». Explicar la sorpresa de whlie.'],
  q15: ['A', 'Escribir whlie → ∅ → sugerencia while. Cambiar a Español: «estsa».'],
  q16: ['C', 'Flex y ANTLR: mismas regex de q8. Lexers a mano en GCC/Clang/Go.'],
  q17: ['A', 'Responder el título. → cada punto.'],
  q18: ['B', 'Mencionar los libros principales. Referencias completas en la descripción.'],
  q19: ['Todos', 'Despedida. Dejar los créditos al menos 8 segundos.'],
};
