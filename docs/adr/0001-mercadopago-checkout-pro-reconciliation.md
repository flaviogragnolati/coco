# Mercado Pago checkout uses Checkout Pro with reconciliation

We will integrate Mercado Pago checkout through Checkout Pro preferences instead of direct card payments or Checkout API Orders. The checkout creates a pending payment attempt and redirects to Mercado Pago, while our system reconciles the final result through signed webhooks followed by a Mercado Pago resource lookup; this keeps card handling outside the app, preserves payment traceability, and avoids treating redirect query parameters as payment truth.
