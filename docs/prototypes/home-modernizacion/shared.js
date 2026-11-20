// Contenido y piezas comunes de los tres prototipos. Los textos salen de
// src/features/home/home-content.ts; los precios son de ejemplo.
const COCO = (() => {
	const IMG = "../../../public/tutorial/";
	const fmt = (n) => `$${n.toLocaleString("es-AR")}`;
	const $ = (sel) => document.querySelector(sel);

	const spotlight = {
		name: "Almendra Non Pareil",
		img: "almendra.webp",
		price: 18900,
		was: 22400,
		off: "-15%",
		unit: "por kg",
		min: "Mínimo: 1 kg",
	};
	const products = [
		{ name: "Nuez mariposa", img: "nuez.webp", price: 16500, unit: "por kg", min: "Mínimo: 1 kg" },
		{ name: "Castaña de cajú sin sal", img: "castana-caju.webp", price: 21300, was: 23700, off: "-10%", unit: "por kg", min: "Mínimo: 1 kg" },
		{ name: "Dátil", img: "datil.webp", price: 7800, unit: "por 500 g", min: "Mínimo: 500 g" },
		{ name: "Mix deportivo", img: "mix-deportivo.webp", price: 14200, unit: "por kg", min: "Mínimo: 1 kg" },
	];
	const faq = [
		["¿Cuándo cierran los pedidos?", "Todos los miércoles a las 12, hora de Argentina. Lo que confirmes y pagues hasta ese momento entra en la compra de esa semana; lo que llegue después, en la del miércoles siguiente. Arriba de la página ves cuánto falta para el próximo cierre."],
		["¿Cuánto tarda en llegar mi compra?", "Entre 7 y 10 días desde el cierre. Hacemos una sola compra al por mayor en Buenos Aires y la mercadería viaja hasta Ushuaia: al ser una isla, el camión cruza a Chile, atraviesa el Estrecho de Magallanes en balsa, vuelve a entrar a la Argentina y cruza la cordillera. En Mis pedidos ves en qué etapa está."],
		["¿Cuándo pago mi pedido?", "Al confirmarlo. Elegís cómo recibirlo y pagás con Mercado Pago o por transferencia bancaria. Si pagás por transferencia, te damos los datos al confirmar y tu pago queda registrado cuando revisamos el comprobante."],
		["¿Dónde sigo mi pedido?", "En Mis pedidos. Ahí ves cada pedido que pagaste y la etapa en la que está, desde el pago hasta la entrega. Si algo cambia, por ejemplo una demora o una cantidad distinta, también lo vas a ver ahí."],
		["¿Cómo recibo mi pedido?", "Lo elegís al confirmar el pedido: te lo llevamos a la dirección que cargues o lo retirás en el punto de retiro, en su horario. Las dos opciones cuestan lo mismo."],
		["¿Cómo conseguimos estos precios?", "Juntamos los pedidos de mucha gente y hacemos una sola compra grande, directo al proveedor. Así pagamos precio mayorista por productos de primera calidad. Si comparás, hacelo con productos de la misma calidad: un aceite de oliva extra virgen no es lo mismo que uno común, aunque los dos sean un litro."],
	];

	const icon = (d) =>
		`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
	const icons = {
		arrow: icon('<path d="M5 12h14M13 6l6 6-6 6"/>'),
		menu: icon('<path d="M4 7h16M4 12h16M4 17h16"/>'),
		search: icon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
		help: icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>'),
		cart: icon('<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>'),
		user: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
	};

	// Próximo cierre: miércoles 12:00 de Argentina (15:00 UTC).
	function nextClose(now = new Date()) {
		const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15));
		t.setUTCDate(t.getUTCDate() + ((3 - t.getUTCDay() + 7) % 7));
		if (t <= now) t.setUTCDate(t.getUTCDate() + 7);
		return t;
	}
	function tick() {
		const close = nextClose();
		const left = Math.max(0, close - Date.now());
		const d = Math.floor(left / 864e5);
		const h = Math.floor(left / 36e5) % 24;
		const m = Math.floor(left / 6e4) % 60;
		const values = {
			d,
			h: String(h).padStart(2, "0"),
			m: String(m).padStart(2, "0"),
			text: d > 0 ? `${d} d ${h} h` : `${h} h ${m} min`,
			date: close.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }),
		};
		for (const el of document.querySelectorAll("[data-cd]")) el.textContent = values[el.dataset.cd];
	}

	const priceHtml = (p) =>
		`<p class="price"><b>${fmt(p.price)}</b><span>${p.unit}</span>${p.was ? `<s>${fmt(p.was)}</s>` : ""}</p><p class="min">${p.min}</p>`;
	const buyHtml = (label, cls = "btn-ink") =>
		`<div class="buy"><button class="btn ${cls}" data-sumar="${label}">${label}</button></div>`;
	const photo = (p) =>
		`<a class="pimg" href="#"><img src="${IMG}${p.img}" alt="${p.name}" loading="lazy">${p.off ? `<span class="off">${p.off}</span>` : ""}</a>`;

	function renderGrid(sel) {
		const cards = products.map(
			(p) => `<article class="pcard">${photo(p)}<div class="pbody"><h3><a href="#">${p.name}</a></h3>${priceHtml(p)}${buyHtml("Sumar")}</div></article>`,
		);
		const combo = `<article class="pcard combo">
			<div class="mosaic" role="img" aria-label="Productos del combo">${["almendra", "nuez", "mix-deportivo"].map((i) => `<img src="${IMG}${i}.webp" alt="">`).join("")}</div>
			<div class="pbody">
				<span class="tag">Combo</span>
				<h3>Frutos secos para la semana</h3>
				<div class="chips"><button class="chip" aria-pressed="true">2 personas</button><button class="chip" aria-pressed="false">4 personas</button></div>
				<ul class="items">
					<li>Almendra Non Pareil <span>500 g · ${fmt(9450)}</span></li>
					<li>Nuez mariposa <span>500 g · ${fmt(8250)}</span></li>
					<li>Mix deportivo <span>1 kg · ${fmt(14200)}</span></li>
				</ul>
				<p class="total">Total hoy <b>${fmt(31900)}</b></p>
				${buyHtml("Sumar el combo")}
			</div></article>`;
		cards.splice(2, 0, combo);
		$(sel).innerHTML = cards.join("");
	}

	function renderSpotlight(sel, btnClass = "btn-highlight") {
		const p = spotlight;
		$(sel).innerHTML = `<article class="spot">${photo(p)}
			<div class="spot-body">
				<span class="tag tag-spot">Destacado de la semana</span>
				<h2>${p.name}</h2>
				<p>Sumalo a tu pedido desde acá o seguí mirando los destacados de abajo.</p>
				${priceHtml(p)}
				${buyHtml("Sumar al pedido", `${btnClass} btn-lg`)}
			</div></article>`;
	}

	function renderFaq(sel) {
		$(sel).innerHTML = faq
			.map(([q, a], i) => `<details${i === 0 ? " open" : ""}><summary>${q}</summary><p>${a}</p></details>`)
			.join("");
	}

	// Variante D: el diagrama "muchos pedidos, una compra" de C, partido en una
	// escena por paso para que acompañe la línea de tiempo de A.
	const scene = (label, body) =>
		`<svg class="scene" viewBox="0 0 240 100" role="img" aria-label="${label}"><defs><marker id="sc-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1l8 4-8 4z" class="sc-head"/></marker></defs>${body}</svg>`;
	const scenes = [
		scene("Tu pedido se suma al de otros vecinos", `
			<rect class="sc-box" x="16" y="6" width="92" height="24" rx="6"/><path class="sc-ln sc-dim" d="M26 18h44"/>
			<rect class="sc-box sc-hi" x="30" y="38" width="92" height="24" rx="6"/><text x="42" y="54">Tu pedido</text>
			<rect class="sc-box" x="16" y="70" width="92" height="24" rx="6"/><path class="sc-ln sc-dim" d="M26 82h56"/>
			<path class="sc-ln" d="M112 18C156 18 166 42 204 47" marker-end="url(#sc-ah)"/>
			<path class="sc-ln" d="M126 50H204" marker-end="url(#sc-ah)"/>
			<path class="sc-ln" d="M112 82C156 82 166 58 204 53" marker-end="url(#sc-ah)"/>`),
		scene("CoCo junta los pedidos y hace una sola compra", `
			<circle class="sc-coco" cx="60" cy="50" r="34"/><text class="sc-logo" x="60" y="57" text-anchor="middle">coco</text>
			<path class="sc-ln" d="M100 50H146" marker-end="url(#sc-ah)"/><text class="sc-cap" x="123" y="41" text-anchor="middle">1 compra</text>
			<rect class="sc-box sc-warm" x="156" y="50" width="36" height="34" rx="3"/><rect class="sc-box sc-warm" x="192" y="50" width="36" height="34" rx="3"/><rect class="sc-box sc-warm" x="174" y="16" width="36" height="34" rx="3"/>`),
		scene("La compra viaja de Buenos Aires a Ushuaia y cruza el Estrecho en balsa", `
			<path class="sc-ln sc-dash" d="M10 76H88"/>
			<path class="sc-ln" d="M88 76c5-7 15-7 20 0s15 7 20 0 15-7 20 0"/>
			<path class="sc-ln sc-dash" d="M148 76H226" marker-end="url(#sc-ah)"/>
			<rect class="sc-box sc-warm" x="94" y="40" width="24" height="22" rx="2"/><rect class="sc-box sc-warm" x="118" y="40" width="24" height="22" rx="2"/><rect class="sc-box sc-warm" x="106" y="18" width="24" height="22" rx="2"/>
			<text class="sc-cap" x="10" y="94">Buenos Aires</text><text class="sc-cap" x="230" y="94" text-anchor="end">Ushuaia</text>`),
		scene("Lo que llega se reparte a cada vecino", `
			<rect class="sc-box sc-warm" x="12" y="50" width="36" height="34" rx="3"/><rect class="sc-box sc-warm" x="48" y="50" width="36" height="34" rx="3"/><rect class="sc-box sc-warm" x="30" y="16" width="36" height="34" rx="3"/>
			<path class="sc-ln" d="M92 47C112 44 112 18 128 18" marker-end="url(#sc-ah)"/>
			<path class="sc-ln" d="M92 50H114" marker-end="url(#sc-ah)"/>
			<path class="sc-ln" d="M92 53C112 56 112 82 128 82" marker-end="url(#sc-ah)"/>
			<rect class="sc-box" x="132" y="6" width="92" height="24" rx="6"/><path class="sc-ln sc-dim" d="M142 18h44"/>
			<rect class="sc-box sc-hi" x="118" y="38" width="92" height="24" rx="6"/><text x="130" y="54">Tu pedido</text>
			<rect class="sc-box" x="132" y="70" width="92" height="24" rx="6"/><path class="sc-ln sc-dim" d="M142 82h56"/>`),
	];
	function renderScenes() {
		for (const el of document.querySelectorAll("[data-scene]")) el.innerHTML = scenes[el.dataset.scene - 1];
	}

	function chrome() {
		const variant = document.body.dataset.variant;
		const howHref = variant === "d" ? "como-funciona.html" : "#como-funciona";
		const tabs = [["a", "A · La ruta"], ["b", "B · La semana"], ["c", "C · El pedido común"], ["d", "D · Combinada"]]
			.map(([v, label]) => `<a href="variante-${v}.html"${v === variant ? ' aria-current="page"' : ""}>${label}</a>`)
			.join("");
		document.body.insertAdjacentHTML(
			"afterbegin",
			`<div class="proto"><span>Prototipo home</span>${tabs}<span>Precios y productos de ejemplo</span></div>
			<div class="announce">Compras comunitarias en Ushuaia</div>
			<header class="nav"><div class="wrap">
				<a class="logo" href="variante-${variant}.html">coco</a>
				<a class="btn btn-outline" href="variante-${variant}.html#ofertas">${icons.menu}Catálogo</a>
				<div class="nav-search">${icons.search}Buscar productos</div>
				<div class="nav-right">
					<span class="nav-cd">Cierra en <b data-cd="text"></b></span>
					<button class="icon-btn" aria-label="Ayuda">${icons.help}</button>
					<button class="icon-btn" aria-label="Tu pedido">${icons.cart}</button>
					<button class="icon-btn" aria-label="Ingresar">${icons.user}</button>
				</div>
			</div></header>`,
		);
		document.body.insertAdjacentHTML(
			"beforeend",
			`<footer class="footer" id="contacto"><div class="wrap">
				<div class="footer-grid">
					<div><a class="logo" href="#">coco</a><p style="margin-top:12px;max-width:26ch">Compras comunitarias en Ushuaia. Nos juntamos para comprar mejor.</p></div>
					<nav><h2>Nosotros</h2><ul><li><a href="${howHref}">Cómo funciona</a></li><li><a href="#">Sé proveedor</a></li></ul></nav>
					<nav><h2>Información</h2><ul><li><a href="#preguntas-frecuentes">Preguntas frecuentes</a></li><li><a href="#ofertas">Catálogo</a></li></ul></nav>
					<nav><h2>Mi cuenta</h2><ul><li><a href="#">Ingresar</a></li><li><a href="#">Mis pedidos</a></li><li><a href="#">Perfil</a></li></ul></nav>
					<div><h2>Contacto</h2><p>Email<br>contacto@coco.app</p></div>
				</div>
				<small>© 2026 CoCo. Todos los derechos reservados.</small>
			</div></footer>`,
		);
		for (const el of document.querySelectorAll("[data-arrow]")) el.insertAdjacentHTML("beforeend", icons.arrow);

		// "Sumar" pasa a ser un selector de cantidad, como en el sitio.
		document.addEventListener("click", (event) => {
			const add = event.target.closest("[data-sumar]");
			if (add) {
				const holder = add.parentElement;
				holder.dataset.btn = add.outerHTML;
				holder.innerHTML = `<div class="stepper"><button aria-label="Quitar uno">−</button><span>1 en tu pedido</span><button aria-label="Sumar uno">+</button></div>`;
				return;
			}
			const step = event.target.closest(".stepper button");
			if (step) {
				const holder = step.closest(".buy");
				const label = holder.querySelector("span");
				const qty = Number.parseInt(label.textContent, 10) + (step.textContent === "+" ? 1 : -1);
				if (qty < 1) holder.innerHTML = holder.dataset.btn;
				else label.textContent = `${qty} en tu pedido`;
				return;
			}
			const chip = event.target.closest(".chip");
			if (chip) for (const c of chip.parentElement.children) c.setAttribute("aria-pressed", String(c === chip));
		});

		tick();
		setInterval(tick, 30000);
	}

	return { chrome, renderScenes, renderGrid, renderSpotlight, renderFaq, nextClose, tick, icon };
})();
