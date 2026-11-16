/* ==========================================================================
   LANTANA CAFÉ BISTRÓ — Datos editables del sitio
   --------------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas tocar para:
   - cambiar precios (price: null  =>  se muestra "Precio a confirmar")
   - reemplazar fotografías (img.src puede ser una URL o una ruta local,
     p. ej. "assets/fotos/vasco.webp")
   - textos de cada producto (description = línea corta; story = párrafo
     tentador que se ve junto a las opciones de porción/entero)
   - actualizar redes sociales, número de WhatsApp o testimonios.
   ========================================================================== */

/** Construye una URL optimizada (WebP/AVIF automático) para fotos de Unsplash.
 *  Si usas fotos propias, escribe directamente la ruta: "assets/fotos/x.webp". */
function unsplash(id) {
  return "https://images.unsplash.com/photo-" + id;
}

window.LANTANA = {
  // Número sin "+" ni espacios (formato wa.me)
  whatsapp: "59168023040",
  whatsappDisplay: "+591 68023040",

  // TODO: confirmar los usuarios reales de Instagram y TikTok
  instagram: "https://www.instagram.com/lantana.cafebistro/",
  tiktok: "https://www.tiktok.com/@lantana.cafebistr",

  zones: ["Zona Norte"],

  messages: {
    general: "Hola Lantana Café Bistró. Quisiera realizar un pedido. ¿Podrían ayudarme con la disponibilidad?",
    reservar: "Hola Lantana Café Bistró. Quisiera reservar un pedido para una fecha determinada. ¿Qué disponibilidad tienen?",
    toppings: "Hola Lantana Café Bistró. Quisiera consultar las combinaciones de cheesecake con toppings.",
  },

  categories: [
    { id: "todos", label: "Todos" },
    { id: "cheesecakes", label: "Cheesecakes" },
    { id: "tortas", label: "Tortas" },
    { id: "clasicos", label: "Para el café" },
  ],

  toppings: [
    { id: "frutilla", name: "Frutilla", note: "Fresca y delicada", price: null, img: "assets/fotos/toppings/frutilla.jpg", alt: "Topping de frutillas glaseadas sobre cheesecake de Lantana" },
    { id: "maracuya", name: "Maracuyá", note: "Tropical y vibrante", price: null, img: "assets/fotos/toppings/maracuya.jpg", alt: "Topping de maracuyá con semillas sobre cheesecake de Lantana" },
    { id: "frutos-del-bosque", name: "Frutos del bosque", note: "Intenso y equilibrado", price: null, img: "assets/fotos/toppings/frutos-del-bosque.jpg", alt: "Topping de frutillas y arándanos sobre cheesecake de Lantana" },
    // Topping de chocolate retirado por ahora. Para volver a ofrecerlo, quita el // de la línea de abajo.
    // { id: "chocolate", name: "Chocolate", note: "Profundo y sedoso", price: null, img: unsplash("1551578657-a7e74acb0135"), alt: "Chocolate para topping de cheesecake" },
  ],

  products: [
    {
      id: "mini-cheesecakes",
      defaultTopping: "maracuya",
      featured: true,
      name: "Mini Cheesecakes",
      category: "cheesecakes",
      badge: "Ideal para regalar",
      description: "Todo el sabor de Lantana en formato individual. Perfectos para compartir, regalar, reuniones o celebraciones.",
      story: "Pequeños en tamaño, enormes en sabor: la misma cremosidad de nuestros cheesecakes en una porción perfecta para una persona. Una cajita que convierte cualquier día en una ocasión especial.",
      note: "Consulta nuestras presentaciones y disponibilidad.",
      img: "assets/fotos/menu/mini-sin-topping.jpg",
      alt: "Mini cheesecake New York individual de Lantana, sin topping",
      options: [{ id: "caja", label: "Presentación a elegir", price: null }],
      toppings: true,
      variants: {
        caja: {
          "sin-topping": "assets/fotos/menu/mini-sin-topping.jpg",
          "frutos-del-bosque": "assets/fotos/menu/mini-frutos-del-bosque.jpg",
          frutilla: "assets/fotos/menu/mini-frutilla.jpg",
          maracuya: "assets/fotos/menu/mini-maracuya.jpg",
        },
      },
      cta: "Consultar mini cheesecakes",
      message: "Hola Lantana Café Bistró. Quisiera información sobre los mini cheesecakes.",
    },
    {
      id: "cheesecake-new-york",
      defaultTopping: "frutos-del-bosque", // topping que aparece elegido al abrir ("" = sin topping)
      name: "Cheesecake New York",
      category: "cheesecakes",
      description: "Cremoso, elegante y perfectamente equilibrado. Un clásico que nunca falla.",
      story: "Denso, cremoso y sobre una base de galleta dorada que cruje en cada bocado. Solo es pura elegancia; con frutilla, maracuyá o frutos del bosque se vuelve inolvidable. Pide una porción para darte un gusto o el entero para que toda la mesa lo celebre.",
      img: "assets/fotos/menu/ny-porcion-sin-topping.jpg",
      alt: "Porción de cheesecake New York clásico de Lantana, sin topping",
      options: [
        { id: "porcion", label: "Porción", price: 35 },
        { id: "entero", label: "Entero", price: 300 },
      ],
      toppings: true,
      // Foto según presentación y topping elegidos. "sin-topping" = sin topping.
      // Si un topping no tiene foto, se muestra la de "sin-topping" de esa presentación.
      variants: {
        porcion: {
          "sin-topping": "assets/fotos/menu/ny-porcion-sin-topping.jpg",
          "frutos-del-bosque": "assets/fotos/menu/ny-porcion-frutos-del-bosque.jpg",
          frutilla: "assets/fotos/menu/ny-porcion-frutilla.jpg",
          maracuya: "assets/fotos/menu/ny-porcion-maracuya.jpg",
        },
        entero: {
          "sin-topping": "assets/fotos/menu/ny-entero-sin-topping.jpg",
          "frutos-del-bosque": "assets/fotos/menu/ny-entero-frutos-del-bosque.jpg",
          frutilla: "assets/fotos/menu/ny-entero-frutilla.jpg",
          maracuya: "assets/fotos/menu/ny-entero-maracuya.jpg",
        },
      },
      cta: "Pedir por WhatsApp",
    },
    {
      id: "cheesecake-vasco",
      // Temporal: se muestra como "No disponible" y no se puede pedir. Para volver a venderlo, borra esta línea.
      unavailable: true,
      featured: true,
      name: "Cheesecake Vasco",
      category: "cheesecakes",
      badge: "El favorito",
      description: "Exterior intensamente caramelizado y un interior suave, cremoso y delicado.",
      story: "Su superficie tostada guarda un sabor a caramelo que contrasta con un centro suave, casi fundente. Intenso y delicado a la vez: el capricho que no sabías que necesitabas.",
      img: unsplash("1759303380841-55c09244fd2b"),
      alt: "Porción de cheesecake vasco con superficie caramelizada, Santa Cruz",
      options: [
        { id: "porcion", label: "Porción", price: 35 },
        { id: "entero", label: "Entero", price: 350 },
      ],
      toppings: true,
      cta: "Quiero probarlo",
    },
    {
      id: "cheesecake-oreo",
      featured: true,
      // Temporal: se muestra en el menú como "Muy pronto" pero no se puede pedir.
      // Para volver a venderlo, borra la línea de abajo (o ponla en false).
      comingSoon: true,
      name: "Cheesecake Oreo",
      category: "cheesecakes",
      description: "La combinación perfecta entre la cremosidad del cheesecake y el sabor irresistible de Oreo.",
      story: "Un relleno suave y cremoso con todo el sabor de Oreo, sobre una base crujiente de galleta. Es ese postre que se termina antes de que alguien alcance a pedir «¿me das un poquito?».",
      img: "assets/fotos/menu/oreo.jpg",
      alt: "Porción de cheesecake Oreo de Lantana con galletas Oreo",
      options: [
        { id: "porcion", label: "Porción", price: 35 },
        { id: "entero", label: "Entero", price: 300 },
      ],
      toppings: true,
      cta: "Pedir por WhatsApp",
    },
    {
      id: "torta-bruce-bruce",
      featured: true,
      name: "Torta Bruce Bruce",
      category: "tortas",
      badge: "Para chocolate lovers",
      description: "Chocolate intenso, capas irresistibles y una textura creada para verdaderos amantes del chocolate.",
      story: "Capas húmedas de chocolate y un relleno tan intenso que se derrite en la boca. Para cuando el antojo de chocolate no acepta un «no» por respuesta.",
      img: "assets/fotos/menu/bruce-porcion.jpg",
      alt: "Porción de torta de chocolate Bruce Bruce de Lantana, con capas y cobertura de chocolate",
      options: [
        { id: "porcion", label: "Porción", price: 35 },
        { id: "entera", label: "Torta entera", price: 300 },
      ],
      variants: {
        porcion: { "sin-topping": "assets/fotos/menu/bruce-porcion.jpg" },
        entera: { "sin-topping": "assets/fotos/menu/bruce-entera.jpg" },
      },
      cta: "Quiero chocolate",
    },
    {
      id: "brownie",
      // Temporal: se muestra como "No disponible" y no se puede pedir. Para volver a venderlo, borra esta línea.
      unavailable: true,
      name: "Brownie",
      category: "clasicos",
      description: "Intenso, húmedo y chocolatoso. Ideal para acompañar el café o simplemente darse un gusto.",
      story: "Bordes apenas crujientes y un centro húmedo de chocolate profundo. Con un café al lado, es un abrazo en forma de postre.",
      img: unsplash("1606313564200-e75d5e30476c"),
      alt: "Brownies de chocolate húmedos con chocolate derretido",
      // Precio editable: reemplaza null por el valor en Bs (p. ej. 20)
      options: [{ id: "unidad", label: "Unidad", price: null }],
      cta: "Pedir por WhatsApp",
    },
    // Cuñapé retirado del menú por ahora. Para volver a mostrarlo, quita los // de este bloque.
    // {
    //   id: "cunape",
    //   name: "Cuñapé",
    //   category: "clasicos",
    //   badge: "Clásico cruceño",
    //   description: "Un clásico cruceño preparado para disfrutar caliente, suave por dentro y con ese irresistible sabor a queso.",
    //   story: "Dorado por fuera, tierno y elástico por dentro, con ese sabor a queso que sabe a casa. Recién horneado, es imposible comer solo uno.",
    //   img: unsplash("1559141680-d0bd7bc5af84"),
    //   alt: "Cuñapés cruceños recién horneados en Santa Cruz",
    //   // Precio editable: reemplaza null por el valor en Bs
    //   options: [{ id: "unidad", label: "Unidad", price: null }],
    //   cta: "Pedir por WhatsApp",
    // },
  ],

  /* Música de fondo según la hora del visitante (horas en formato 24 h).
     Suena desde la primera interacción con la página (los navegadores no
     permiten audio automático antes) y puede pausarse con el botón ♪. */
  music: {
    volume: 0.35,
    tracks: [
      { label: "Mañana en Lantana", from: 6, to: 12, src: "assets/musica/manana.mp3" },
      { label: "Tarde en Lantana", from: 12, to: 19, src: "assets/musica/tarde.mp3" },
      { label: "Noche en Lantana", from: 19, to: 6, src: "assets/musica/noche.mp3" },
    ],
  },

  /* Testimonios de DEMOSTRACIÓN. Reemplazar por reseñas reales y luego
     cambiar `testimonialsAreDemo` a false para quitar el aviso. */
  testimonialsAreDemo: true,
  testimonials: [
    { quote: "El cheesecake estaba increíblemente cremoso y llegó perfectamente presentado.", author: "Cliente de ejemplo", detail: "Zona Norte" },
    { quote: "Pedimos para compartir en familia y fue un éxito.", author: "Cliente de ejemplo", detail: "Zona Norte" },
    { quote: "La presentación es preciosa y el sabor todavía mejor.", author: "Cliente de ejemplo", detail: "Zona Norte" },
    { quote: "Perfecto para regalar o llevar a una reunión.", author: "Cliente de ejemplo", detail: "Zona Norte" },
  ],
};
