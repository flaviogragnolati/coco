# Tracking Architecture

This document describes the event-driven cart item tracking architecture used by
the application.

The goal is to keep fulfillment traceability centralized. Checkout, admin cart
operations, fulfillment orchestration, supplier integration, packaging,
shipments, rollovers, and exception handling publish domain facts. The tracking
module decides how those facts become `CartItemTrackingEvent` rows and when a
`CartItem.fulfillmentStatus` projection is justified.

## Core Rule

Application code outside `src/server/services/tracking/` must not write
`CartItemTrackingEvent` rows directly.

Allowed runtime write boundary:

```txt
Domain service
  -> business mutation in a database transaction
  -> DomainEventPublisher writes DomainEventOutbox in the same transaction
  -> transaction commits
  -> DomainEventDispatcher.wake()
  -> DomainEventListenerRegistry
  -> TrackingDomainEventListener
  -> TrackingEventService
  -> CartItemTrackingEvent
  -> TrackingStatusProjector
  -> CartItem.fulfillmentStatus when evidence exists
```

Seed scripts may create fixture tracking rows. Runtime application services must
publish domain events instead.

## V1 Execution Model

The v1 dispatcher is operation-triggered only.

There is no cron job, polling loop, background interval, scheduled worker,
long-running worker process, or external queue. Pending events are processed
only when a successful application operation explicitly calls
`DomainEventDispatcher.wake()` after its transaction commits.

This gives the system durable event storage without introducing worker topology
yet. If a listener fails, the outbox row remains retryable and will be retried by
a later successful operation-triggered wake.

## Data Model

### `DomainEventOutbox`

`DomainEventOutbox` is the durable event log for domain facts waiting for
listener processing.

Important fields:

- `eventKey`: unique deterministic idempotency key for the domain event.
- `eventType`: event name, such as `cart.item.submittedToOrder`.
- `aggregateType`: aggregate name, such as `CartItem`.
- `aggregateId`: aggregate identifier as text.
- `payload`: JSON event payload.
- `actor`: optional JSON actor context.
- `status`: `pending`, `processing`, `processed`, or `failed`.
- `attempts`: dispatch failure count.
- `lastError`: last failure message.
- `lockedAt`: processing lock timestamp.
- `processedAt`: completion timestamp.

Indexes support status scans, event-type inspection, and aggregate lookup:

- `[status, createdAt]`
- `[eventType, createdAt]`
- `[aggregateType, aggregateId]`

### `CartItemTrackingEvent`

`CartItemTrackingEvent` remains the canonical cart-item fulfillment timeline.

The event-driven implementation adds:

- `eventKey`: optional unique idempotency key. It is nullable for historical
  rows and seed compatibility, but new runtime tracking writes must always set
  it.
- `[cartItemId, createdAt]` index for timeline loading.
- `[eventType, createdAt]` index for operational inspection.

`TrackingEventService` is the only runtime writer of this model.

## Event Contracts

Domain events live in:

- `src/schemas/domain-events.schemas.ts`
- `src/shared/common/domain-events.types.ts`

The top-level contract is `DomainEventInput`.

Shared primitives:

```ts
type DomainActor = {
  source: "user" | "admin" | "system" | "supplier" | "carrier";
  actorId?: string;
  actorReference?: string;
};

type DomainEventInput = {
  type: string;
  eventKey: string;
  aggregateType: string;
  aggregateId: string;
  actor?: DomainActor;
  payload: unknown;
};
```

The actual schema is a discriminated union on `type`. Producers should emit
domain facts, not tracking instructions.

Good event names:

- `cart.item.submittedToOrder`
- `admin.cartItem.quantityChanged`
- `operation.cartItem.allocatedToLotItem`
- `supplier.lotItem.confirmed`
- `package.cartItem.packaged`
- `shipment.endUser.delivered`
- `fulfillment.exception.created`

Bad event names:

- `createTrackingEvent`
- `writeSubmittedToOrderTracking`
- `updateCartItemTrackingStatus`

Payload rules:

- Quantities are decimal strings, not JavaScript numbers.
- Metadata must be JSON-safe.
- Dates must be serialized as ISO strings.
- Decimal values must be serialized as strings.
- Do not include class instances, functions, circular objects, raw `Error`
  objects, or raw `Date` objects.

## Runtime Components

### `DomainEventPublisher`

File: `src/server/events/domain-event-publisher.ts`

Responsibilities:

- Validate `DomainEventInput` with Zod.
- Write `DomainEventOutbox` rows inside the caller's transaction.
- Enforce domain-event idempotency through `eventKey`.
- Avoid listener execution inside the domain transaction.
- Avoid importing tracking services.
- Avoid writing `CartItemTrackingEvent`.

Public API:

