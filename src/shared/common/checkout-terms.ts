/**
 * Terms the customer accepts at checkout; each accepted order stores a snapshot of
 * `version` + `text`, so any wording change must bump `version`.
 *
 * Interim placeholder until the legal text is provided (ADR 0009 is deferred).
 */
export const CHECKOUT_TERMS = {
	version: "checkout-v2",
	text: `TEXTO DE PRUEBA — Estos términos son un borrador para el entorno de pruebas y no tienen validez legal.

1. Objeto. Al confirmar el pedido, el cliente compra los productos detallados en el resumen, en las cantidades y precios que allí figuran. Los precios se calculan por bloque de compra mínima (MOQ) y sus incrementos, e incluyen los impuestos indicados.

2. Compra agrupada. Los pedidos se agrupan con los de otros clientes para comprar al proveedor. Por eso la fecha de entrega es estimada y depende del cierre de la operación de compra.

3. Pago. El pedido queda confirmado cuando el pago se acredita. Los pagos con Mercado Pago se acreditan cuando el proveedor de pagos los aprueba. Las transferencias se acreditan cuando el equipo de administración verifica el comprobante. Mientras el pago no se acredite, el pedido queda pendiente y no se reserva mercadería.

4. Disponibilidad y ajustes. Si el proveedor entrega menos cantidad que la pedida, la diferencia se reprograma para una próxima operación o se cancela. Te avisamos en el seguimiento del pedido, con el motivo. Nunca se cobra una cantidad que no se entrega.

5. Envío y retiro. La entrega se hace en la dirección elegida o en el punto de retiro indicado. El cliente debe recibir el pedido o retirarlo dentro del plazo informado. Las demoras de transporte se informan como incidencias en el seguimiento.

6. Cancelación y arrepentimiento. Podés arrepentirte de la compra dentro de los 10 días corridos desde la entrega, conforme a la Ley 24.240 de Defensa del Consumidor, siempre que los productos no sean perecederos ni hayan sido fraccionados a tu pedido. El reintegro se hace por el mismo medio de pago.

7. Productos perecederos. Los productos frescos deben revisarse al recibirlos. Los reclamos por mal estado se aceptan dentro de las 48 horas desde la entrega, con fotos del producto.

8. Responsabilidad. No respondemos por demoras causadas por el proveedor, el transporte o fuerza mayor, más allá de informarlas y reprogramar la entrega.

9. Datos personales. Usamos tus datos solo para gestionar el pedido, el pago y la entrega, conforme a la Ley 25.326 de Protección de Datos Personales.

10. Jurisdicción. Estos términos se rigen por las leyes de la República Argentina. Ante un conflicto, es competente la justicia del domicilio del consumidor.`,
} as const;
