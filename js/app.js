/* ==========================================
   PS DEALS v0.2
   app.js
========================================== */

console.clear();

console.log("%c🚀 PS Deals iniciado correctamente",
    "color:#0d6efd;font-size:18px;font-weight:bold;"
);

console.log("%cVersión 0.2",
    "color:#198754;font-size:14px;"
);

// ================================
// NAVBAR AL HACER SCROLL
// ================================

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if (window.scrollY > 50) {

        navbar.classList.add("shadow");

    } else {

        navbar.classList.remove("shadow");

    }

});

// ================================
// SCROLL SUAVE BOTONES
// ================================

document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", function (e) {

        const destino = document.querySelector(this.getAttribute("href"));

        if (destino) {

            e.preventDefault();

            destino.scrollIntoView({

                behavior: "smooth"

            });

        }

    });

});

// ================================
// EFECTO EN TARJETAS
// ================================

const cards = document.querySelectorAll(".category-card, .product-card");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-12px)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "translateY(0px)";

    });

});

// ================================
// BOTÓN VER OFERTAS
// ================================

const btnOferta = document.querySelector(".btn-primary");

if (btnOferta) {

    btnOferta.addEventListener("click", function (e) {

        e.preventDefault();

        alert("🚀 Muy pronto tendrás aquí las mejores ofertas de PS Deals.");

    });

}

// ================================
// BOTÓN CONTACTAR
// ================================

const botones = document.querySelectorAll(".btn-outline-dark");

botones.forEach(btn => {

    btn.addEventListener("click", function (e) {

        e.preventDefault();

        alert("📲 Próximamente podrás contactarnos por WhatsApp.");

    });

});

// ================================
// AÑO AUTOMÁTICO EN FOOTER
// ================================

const footer = document.querySelector("footer p:last-child");

if (footer) {

    footer.innerHTML = `© ${new Date().getFullYear()} PS Deals | Todos los derechos reservados.`;

}

// ================================
// PREPARADO PARA V0.3
// ================================
console.log("Catálogo cargado:", productos.length, "productos");