```ts
class DomainEventPublisher {
  static publish(tx: Prisma.TransactionClient, event: DomainEventInput): Promise<void>;
  static publishMany(tx: Prisma.TransactionClient, events: DomainEventInput[]): Promise<void>;
}
```

`publish` uses `upsert` by `eventKey`. `publishMany` uses `createMany` with
`skipDuplicates`.

### `DomainEventDispatcher`

File: `src/server/events/domain-event-dispatcher.ts`

Responsibilities:

- Fetch pending or stale processing events ordered by `createdAt asc, id asc`.
- Claim rows through an atomic conditional `updateMany`.
- Parse persisted outbox rows back into `DomainEventInput`.
- Dispatch events to registered listeners.
- Mark events `processed` after all listeners finish.
- Return failures to `pending` until attempts are exhausted.
- Mark events `failed` after max attempts.
- Write an audit log for permanent listener failure.
- Log structured dispatch lifecycle events.

Public API:

```ts
class DomainEventDispatcher {
  static wake(options?: { batchSize?: number }): Promise<void>;
}
```

Current constants:

- `MAX_ATTEMPTS = 5`
- `DEFAULT_BATCH_SIZE = 50`
- `STALE_LOCK_MS = 5 * 60 * 1000`

The dispatcher is implemented as a static class intentionally. It is a stable
facade and not expected to be instantiated.

### `DomainEventListenerRegistry`

File: `src/server/events/domain-event-listener.registry.ts`

Responsibilities:

- Store listener instances.
- Return listeners whose `supports(event)` method accepts a parsed event.

Public API:

```ts
class DomainEventListenerRegistry {
  register(listener: DomainEventListener): void;
  getListenersFor(event: ParsedPersistedDomainEvent): DomainEventListener[];
}
```

Current registered listener:

- `TrackingDomainEventListener`

### `DomainEventListener`

File: `src/server/events/domain-event.types.ts`

Interface:

```ts
type PersistedDomainEvent = {
  id: string;
  eventKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  actor: unknown | null;
  attempts: number;
  createdAt: Date;
};

type ParsedPersistedDomainEvent = PersistedDomainEvent & {
  domainEvent: DomainEventInput;
};

interface DomainEventListener {
  name: string;
  supports(event: DomainEventInput): boolean;
  handle(event: ParsedPersistedDomainEvent): Promise<void>;
}
```

Listeners receive parsed, schema-validated events.

### `TrackingDomainEventListener`

File: `src/server/services/tracking/tracking-domain-event.listener.ts`

Responsibilities:

- Declare supported domain event types.
- Map domain events to tracking commands.
- Open a listener-side transaction.
- Persist tracking events through `TrackingEventService`.
- Write audit context for handled tracking events.

The listener never updates domain business records directly. It delegates
tracking persistence to `TrackingEventService` and status projection to the
tracking service/projector path.

### `mapDomainEventToTrackingCommands`

File: `src/server/services/tracking/tracking-event-mapper.ts`

This is a pure mapping function:

```ts
function mapDomainEventToTrackingCommands(
  event: DomainEventInput,
): TrackingCommand[];
```

`TrackingCommand` is the tracking module's internal write command:

```ts
type TrackingCommand = {
  eventKey: string;
  cartItemId: string;
  eventType: CartItemTrackingEventType;
  quantity?: string;
  source: "user" | "admin" | "system" | "supplier" | "carrier";
  actorId?: string;
  actorReference?: string;
  refs?: {
    operationId?: string;
    lotId?: string;
    lotItemId?: string;
    packageId?: string;
    shipmentId?: string;
    rolloverId?: string;
    orderId?: string;
    userOrderItemId?: string;
    transactionId?: string;
  };
  metadata?: Record<string, unknown>;
};
```

The mapper creates tracking event keys with this shape:

```txt
tracking:{domainEvent.eventKey}:{trackingEventType}
```

That gives separate idempotency for the durable domain event and each derived
tracking event.

### `TrackingEventService`

File: `src/server/services/tracking/tracking-event.service.ts`

Responsibilities:

- Validate integer reference strings before persistence.
- Verify the target `CartItem` exists.
- Upsert tracking rows by deterministic `eventKey`.
- Persist actor, quantity, references, and metadata.
- Call `TrackingStatusProjector.project()` after the tracking row is written.
- Load user and admin timelines.

Public API:

```ts
class TrackingEventService {
  static recordFromCommand(
    tx: Prisma.TransactionClient,
    command: TrackingCommand,
  ): Promise<CartItemTrackingEvent>;

  static recordManyFromCommands(
    tx: Prisma.TransactionClient,
    commands: TrackingCommand[],
  ): Promise<CartItemTrackingEvent[]>;

  static getUserOrderTimeline(
    userId: string,
    orderId: number,
  ): Promise<UserTrackingTimelineItem[]>;

  static getAdminCartTimeline(
    cartId: number,
  ): Promise<AdminTrackingTimelineItem[]>;

  static getAdminCartItemTimeline(
    cartItemId: number,
  ): Promise<AdminTrackingTimelineItem[]>;
}
```

