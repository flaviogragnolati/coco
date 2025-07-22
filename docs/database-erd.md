# Database Entity Relationship Diagram

```mermaid
erDiagram
    User {
        String id PK
        String name
        String email UK
        DateTime emailVerified
        String image
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
    }

    Account {
        String id PK
        String type
        String provider
        String providerAccountId
        String refresh_token
        String access_token
        Int expires_at
        String token_type
        String scope
        String id_token
        String session_state
        Int refresh_token_expires_in
        String userId FK
    }

    Session {
        String id PK
        String sessionToken UK
        String userId FK
        DateTime expires
    }

    VerificationToken {
        String identifier
        String token UK
        DateTime expires
    }

    Role {
        Int id PK
        RoleType type
        String name UK
        String description
        Json rules
        DateTime createdAt
        DateTime updatedAt
        String userId FK
    }

    Address {
        Int id PK
        AddressType type
        String fullAddress
        String street
        String number
        String city
        String state
        String postalCode
        String country
        DateTime createdAt
        DateTime updatedAt
        String userId FK
        Int supplierId FK
    }

    Supplier {
        Int id PK
        String name
        String description
        String image
        DateTime createdAt
        DateTime updatedAt
    }

    Product {
        Int id PK
        String name
        String description
        String image
        Float price
        Float moq
        String unit
        DateTime createdAt
        DateTime updatedAt
        Int cartId FK
    }

    Cart {
        Int id PK
        CartStatus status
        Float total
        DateTime createdAt
        DateTime updatedAt
        String userId FK
        Int orderId FK
    }

    Order {
        Int id PK
        Float total
        OrderStatus status
        DateTime createdAt
        DateTime updatedAt
        Int shipmentId FK
    }

    Shipment {
        Int id PK
        String trackingId
        String carrier
        ShipmentStatus status
        DateTime createdAt
        DateTime updatedAt
        Int addressId FK
    }

    Payment {
        Int id PK
        Float amount
        PaymentStatus status
        DateTime createdAt
        DateTime updatedAt
        Int cartId FK
    }

    Event {
        Int id PK
        String name
        String description
        DateTime date
        String location
        DateTime createdAt
        DateTime updatedAt
        String userId FK
    }

    Notification {
        Int id PK
        String message
        NotificationType type
        NotificationStatus status
        DateTime scheduledAt
        DateTime createdAt
        DateTime updatedAt
        String userId FK
        Int channelId FK
    }

    Channel {
        Int id PK
        ChannelType type
        String name
        String description
        DateTime createdAt
        DateTime updatedAt
    }

    %% Relationships
    User ||--o{ Account : "has"
    User ||--o{ Session : "has"
    User ||--o{ Role : "has"
    User ||--o{ Address : "has"
    User ||--o{ Cart : "owns"
    User ||--o{ Event : "creates"
    User ||--o{ Notification : "receives"

    Supplier ||--o{ Address : "has"

    Cart ||--o{ Product : "contains"
    Cart ||--o{ Payment : "has"
    Cart }o--|| Order : "belongs_to"

    Order }o--|| Shipment : "shipped_via"

    Shipment }o--|| Address : "delivered_to"

    Notification }o--|| Channel : "sent_via"
```

## Enums

### RoleType
- ADMIN
- USER
- ALLY (FRACTIONATOR + PICKER)
- FRACTIONATOR
- PICKER
- SUPPLIER
- CARRIER

### AddressType
- HOME
- WORK
- SHIPPING
- BILLING
- FRACTIONING

### CartStatus
- ACTIVE
- CHECKED_OUT
- ABANDONED

### OrderStatus
- DRAFT
- PAYMENT_PENDING
- COMPLETED
- CANCELLED_BY_USER
- CANCELLED_BY_ADMIN
- CANCELLED_BY_TIMEOUT
- PAYMENT_FAILED
- REFUNDED

### ShipmentStatus
- PENDING
- SHIPPED
- DELIVERED
- RETURNED

### PaymentStatus
- PENDING
- COMPLETED
- FAILED

### NotificationType
- INFO
- WARNING
- ERROR
- SUCCESS

### NotificationStatus
- PENDING
- SENT
- READ
- FAILED
- RETRY

### ChannelType
- EMAIL
- SMS
- PUSH
- IN_APP
- WHATSAPP

## Key Relationships

1. **User Management**: Users have accounts, sessions, roles, and addresses
2. **E-commerce Flow**: Users create carts → carts become orders → orders are shipped
3. **Product Management**: Products belong to carts
4. **Payment Processing**: Carts have associated payments
5. **Shipping**: Orders are shipped via shipments to specific addresses
6. **Notifications**: Users receive notifications through various channels
7. **Events**: Users can create and manage events
8. **Suppliers**: Have addresses and supply products (relationship implied)

## Notes

- The schema includes authentication models (Account, Session, VerificationToken) likely for NextAuth.js
- Cart and Order have a one-to-many relationship (one order can contain multiple carts)
- Address entities can belong to either users or suppliers
- The notification system supports multiple delivery channels
