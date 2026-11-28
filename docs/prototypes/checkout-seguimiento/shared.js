// Datos de ejemplo, estado y piezas comunes de los tres prototipos.
// Los textos de etapas salen de src/shared/common/tracking-display.ts; lo que
// cambia respecto de hoy está marcado en index.html como propuesta.
const P = (() => {
	const IMG = "../../../public/tutorial/";
	const PERCENT = 5;
	const money = (n) => `$ ${Math.floor(n).toLocaleString("es-AR")}`;

	const items = [
		{ id: "alm", name: "Almendra Non Pareil", img: "almendra.webp", qty: "1 kg", unit: "$ 18.900 / kg", total: 18900 },
		{ id: "nuez", name: "Nuez mariposa", img: "nuez.webp", qty: "1,5 kg", unit: "$ 16.500 / kg", total: 24750 },
		{ id: "dat", name: "Dátil", img: "datil.webp", qty: "1 kg", unit: "$ 15.600 / kg", total: 15600 },
		{ id: "mix", name: "Mix deportivo", img: "mix-deportivo.webp", qty: "1 kg", unit: "$ 14.200 / kg", total: 14200 },
	];
	const addresses = [
		{ id: "a1", line: "Gobernador Paz 1240", rest: "Ushuaia, Tierra del Fuego" },
		{ id: "a2", line: "Kuanip 580, Dpto. 2", rest: "Ushuaia, Tierra del Fuego" },
	];
	const points = [
		{ id: "p1", name: "Punto de retiro Centro", line: "San Martín 450, Ushuaia", hours: "Lunes a viernes, de 10 a 18 h" },
		{ id: "p2", name: "Punto de retiro Río Pipo", line: "Av. Alem 2890, Ushuaia", hours: "Lunes a sábado, de 9 a 13 h" },
	];
	const bank = [
		["Alias", "COCO.USHUAIA"],
		["CBU", "0170099220000067891234"],
		["Titular", "CoCo Compras Comunitarias SAS"],
		["Banco", "BBVA"],
		["CUIT", "30-71234567-8"],
	];
	const order = { code: "PED-2611-0048", date: "27/11/2026" };
	const pastOrders = [
		{ id: "o2", code: "PED-1211-0031", date: "12/11/2026", names: "Castaña de cajú, Nuez mariposa y 1 más", imgs: ["castana-caju.webp", "nuez.webp", "datil.webp"], total: 52300, chip: "Entregado", tone: "t-ok", cur: 6 },
		{ id: "o3", code: "PED-2910-0019", date: "29/10/2026", names: "Almendra Non Pareil y Dátil", imgs: ["almendra.webp", "datil.webp"], total: 41800, chip: "Entregado", tone: "t-ok", cur: 6 },
		{ id: "o4", code: "PED-1510-0007", date: "15/10/2026", names: "Mix deportivo", imgs: ["mix-deportivo.webp"], total: 14200, chip: "Cancelado", tone: "t-off", cur: -1 },
	];

	const STAGES = [
		{ key: "submitted", label: "Pedido confirmado", desc: "Recibimos tu pago. Tu pedido entra en la compra de la semana.", icon: "receipt" },
		{ key: "preparation", label: "Preparación", desc: "Cerramos la semana y juntamos tu pedido con los del resto de Ushuaia.", icon: "group" },
		{ key: "supplier", label: "Compra al proveedor", desc: "Hacemos una sola compra grande en Buenos Aires.", icon: "store" },
		{ key: "packaging", label: "Empaque", desc: "El proveedor prepara la mercadería para el viaje.", icon: "box" },
		{ key: "shipping", label: "En viaje", desc: "El camión cruza a Chile, el Estrecho de Magallanes y la cordillera.", icon: "truck" },
		{ key: "delivery", label: "Entrega", desc: "", icon: "home" },
	];
	const DATES = ["27/11", "2/12", "3/12", "4/12", "5/12", "11/12"];

	const svg = (d) =>
		`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
	const ICONS = {
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
		back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
		chevron: '<path d="M9 6l6 6-6 6"/>',
		down: '<path d="M6 9l6 6 6-6"/>',
		check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
		x: '<path d="M6 6l12 12M18 6L6 18"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
		copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
		lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
		info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
		repeat: '<path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2"/><path d="M20 4v4h-4M4 20v-4h4"/>',
		pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.800 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
		home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
		store: '<path d="M3 21V9l9-5 9 5v12"/><path d="M8 21v-7h8v7M8 17.5h8"/>',
		shop: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M10 20v-5h4v5"/>',
		bank: '<path d="M3 10l9-6 9 6z"/><path d="M5 10v8M9.5 10v8M14.500 10v8M19 10v8M3 21h18"/>',
		wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12.500h2M3 10h18"/>',
		truck: '<path d="M2 7h11v9H2zM13 10h4l4 3v3h-8z"/><circle cx="6.500" cy="17.500" r="1.800"/><circle cx="17" cy="17.500" r="1.800"/>',
		box: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>',
		group: '<circle cx="8" cy="9" r="3"/><circle cx="16.500" cy="10" r="2.500"/><path d="M2.500 19c.8-3 2.900-4.500 5.500-4.500s4.700 1.500 5.500 4.500M15 14.600c2.700-.3 4.900 1.100 5.800 4.400"/>',
		receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 9.500l2 2 4-4M9 15h6"/>',
		bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
		cart: '<path d="M3 4h2l2.400 11h10.200L20 7H6.200"/><circle cx="9" cy="19" r="1.400"/><circle cx="17" cy="19" r="1.400"/>',
		user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.500-4 4.500-6 8-6s6.500 2 8 6"/>',
		help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.4-1 1-1 1.700M12 17h.01"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.500-3.500"/>',
		menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
		chat: '<path d="M4 5h16v11H9l-5 4z"/>',
	};
	const icon = (name) => svg(ICONS[name] ?? "");

	// Estado: todo string, así los atributos data-* lo comparan sin conversión.
	const S = {
		screen: "cart",
		mode: "home",
		addr: "a1",
		pick: "p1",
		pay: "transfer",
		terms: "0",
		fresh: "0",
		scenario: "ship",
		declared: "0",
		mp: "ok",
		sheet: "",
	};
	const T = {};
	const hooks = [];
	const setHooks = [];

	// Próximo cierre: miércoles 12:00 de Argentina (15:00 UTC).
	function nextClose(now = new Date()) {
		const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15));
		t.setUTCDate(t.getUTCDate() + ((3 - t.getUTCDay() + 7) % 7));
		if (t <= now) t.setUTCDate(t.getUTCDate() + 7);
		return t;
	}

	function stagesAt(current, done = false) {
		const deliveryDesc =
			S.mode === "pickup" ? "Te avisamos cuando esté en el punto de retiro para que pases a buscarlo." : "Te lo llevamos a tu dirección.";
		return STAGES.map((stage, index) => ({
			...stage,
			desc: stage.desc || deliveryDesc,
			status: done || index < current ? "completed" : index === current ? "current" : "pending",
			date: done || index <= current ? DATES[index] : "",
		}));
	}

	/** Misma forma que buildCustomerOrderJourneyView: empty | unified | perItem (acá agrupado por etapa). */
	function journey() {
		if (S.scenario === "pay") return { mode: "empty", cur: -1 };
		if (S.scenario === "prep") return { mode: "unified", cur: 1, stages: stagesAt(1), notices: [] };
		if (S.scenario === "ship") return { mode: "unified", cur: 4, stages: stagesAt(4), notices: [] };
		if (S.scenario === "done") return { mode: "unified", cur: 6, stages: stagesAt(6, true), notices: [] };
		const late = stagesAt(1).map((stage, index) => ({ ...stage, date: index === 0 ? "27/11" : index === 1 ? "9/12" : "" }));
		return {
			mode: "perItem",
			cur: 4,
			groups: [
				{ label: "En viaje", items: items.filter((item) => item.id !== "dat"), stages: stagesAt(4), cur: 4, notices: [] },
				{
					label: "Preparación",
					items: items.filter((item) => item.id === "dat"),
					stages: late,
					cur: 1,
					notices: [
						{
							kind: "rollover",
							label: "Pasa a la compra de la semana siguiente",
							reason: "El proveedor no tenía stock esta semana.",
							date: "3/12",
							stage: 1,
						},
					],
				},
			],
		};
	}

	function compute() {
		const subtotal = items.reduce((sum, item) => sum + item.total, 0);
		const transferTotal = Math.floor((subtotal * (100 - PERCENT)) / 100);
		const transfer = S.pay === "transfer";
		const address = addresses.find((item) => item.id === S.addr);
		const point = points.find((item) => item.id === S.pick);
		const pickup = S.mode === "pickup";
		const close = nextClose();
		const left = Math.max(0, close - Date.now());
		const d = Math.floor(left / 864e5);
		const h = Math.floor(left / 36e5) % 24;
		const closeDay = `miércoles ${close.getUTCDate()}/${close.getUTCMonth() + 1}`;
		const charge = transfer ? transferTotal : subtotal;
		const noAddress = S.fresh === "1" && !pickup;

		Object.assign(T, {
			count: `${items.length} productos`,
			subtotal: money(subtotal),
			transferTotal: money(transferTotal),
			discount: `− ${money(subtotal - transferTotal)}`,
			saving: `Ahorrás ${money(subtotal - transferTotal)} (${PERCENT} %)`,
			percent: `${PERCENT} %`,
			charge: money(charge),
			code: order.code,
			orderDate: order.date,
			closeDay,
			closeFull: `${closeDay} a las 12:00`,
			left: d > 0 ? `${d} d ${h} h` : `${h} h`,
			deliveryTitle: pickup ? "Punto de retiro" : "A domicilio",
			deliveryLine: pickup ? point.name : noAddress ? "Falta tu dirección" : address.line,
			deliveryRest: pickup ? `${point.line} · ${point.hours}` : noAddress ? "" : address.rest,
			deliverySum: pickup ? `Punto de retiro · ${point.name}` : noAddress ? "Falta tu dirección" : `A domicilio · ${address.line}`,
			payTitle: transfer ? "Transferencia bancaria" : "Mercado Pago",
			paySum: transfer ? `Transferencia · ${money(transferTotal)} con ${PERCENT} % de descuento` : `Mercado Pago · ${money(subtotal)}`,
			cta: transfer ? "Confirmar pedido" : "Pagar en Mercado Pago",
			ctaHint: transfer
				? "En la pantalla siguiente te damos los datos para transferir."
				: "Te llevamos a Mercado Pago para pagar y después volvés a CoCo.",
			totalLabel: transfer ? "Total a transferir" : "Total",
			n1t: transfer ? "Transferís y nos avisás" : "Pago acreditado",
			n1d: transfer ? "Confirmamos tu pedido cuando verificamos la transferencia." : "Tu pedido ya está confirmado.",
			n4t: pickup ? "Lo retirás" : "Te lo llevamos",
			n4d: pickup ? `En ${point.name}, en su horario.` : `A ${address.line}.`,
		});

		const mp = {
			ok: ["Pago recibido", "Mercado Pago aprobó tu pago. Tu pedido ya entró en la compra de esta semana.", "t-ok", "Pago aprobado"],
			pending: [
				"Estamos esperando la confirmación de Mercado Pago",
				"Puede tardar unos minutos, o hasta dos días hábiles si elegiste pagar en efectivo. No hace falta que te quedes en esta página: te avisamos en Mis pedidos.",
				"t-warn",
				"Pago en proceso",
			],
			fail: [
				"Mercado Pago no aprobó el pago",
				"No se cobró nada. Tu pedido quedó guardado: podés intentar de nuevo o pagar por transferencia.",
				"t-off",
				"Pago no aprobado",
			],
		}[S.mp];
		Object.assign(T, { mpTitle: mp[0], mpText: mp[1], mpTone: mp[2], mpChip: mp[3] });

		const where = pickup ? point.name : address.line;
		const st = {
			pay: transfer
				? ["Esperando tu pago", "t-warn", "Falta tu transferencia", `Transferí ${money(transferTotal)} antes del ${closeDay} a las 12:00 para entrar en la compra de esta semana.`]
				: ["Esperando tu pago", "t-warn", "Falta el pago", `Pagá antes del ${closeDay} a las 12:00 para entrar en la compra de esta semana.`],
			prep: ["En curso", "t-go", "Tu pedido entra en la compra de esta semana", `El ${closeDay} a las 12:00 cerramos y compramos todo junto. Desde el cierre tarda 7 a 10 días en llegar.`],
			ship: ["En curso", "t-go", "Tu pedido está viajando a Ushuaia", "Salió de Buenos Aires el 5/12. Llega entre 7 y 10 días después del cierre."],
			mixed: ["En curso", "t-go", "Tu pedido llega en dos partes", "Tres productos ya están en viaje. El dátil pasa a la compra de la semana siguiente."],
			done: ["Entregado", "t-ok", "Pedido entregado", pickup ? `Lo retiraste el 11/12 en ${where}.` : `Lo recibiste el 11/12 en ${where}.`],
		}[S.scenario];
		const j = journey();
		Object.assign(T, {
			stChip: st[0],
			stTone: st[1],
			stTitle: st[2],
			stText: st[3],
			stStage: j.mode === "empty" ? "Sin empezar" : j.cur >= 6 ? "Entregado" : STAGES[j.cur].label,
		});
	}

	function match(expr) {
		return expr
			.trim()
			.split(/\s+/)
			.every((cond) => {
				const at = cond.indexOf(":");
				const key = cond.slice(0, at);
				let value = cond.slice(at + 1);
				const negate = value.startsWith("!");
				if (negate) value = value.slice(1);
				const hit = value.split("|").includes(S[key]);
				return negate ? !hit : hit;
			});
	}

	function sync() {
		compute();
		for (const fn of hooks) fn(S, T);
		for (const el of document.querySelectorAll("[data-screen]")) el.hidden = !el.dataset.screen.split(" ").includes(S.screen);
		for (const el of document.querySelectorAll("[data-show]")) el.hidden = !match(el.dataset.show);
		for (const el of document.querySelectorAll("[data-set]")) {
			const at = el.dataset.set.indexOf(":");
			const on = S[el.dataset.set.slice(0, at)] === el.dataset.set.slice(at + 1);
			el.classList.toggle("is-on", on);
			if (el.matches(".opt, .seg button, .proto button")) el.setAttribute("aria-pressed", String(on));
		}
		for (const el of document.querySelectorAll("[data-t]")) el.textContent = T[el.dataset.t] ?? "";
		for (const el of document.querySelectorAll("[data-chip]")) {
			const key = el.dataset.chip;
			el.className = `chip ${T[`${key}Tone`]}`;
			el.textContent = T[`${key}Chip`];
		}
		for (const el of document.querySelectorAll("[data-dis]")) el.disabled = match(el.dataset.dis);
		for (const el of document.querySelectorAll("[data-bind]")) {
			if (el.type === "checkbox") el.checked = S[el.dataset.bind] === "1";
			else el.value = S[el.dataset.bind];
		}
		const hash = Object.entries(S)
			.filter(([, value]) => value !== "")
			.map(([key, value]) => `${key}=${value}`)
			.join("&");
		history.replaceState(null, "", `#${hash}`);
	}

	function set(key, value) {
		const before = S[key];
		S[key] = value;
		for (const fn of setHooks) fn(key, value, before);
		sync();
		if (key === "screen" && before !== value) window.scrollTo(0, 0);
	}

	/* Piezas de marcado compartidas */
	const h = {
		lines: (list = items, size = "") =>
			list
				.map(
					(item) =>
						`<li class="line"><img class="thumb ${size}" src="${IMG}${item.img}" alt=""><span class="grow"><b>${item.name}</b><br><span class="muted small">${item.qty}</span></span><span class="amt num">${money(item.total)}</span></li>`,
				)
				.join(""),
		linesEdit: () =>
			items
				.map(
					(item) =>
						`<li class="line"><img class="thumb lg" src="${IMG}${item.img}" alt=""><span class="grow"><b>${item.name}</b><br><span class="muted small num">${item.unit}</span><span class="rowx" style="margin-top:8px"><span class="qty"><button aria-label="Quitar">−</button><span>${item.qty}</span><button aria-label="Sumar">+</button></span><button class="link xs muted">Quitar</button></span></span><span class="amt num">${money(item.total)}</span></li>`,
				)
				.join(""),
		thumbs: (imgs, size = "sm") => `<span class="thumbs">${imgs.map((img) => `<img class="thumb ${size}" src="${IMG}${img}" alt="">`).join("")}</span>`,
		addresses: () =>
			addresses
				.map(
					(a) =>
						`<button class="opt" data-set="addr:${a.id}"><span class="grow"><b>${a.line}</b><span class="muted small">${a.rest}</span></span><span class="link xs muted">Editar</span></button>`,
				)
				.join(""),
		points: () =>
			points
				.map(
					(p) =>
						`<button class="opt" data-set="pick:${p.id}"><span class="grow"><b>${p.name}</b><span class="small">${p.line}</span><span class="muted small">${p.hours}</span></span><span class="link xs muted">Ver en el mapa</span></button>`,
				)
				.join(""),
		pays: () =>
			`<button class="opt" data-set="pay:transfer"><span class="grow"><b>Transferencia bancaria</b><span class="muted small">Te damos los datos al confirmar. Tu pedido queda confirmado cuando verificamos la transferencia.</span></span><span class="side"><b class="num" data-t="transferTotal"></b><span class="save xs" data-t="saving"></span></span></button>
			<button class="opt" data-set="pay:mp"><span class="grow"><b>Mercado Pago</b><span class="muted small">Tarjeta, dinero en cuenta o efectivo. Pagás en Mercado Pago y volvés a CoCo.</span></span><span class="side"><b class="num" data-t="subtotal"></b></span></button>`,
		addressForm: () =>
			`<div class="form">
				<label class="field full">Calle y número<input placeholder="Ej. Gobernador Paz 1240" autocomplete="address-line1"></label>
				<label class="field">Piso o depto <input placeholder="Opcional"></label>
				<label class="field">Código postal<input value="9410"></label>
				<p class="full muted small">Entregamos en Ushuaia, Tierra del Fuego.</p>
			</div>`,
		bank: () =>
			`<dl class="kv">${bank
				.map(([k, v], i) => `<div><dt>${k}</dt><dd><span class="${i < 2 || i === 4 ? "mono" : ""}">${v}</span>${i < 2 ? `<button class="copy" data-copy>${icon("copy")}Copiar</button>` : ""}</dd></div>`)
				.join("")}
				<div><dt>Monto</dt><dd><span class="num" data-t="transferTotal"></span><button class="copy" data-copy>${icon("copy")}Copiar</button></dd></div>
				<div><dt>Referencia</dt><dd><span class="mono" data-t="code"></span><button class="copy" data-copy>${icon("copy")}Copiar</button></dd></div>
			</dl>`,
		receipt: () =>
			`<div data-show="declared:0" class="stack" style="gap:10px">
				<label class="field">Número de comprobante<input placeholder="Ej. 0012345678"></label>
				<p class="muted xs">Es el número que te dio tu banco. Lo usamos para encontrar tu transferencia.</p>
				<button class="btn btn-ink" data-set="declared:1">Informar transferencia</button>
			</div>
			<div data-show="declared:1" class="box-soft"><span class="lbl">Comprobante informado</span><b class="mono">0012345678</b><p class="small">Lo estamos verificando. Te avisamos acá cuando el pedido quede confirmado. <button class="link" data-set="declared:0">Corregir</button></p></div>`,
		next: () =>
			`<ol class="next">
				<li><span class="n">1</span><b data-t="n1t"></b><span class="muted small" data-t="n1d"></span></li>
				<li><span class="n">2</span><b>Cerramos el <span data-t="closeFull"></span></b><span class="muted small">Juntamos todos los pedidos y hacemos una sola compra.</span></li>
				<li><span class="n">3</span><b>Viaja a Ushuaia</b><span class="muted small">Tarda 7 a 10 días desde el cierre. Lo seguís en Mis pedidos.</span></li>
				<li><span class="n">4</span><b data-t="n4t"></b><span class="muted small" data-t="n4d"></span></li>
			</ol>`,
		terms: () =>
			`<div class="terms-text">
				<p><b>1. Objeto.</b> Al confirmar el pedido comprás los productos del resumen, en las cantidades y precios que ahí figuran.</p>
				<p><b>2. Compra agrupada.</b> Los pedidos se agrupan con los de otros clientes para comprarle al proveedor. Por eso la fecha de entrega es estimada.</p>
				<p><b>3. Pago.</b> El pedido queda confirmado cuando el pago se acredita. Si pagás por transferencia, tenés el descuento que se informa en el pago.</p>
				<p><b>4. Disponibilidad y ajustes.</b> Si el proveedor entrega menos cantidad, la diferencia se reprograma o se cancela, y te avisamos en el seguimiento. Nunca se cobra una cantidad que no se entrega.</p>
				<p class="muted">… (texto completo de la versión activa de los términos)</p>
			</div>`,
	};

	function chrome({ screens, focus = [], fresh = "checkout", mpShow = "screen:result pay:mp", scenarioShow = "screen:orders|track" }) {
		const variant = document.body.dataset.variant;
		const tabs = [
			["index", "Revisión"],
			["variante-a", "A · Una sola página"],
			["variante-b", "B · Paso a paso"],
			["variante-c", "C · Todo en Tu pedido"],
		]
			.map(([file, label]) => `<a href="${file}.html"${file === `variante-${variant}` ? ' aria-current="page"' : ""}>${label}</a>`)
			.join("");
		const screenTabs = screens.map(([id, label]) => `<button data-set="screen:${id}">${label}</button>`).join("");
		const focusShow = focus.length ? ` data-show="screen:!${focus.join("|")}"` : "";

		document.body.insertAdjacentHTML(
			"afterbegin",
			`<div class="proto">${tabs}<span class="sep"></span><span class="lbl">Pantalla</span>${screenTabs}<span class="sep"></span>
				<label class="lbl" data-show="screen:${fresh}">Cliente <select data-bind="fresh"><option value="0">con dirección guardada</option><option value="1">primera compra</option></select></label>
				<label class="lbl" data-show="${mpShow}">Mercado Pago <select data-bind="mp"><option value="ok">aprobó</option><option value="pending">en proceso</option><option value="fail">rechazó</option></select></label>
				<label class="lbl" data-show="${scenarioShow}">Estado del pedido <select data-bind="scenario"><option value="pay">esperando el pago</option><option value="prep">preparación</option><option value="ship">en viaje</option><option value="mixed">en dos partes</option><option value="done">entregado</option></select></label>
			</div>
			<div${focusShow}>
				<div class="announce">Compras comunitarias en Ushuaia</div>
				<header class="nav"><div class="wrap">
					<a class="logo" href="#">coco</a>
					<span class="btn btn-outline">${icon("menu")}Catálogo</span>
					<div class="nav-search">${icon("search")}Buscar productos</div>
					<div class="nav-right">
						<span class="nav-cd">Cierra en <b data-t="left"></b></span>
						<button class="icon-btn" aria-label="Ayuda">${icon("help")}</button>
						<button class="icon-btn" aria-label="Tu pedido" data-set="screen:cart">${icon("cart")}<span class="dot">4</span></button>
						<button class="icon-btn" aria-label="Mis pedidos" data-set="screen:orders">${icon("user")}</button>
					</div>
				</div></header>
			</div>`,
		);
		document.body.insertAdjacentHTML(
			"beforeend",
			`<div class="scrim center" data-show="sheet:terms"><div class="sheet" role="dialog" aria-label="Términos del pedido">
				<div class="sheet-head"><h2>Términos del pedido</h2><button class="icon-btn" aria-label="Cerrar" data-set="sheet:">${icon("x")}</button></div>
				${h.terms()}
				<div class="sheet-foot rowx"><button class="btn btn-ink" data-accept>Acepto los términos</button><button class="btn btn-ghost" data-set="sheet:">Cerrar</button></div>
			</div></div>
			<footer class="footer"${focusShow}><div class="wrap">Prototipo · precios, productos, direcciones y datos bancarios de ejemplo.</div></footer>`,
		);

		for (const el of document.querySelectorAll("[data-r]")) el.innerHTML = h[el.dataset.r]();
		for (const el of document.querySelectorAll("[data-i]")) el.insertAdjacentHTML("afterbegin", icon(el.dataset.i));

		document.addEventListener("click", (event) => {
			const accept = event.target.closest("[data-accept]");
			if (accept) {
				S.terms = "1";
				set("sheet", "");
				return;
			}
			const copy = event.target.closest("[data-copy]");
			if (copy) {
				const html = copy.innerHTML;
				copy.innerHTML = `${icon("check")}Copiado`;
				setTimeout(() => {
					copy.innerHTML = html;
				}, 1200);
				return;
			}
			const scrim = event.target.matches(".scrim") ? event.target : null;
			if (scrim) return set("sheet", "");
			const setter = event.target.closest("[data-set]");
			if (setter) {
				event.preventDefault();
				const at = setter.dataset.set.indexOf(":");
				set(setter.dataset.set.slice(0, at), setter.dataset.set.slice(at + 1));
			}
		});
		document.addEventListener("change", (event) => {
			const el = event.target.closest("[data-bind]");
			if (el) set(el.dataset.bind, el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value);
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && S.sheet) set("sheet", "");
		});

		for (const pair of location.hash.slice(1).split("&")) {
			const [key, value] = pair.split("=");
			if (key in S && value !== undefined) S[key] = decodeURIComponent(value);
		}
		sync();
	}

	return {
		S,
		T,
		chrome,
		set,
		sync,
		icon,
		money,
		items,
		pastOrders,
		order,
		journey,
		stagesAt,
		h,
		IMG,
		onSync: (fn) => hooks.push(fn),
		onSet: (fn) => setHooks.push(fn),
	};
})();