This static class is the ownership boundary for runtime
`CartItemTrackingEvent` writes.

### `TrackingStatusProjector`

File: `src/server/services/tracking/tracking-status-projector.ts`

Responsibilities:

- Decide whether a tracking command implies a `CartItem.fulfillmentStatus`
  update.
- Verify detailed evidence before changing aggregate fulfillment status.
- Skip projection and log a warning when evidence is missing.

Projection examples:

| Tracking event | Target fulfillment status | Evidence check |
| --- | --- | --- |
| `submittedToOrder` | `awaitingAggregation` | Matching `UserOrderItem` exists |
| `includedInOperation` | `includedInOperation` | Referenced `Operation` exists |
| `allocatedToLotItem` | `allocatedToSupplierItem` | Matching `CartItemLotItem` exists |
| `includedInSupplierOrder` | `requestedFromSupplier` | Referenced `Lot` has `supplierOrderId` |
| `supplierConfirmed` | `supplierConfirmed` | Referenced `LotItem` is `confirmed` |
| `packaged` | `packaged` | Matching package allocation exists |
| shipment movement events | shipment-related statuses | Matching package allocation on shipment exists |
| rollover events | `partiallyRolledOver` | Matching `RollOver` exists |
| `cartItemCancelled` | `cancelled` | Cart item is deleted or cancelled |
| `fulfillmentException` | `exception` | Cart item exists |

The projector intentionally does not blindly trust the event. Aggregate
fulfillment status is only updated when detailed records justify the status.

### `AuditLogService`

File: `src/server/services/audit/audit-log.service.ts`

Responsibilities:

- Write generic audit rows with actor context.
- Write permanent listener failure audit rows.
- Preserve domain event ids, tracking event ids, event keys, listener name, and
  failure reason when available.

### `AppLogger`

File: `src/server/services/logging/app-logger.service.ts`

Responsibilities:

- Provide structured `debug`, `info`, `warn`, and `error` methods.
- Provide named helpers for domain event and tracking lifecycle logs.
- Support child loggers with shared context.

## Current Producers

### Checkout

File: `src/server/services/checkout/checkout.service.ts`

On successful payment capture, checkout:

1. Updates the transaction from the payment gateway response.
2. Marks cart items `submitted`.
3. Marks the cart `submitted`.
4. Marks the order `processing`.
5. Publishes one `cart.item.submittedToOrder` event per cart item in the same
   transaction.
6. Commits the transaction.
7. Calls `DomainEventDispatcher.wake()`.

Checkout no longer imports the tracking service and no longer writes
`CartItemTrackingEvent` directly.

Checkout event key shape:

```txt
checkout:order:{orderId}:transaction:{transactionId}:cartItem:{cartItemId}:submittedToOrder
```

### Admin Operations Cart

Files:

- `src/server/services/admin/operations-cart.service.ts`
- `src/server/services/admin/operations-effects/cart-operation-effects.ts`

Admin cart operations publish events through the existing side-effect hook.

Current domain events:

- `admin.cartItem.added`
- `admin.cartItem.quantityChanged`
- `admin.cartItem.removed`
- `admin.cartItem.cancelled`

Admin mutations call `DomainEventDispatcher.wake()` after their transaction
commits.

The hard-delete path currently wakes the dispatcher but does not emit cart-item
events when the side-effect change set has no `after` cart detail. This is
intentional for relation-safe hard deletes, where no runtime tracking lineage is
created for rows being physically removed.

Admin event key shape:

```txt
admin:cart:{cartId}:cartItem:{cartItemId}:{action}:{occurredAtIso}
```

## Event Mapping

Current domain-to-tracking mappings:

| Domain event | Tracking event |
| --- | --- |
| `cart.item.submittedToOrder` | `submittedToOrder` |
| `admin.cartItem.added` | `addedToCart` |
| `admin.cartItem.quantityChanged` | `cartItemQuantityChanged` |
| `admin.cartItem.removed` | `cartItemRemoved` |
| `admin.cartItem.cancelled` | `cartItemCancelled` |
| `fulfillment.exception.created` | `fulfillmentException` |
| `fulfillment.exception.resolved` | `exceptionResolved` |
| `operation.cartItem.included` | `includedInOperation` |
| `operation.cartItem.allocatedToLotItem` | `allocatedToLotItem` |
| `supplier.lotItem.confirmed` | `supplierConfirmed` |
| `package.cartItem.packaged` | `packaged` |
| `shipment.internal.dispatched` | `movedInInternalShipment` |
| `shipment.internal.received` | `receivedAtWarehouse` |
| `shipment.endUser.dispatched` | `movedInEndUserShipment` |
| `shipment.endUser.delivered` | `delivered` |
| `rollover.preAllocation.created` | `rolledOverPreAllocation` |
| `rollover.postAllocation.created` | `rolledOverPostAllocation` |

## Timeline APIs

Timeline schemas and types live in:

- `src/schemas/tracking.schemas.ts`
- `src/shared/common/tracking.types.ts`

User endpoint:

```txt
tracking.getOrderTimeline({ orderId })
```

Rules:

- Requires an authenticated user.
- Loads the order only when `UserOrder.userId` matches the session user.
- Resolves source cart item ids from `UserOrderItem`.
- Returns redacted timeline rows: event type, source, quantity, created time,
  and label.
- Does not expose internal refs or full metadata.

Admin endpoints:

```txt
admin.tracking.getCartTimeline({ cartId })
admin.tracking.getCartItemTimeline({ cartItemId })
```

Rules:

- Require admin access through `adminProcedure`.
- Return full timeline rows including event id, event key, cart item id, actor,
  refs, metadata, quantity, and timestamp.
- Use stable ordering: `createdAt asc, id asc`.

## Idempotency

There are two idempotency layers:

1. `DomainEventOutbox.eventKey` prevents duplicate domain events.
2. `CartItemTrackingEvent.eventKey` prevents duplicate derived tracking rows.

Producers must use deterministic `eventKey` values. The tracking mapper derives
tracking command keys from the domain event key and tracking event type.

Retries are safe because:

- Re-publishing the same domain event key does not create a second outbox row.
- Re-handling the same outbox row does not create a second tracking row.
- Tracking writes use `upsert` by `eventKey`.

## Failure And Retry Behavior

Dispatcher failure flow:

1. Event is claimed by setting `status = processing` and `lockedAt = now`.
2. Event is parsed and sent to every supporting listener.
3. If all listeners succeed, the outbox row becomes `processed`.
4. If a listener fails, `attempts` increments and `lastError` is stored.
5. If attempts remain, the row returns to `pending`.
6. If attempts are exhausted, the row becomes `failed`.
7. Permanent listener failures write an `AuditLog` row.

Retries happen only on later `DomainEventDispatcher.wake()` calls. There is no
scheduled retry loop in v1.

Concurrency control is intentionally simple:

- The dispatcher fetches candidate rows.
- Each row is claimed with a conditional `updateMany`.
- A row can be reclaimed if it was stuck in `processing` with `lockedAt` older
  than the stale lock threshold.

## Adding A New Domain Event

Use this sequence when adding a new tracked fulfillment fact:

1. Add or extend the Zod event schema in
   `src/schemas/domain-events.schemas.ts`.
2. Export the inferred type through `src/shared/common/domain-events.types.ts`
   if a new shared type is needed.
3. Publish the domain event from the domain service with
   `DomainEventPublisher.publish()` or `publishMany()` inside the business
   transaction.
4. Call `DomainEventDispatcher.wake()` only after the transaction commits.
5. Add the event type to the `supportedEventTypes` set in
   `tracking-domain-event.listener.ts` if the tracking listener should handle
   it.
6. Add a mapping in `mapDomainEventToTrackingCommands()`.
7. Add a new `CartItemTrackingEventType` enum value in Prisma if the tracking
   event type is new.
8. Add or update projection evidence checks in `TrackingStatusProjector` if the
   tracking event changes `CartItem.fulfillmentStatus`.
9. Add timeline labels in `TrackingEventService` if the event should be readable
   to users/admins.
10. Regenerate Prisma client after schema changes.

Do not add a direct `db.cartItemTrackingEvent.*` write in the producer.

## Boundary Checklist

Before merging tracking-related changes, verify:

- Domain services publish domain events, not tracking instructions.
- Business mutation and outbox insert happen in the same transaction.
- `DomainEventDispatcher.wake()` runs after commit.
- No cron, polling loop, background interval, scheduled worker, or external
  queue was introduced.
- Runtime `CartItemTrackingEvent` writes remain inside
  `src/server/services/tracking/`.
- New event payloads are JSON-safe and decimal-safe.
- New tracking events have deterministic `eventKey` values.
- Fulfillment status projection verifies detailed evidence first.
- User timeline output remains redacted.
- Admin timeline output remains complete.

## Current Limitations

- There is no autonomous worker. Stuck pending events require a later
  application operation to call `DomainEventDispatcher.wake()`.
- Retry delay constants from the broader plan are not implemented as timers in
  v1 because there is no scheduler.
- Listener ordering is registration order.
- Listener fan-out is currently small and synchronous within a wake batch.
- Manual database migrations are still required for schema changes. This
  implementation updates Prisma schema/client only.
