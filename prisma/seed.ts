import "dotenv/config";
import {
  PrismaClient,
  RoleType,
  AddressType,
  CartStatus,
  ShipmentStatus,
  PaymentStatus,
  LotStatus,
  PackageStatus,
  NotificationType,
  NotificationStatus,
  ChannelType,
} from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

console.log("@@@@@@@@@@ Starting seed script...");
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

console.log("@@@@@@@@@@ Connecting to database...", process.env.DATABASE_URL);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean database in FK-safe order before seeding
  console.log("🧹 Cleaning database...");

  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();

  await prisma.shipmentPayment.deleteMany();
  await prisma.shipmentPackage.deleteMany();
  await prisma.package.deleteMany();
  await prisma.lotPayment.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.userPayment.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();

  await prisma.productRating.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();

  await prisma.carrierRate.deleteMany();
  await prisma.carrierRoutes.deleteMany();
  await prisma.carrier.deleteMany();

  await prisma.address.deleteMany();
  await prisma.role.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.channel.deleteMany();

  console.log("✅ Database cleaned");

  // 1) Channels
  const [whatsappChannel, emailChannel] = await Promise.all([
    prisma.channel.create({
      data: {
        type: ChannelType.WHATSAPP,
        name: "WhatsApp default",
        description: "Primary WhatsApp channel",
        token: "whatsapp-api-token-dev",
      },
    }),
    prisma.channel.create({
      data: {
        type: ChannelType.EMAIL,
        name: "Email default",
        description: "Transactional email channel",
        token: "email-api-token-dev",
      },
    }),
  ]);

  // 2) Users
  const [buyer1, buyer2, buyer3, supplierUser1, supplierUser2, carrierUser] =
    await Promise.all([
      prisma.user.create({
        data: {
          name: "Juan Pérez",
          email: "buyer1@example.com",
          phone: "+54 9 2901 111111",
          taxId: "20-11111111-3",
          taxType: "CUIT",
        },
      }),
      prisma.user.create({
        data: {
          name: "María González",
          email: "buyer2@example.com",
          phone: "+54 9 2901 222222",
          taxId: "27-22222222-4",
          taxType: "CUIT",
        },
      }),
      prisma.user.create({
        data: {
          name: "Carlos Rodríguez",
          email: "buyer3@example.com",
          phone: "+54 9 2901 333333",
          taxId: "20-33333333-5",
          taxType: "CUIT",
        },
      }),
      prisma.user.create({
        data: {
          name: "Supplier Admin - Mayorista Sur",
          email: "supplier1@example.com",
          phone: "+54 9 2901 444444",
          taxId: "30-44444444-6",
          taxType: "CUIT",
        },
      }),
      prisma.user.create({
        data: {
          name: "Supplier Admin - Fresh Valley",
          email: "supplier2@example.com",
          phone: "+54 9 2901 555555",
          taxId: "30-55555555-7",
          taxType: "CUIT",
        },
      }),
      prisma.user.create({
        data: {
          name: "Carrier Admin",
          email: "carrier@example.com",
          phone: "+54 9 2901 666666",
          taxId: "30-66666666-8",
          taxType: "CUIT",
        },
      }),
    ]);

  // 3) User settings
  await Promise.all([
    prisma.userSettings.create({
      data: {
        userId: buyer1.id,
        notificationsEnabled: true,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId: buyer2.id,
        notificationsEnabled: true,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId: buyer3.id,
        notificationsEnabled: true,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId: supplierUser1.id,
        notificationsEnabled: true,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId: supplierUser2.id,
        notificationsEnabled: true,
      },
    }),
    prisma.userSettings.create({
      data: {
        userId: carrierUser.id,
        notificationsEnabled: true,
      },
    }),
  ]);

  // 4) Roles
  await Promise.all([
    prisma.role.create({
      data: {
        type: RoleType.BUYER,
        name: "buyer",
        description: "End user who buys in collaborative carts",
        userId: buyer1.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.BUYER,
        name: "buyer",
        description: "End user who buys in collaborative carts",
        userId: buyer2.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.BUYER,
        name: "buyer",
        description: "End user who buys in collaborative carts",
        userId: buyer3.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.SUPPLIER,
        name: "supplier",
        description: "Wholesale supplier admin",
        userId: supplierUser1.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.SUPPLIER,
        name: "supplier",
        description: "Wholesale supplier admin",
        userId: supplierUser2.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.CARRIER,
        name: "carrier",
        description: "Carrier / logistics admin",
        userId: carrierUser.id,
      },
    }),
  ]);

  // 5) Addresses (user, supplier, carrier)
  const [buyer1Address, buyer2Address, buyer3Address] = await Promise.all([
    prisma.address.create({
      data: {
        type: AddressType.SHIPPING,
        fullAddress:
          "Av. Siempre Viva 742, Ushuaia, Tierra del Fuego, Argentina",
        street: "Av. Siempre Viva",
        number: "742",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Buyer 1 shipping address",
        userId: buyer1.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.SHIPPING,
        fullAddress: "Calle Maipú 850, Ushuaia, Tierra del Fuego, Argentina",
        street: "Calle Maipú",
        number: "850",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Buyer 2 shipping address",
        userId: buyer2.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.SHIPPING,
        fullAddress:
          "Av. San Martín 1234, Ushuaia, Tierra del Fuego, Argentina",
        street: "Av. San Martín",
        number: "1234",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Buyer 3 shipping address",
        userId: buyer3.id,
      },
    }),
  ]);

  // 6) Carrier + routes + rates
  const [carrier1, carrier2] = await Promise.all([
    prisma.carrier.create({
      data: {
        name: "Fueguina Logistics",
        description: "Local carrier for Tierra del Fuego",
        phone: "+54 9 2901 444444",
        email: "logistics@fueguina.com",
        taxId: "30-77777777-9",
        taxType: "CUIT",
        contactName: "Juan Perez",
        contactPhone: "+54 9 2901 555555",
        contactEmail: "juan.perez@fueguina.com",
        addresses: {
          create: [
            {
              type: AddressType.CARRIER,
              fullAddress: "Depósito Ruta 3 km 5, Ushuaia",
              street: "Ruta 3",
              number: "km 5",
              city: "Ushuaia",
              state: "Tierra del Fuego",
              postalCode: "9410",
              country: "AR",
              description: "Main depot",
            },
          ],
        },
      },
      include: { addresses: true },
    }),
    prisma.carrier.create({
      data: {
        name: "Expreso Patagónico",
        description: "Regional carrier for Patagonia",
        phone: "+54 11 4444 9999",
        email: "contact@expresopat.com",
        taxId: "30-88888888-0",
        taxType: "CUIT",
        contactName: "Laura Martinez",
        contactPhone: "+54 11 5555 0000",
        contactEmail: "laura.martinez@expresopat.com",
        addresses: {
          create: [
            {
              type: AddressType.CARRIER,
              fullAddress: "Centro Logístico Av. Rivadavia 5000, Buenos Aires",
              street: "Av. Rivadavia",
              number: "5000",
              city: "Buenos Aires",
              state: "Buenos Aires",
              postalCode: "1424",
              country: "AR",
              description: "Central hub",
            },
          ],
        },
      },
      include: { addresses: true },
    }),
  ]);

  const [route1, route2] = await Promise.all([
    prisma.carrierRoutes.create({
      data: {
        name: "Ushuaia City Route",
        description: "Last-mile delivery inside Ushuaia",
        origin: "Deposito Ushuaia",
        destination: "Zona urbana Ushuaia",
        distance: 25,
        duration: 1, // days
        price: 3500,
        carrierId: carrier1.id,
      },
    }),
    prisma.carrierRoutes.create({
      data: {
        name: "Buenos Aires - Ushuaia",
        description: "Long haul from BA to Ushuaia",
        origin: "Buenos Aires Hub",
        destination: "Ushuaia",
        distance: 3100,
        duration: 5, // days
        price: 25000,
        carrierId: carrier2.id,
      },
    }),
  ]);

  await Promise.all([
    prisma.carrierRate.create({
      data: {
        name: "Standard local rate",
        description: "Rate for shipments up to 20kg inside Ushuaia",
        volumetricMoq: 0.1,
        volumetricRate: 10000,
        weightMoq: 1,
        weightRate: 500,
        rate: 3500,
        isFlatRate: true,
        isPerShipment: true,
        isActive: true,
        carrierId: carrier1.id,
        routes: {
          connect: [{ id: route1.id }],
        },
      },
    }),
    prisma.carrierRate.create({
      data: {
        name: "Long haul rate",
        description: "Rate for long distance shipments",
        volumetricMoq: 0.5,
        volumetricRate: 50000,
        weightMoq: 5,
        weightRate: 3000,
        rate: 25000,
        isFlatRate: false,
        isPerShipment: true,
        isActive: true,
        carrierId: carrier2.id,
        routes: {
          connect: [{ id: route2.id }],
        },
      },
    }),
  ]);

  // 7) Suppliers
  const [supplier1, supplier2] = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Mayorista Sur",
        description: "Mayorista de productos de limpieza y consumo masivo",
        phone: "+54 11 4444 7777",
        email: "ventas@mayoristasur.com",
        website: "https://mayoristasur.example.com",
        taxId: "30-99999999-1",
        taxType: "CUIT",
        contactName: "Ana Lopez",
        contactPhone: "+54 11 5555 8888",
        contactEmail: "ana.lopez@mayoristasur.com",
        pickupPolicy:
          "Retiro en depósito Lunes a Viernes 9-17hs. Preparación de pedido 48hs.",
        addresses: {
          create: [
            {
              type: AddressType.SUPPLIER,
              fullAddress:
                "Depósito Mayorista Sur, Av. Industrial 1234, Buenos Aires",
              street: "Av. Industrial",
              number: "1234",
              city: "Buenos Aires",
              state: "Buenos Aires",
              postalCode: "1000",
              country: "AR",
              description: "Depósito central mayorista",
            },
          ],
        },
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Fresh Valley Farms",
        description: "Productos frescos y alimentos orgánicos al por mayor",
        phone: "+54 11 6666 1111",
        email: "ventas@freshvalley.com",
        website: "https://freshvalley.example.com",
        taxId: "30-10101010-2",
        taxType: "CUIT",
        contactName: "Roberto Silva",
        contactPhone: "+54 11 6666 2222",
        contactEmail: "roberto.silva@freshvalley.com",
        pickupPolicy:
          "Retiro en depósito refrigerado. Horarios: Lunes a Sábado 8-16hs. Pedido mínimo 24hs anticipación.",
        addresses: {
          create: [
            {
              type: AddressType.SUPPLIER,
              fullAddress:
                "Centro de Distribución Fresh Valley, Ruta 8 km 45, Pilar, Buenos Aires",
              street: "Ruta 8",
              number: "km 45",
              city: "Pilar",
              state: "Buenos Aires",
              postalCode: "1629",
              country: "AR",
              description: "Centro de distribución refrigerado",
            },
          ],
        },
      },
    }),
  ]);

  // 8) Categories & brands
  const [categoryCleaning, categoryBeverages, categoryFresh, categoryDairy] =
    await Promise.all([
      prisma.category.create({
        data: {
          name: "Limpieza",
          tags: ["limpieza", "hogar", "higiene"],
          description: "Productos de limpieza y desinfección",
        },
      }),
      prisma.category.create({
        data: {
          name: "Bebidas",
          tags: ["bebidas", "gaseosas", "jugos"],
          description: "Bebidas varias en formato mayorista",
        },
      }),
      prisma.category.create({
        data: {
          name: "Frescos",
          tags: ["frescos", "verduras", "frutas", "carnes"],
          description: "Productos frescos refrigerados",
        },
      }),
      prisma.category.create({
        data: {
          name: "Lácteos",
          tags: ["lácteos", "leche", "quesos", "yogurt"],
          description: "Productos lácteos refrigerados",
        },
      }),
    ]);

  const [brandGeneric, brandSpark, brandFreshValley, brandDairyPremium] =
    await Promise.all([
      prisma.brand.create({
        data: {
          name: "Genérico Mayorista",
          description: "Marca blanca para productos de limpieza",
        },
      }),
      prisma.brand.create({
        data: {
          name: "Spark Cola",
          description: "Marca de gaseosas cola",
        },
      }),
      prisma.brand.create({
        data: {
          name: "Fresh Valley",
          description: "Marca de productos frescos orgánicos",
        },
      }),
      prisma.brand.create({
        data: {
          name: "Dairy Premium",
          description: "Lácteos premium",
        },
      }),
    ]);

  // 9) Products
  const [
    cleaningProduct1,
    cleaningProduct2,
    beverageProduct1,
    beverageProduct2,
    freshProduct1,
    freshProduct2,
    dairyProduct1,
    dairyProduct2,
  ] = await Promise.all([
    // Cleaning products from Mayorista Sur
    prisma.product.create({
      data: {
        name: "Detergente concentrado x5L",
        description:
          "Detergente líquido concentrado para uso general, bidón 5L.",
        searchTags: ["detergente", "limpieza", "cocina"],
        publicTags: ["detergente", "concentrado"],
        code: "DET-5L-001",
        supplierCode: "MS-DET-5L-001",
        supplierUrl: "https://mayoristasur.example.com/detergente-5l",
        images: [
          "https://dummyimage.com/600x400/00a/ffffff&text=Detergente+5L",
        ],
        currency: "ARS",
        price: 4500,
        priceUnit: "BIDON_5L",
        supplierMoq: 20,
        supplierUnit: "BIDON_5L",
        customerMoq: 1,
        customerUnit: "BIDON_5L",
        publicPrice: 5500,
        publicPriceUnit: "BIDON_5L",
        minFractionPerUser: 1,
        brandId: brandGeneric.id,
        categoryId: categoryCleaning.id,
        supplierId: supplier1.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Desinfectante multiusos x20L",
        description: "Desinfectante industrial en bidón de 20 litros.",
        searchTags: ["desinfectante", "limpieza", "industrial"],
        publicTags: ["desinfectante", "industrial"],
        code: "DES-20L-001",
        supplierCode: "MS-DES-20L-001",
        supplierUrl: "https://mayoristasur.example.com/desinfectante-20l",
        images: [
          "https://dummyimage.com/600x400/0a0/ffffff&text=Desinfectante+20L",
        ],
        currency: "ARS",
        price: 15000,
        priceUnit: "BIDON_20L",
        supplierMoq: 10,
        supplierUnit: "BIDON_20L",
        customerMoq: 1,
        customerUnit: "BIDON_20L",
        publicPrice: 18000,
        publicPriceUnit: "BIDON_20L",
        minFractionPerUser: 1,
        brandId: brandGeneric.id,
        categoryId: categoryCleaning.id,
        supplierId: supplier1.id,
      },
    }),
    // Beverage products from Mayorista Sur
    prisma.product.create({
      data: {
        name: "Gaseosa cola x2.25L (pack x6)",
        description: "Pack mayorista de 6 botellas de 2.25L de cola.",
        searchTags: ["gaseosa", "cola", "bebidas"],
        publicTags: ["pack", "gaseosa"],
        code: "COLA-2.25-006",
        supplierCode: "MS-COLA-2.25-006",
        supplierUrl: "https://mayoristasur.example.com/cola-pack",
        images: ["https://dummyimage.com/600x400/a00/ffffff&text=Cola+Pack+6"],
        currency: "ARS",
        price: 7200,
        priceUnit: "PACK_6",
        supplierMoq: 10,
        supplierUnit: "PACK_6",
        customerMoq: 1,
        customerUnit: "PACK_6",
        publicPrice: 8600,
        publicPriceUnit: "PACK_6",
        minFractionPerUser: 1,
        brandId: brandSpark.id,
        categoryId: categoryBeverages.id,
        supplierId: supplier1.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Agua mineral x500ml (pack x24)",
        description: "Caja con 24 botellas de agua mineral sin gas.",
        searchTags: ["agua", "mineral", "bebidas"],
        publicTags: ["agua", "pack"],
        code: "AGUA-500-024",
        supplierCode: "MS-AGUA-500-024",
        supplierUrl: "https://mayoristasur.example.com/agua-pack",
        images: ["https://dummyimage.com/600x400/00f/ffffff&text=Agua+24+Pack"],
        currency: "ARS",
        price: 6500,
        priceUnit: "CAJA_24",
        supplierMoq: 15,
        supplierUnit: "CAJA_24",
        customerMoq: 1,
        customerUnit: "CAJA_24",
        publicPrice: 7800,
        publicPriceUnit: "CAJA_24",
        minFractionPerUser: 1,
        brandId: brandGeneric.id,
        categoryId: categoryBeverages.id,
        supplierId: supplier1.id,
      },
    }),
    // Fresh products from Fresh Valley Farms
    prisma.product.create({
      data: {
        name: "Mix verduras estacionales x10kg",
        description:
          "Caja de verduras orgánicas de estación. Variedad según disponibilidad.",
        searchTags: ["verduras", "orgánico", "fresh"],
        publicTags: ["orgánico", "verduras"],
        code: "VERD-MIX-010",
        supplierCode: "FV-VERD-MIX-010",
        supplierUrl: "https://freshvalley.example.com/verduras-mix",
        images: ["https://dummyimage.com/600x400/0a0/ffffff&text=Verduras+Mix"],
        currency: "ARS",
        price: 12000,
        priceUnit: "CAJA_10KG",
        supplierMoq: 8,
        supplierUnit: "CAJA_10KG",
        customerMoq: 1,
        customerUnit: "CAJA_10KG",
        publicPrice: 15000,
        publicPriceUnit: "CAJA_10KG",
        minFractionPerUser: 1,
        brandId: brandFreshValley.id,
        categoryId: categoryFresh.id,
        supplierId: supplier2.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Frutas cítricas x15kg",
        description:
          "Caja con naranjas, mandarinas y limones. Origen: Tucumán.",
        searchTags: ["frutas", "cítricos", "naranjas", "limones"],
        publicTags: ["frutas", "cítricos"],
        code: "FRUT-CIT-015",
        supplierCode: "FV-FRUT-CIT-015",
        supplierUrl: "https://freshvalley.example.com/citricos",
        images: ["https://dummyimage.com/600x400/fa0/ffffff&text=Citricos"],
        currency: "ARS",
        price: 18000,
        priceUnit: "CAJA_15KG",
        supplierMoq: 6,
        supplierUnit: "CAJA_15KG",
        customerMoq: 1,
        customerUnit: "CAJA_15KG",
        publicPrice: 22000,
        publicPriceUnit: "CAJA_15KG",
        minFractionPerUser: 1,
        brandId: brandFreshValley.id,
        categoryId: categoryFresh.id,
        supplierId: supplier2.id,
      },
    }),
    // Dairy products from Fresh Valley Farms
    prisma.product.create({
      data: {
        name: "Leche entera x12L (pack x12 de 1L)",
        description: "Pack de 12 litros de leche entera pasteurizada.",
        searchTags: ["leche", "lácteos", "entera"],
        publicTags: ["leche", "pack"],
        code: "LECH-ENT-012",
        supplierCode: "FV-LECH-ENT-012",
        supplierUrl: "https://freshvalley.example.com/leche",
        images: ["https://dummyimage.com/600x400/fff/000&text=Leche+Pack"],
        currency: "ARS",
        price: 9600,
        priceUnit: "PACK_12L",
        supplierMoq: 12,
        supplierUnit: "PACK_12L",
        customerMoq: 1,
        customerUnit: "PACK_12L",
        publicPrice: 11500,
        publicPriceUnit: "PACK_12L",
        minFractionPerUser: 1,
        brandId: brandDairyPremium.id,
        categoryId: categoryDairy.id,
        supplierId: supplier2.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Queso mozzarella x5kg (barra)",
        description: "Barra de queso mozzarella para pizzería.",
        searchTags: ["queso", "mozzarella", "lácteos"],
        publicTags: ["queso", "mozzarella"],
        code: "QUES-MOZ-005",
        supplierCode: "FV-QUES-MOZ-005",
        supplierUrl: "https://freshvalley.example.com/queso-mozzarella",
        images: ["https://dummyimage.com/600x400/ff0/000&text=Mozzarella"],
        currency: "ARS",
        price: 25000,
        priceUnit: "BARRA_5KG",
        supplierMoq: 4,
        supplierUnit: "BARRA_5KG",
        customerMoq: 1,
        customerUnit: "BARRA_5KG",
        publicPrice: 30000,
        publicPriceUnit: "BARRA_5KG",
        minFractionPerUser: 1,
        brandId: brandDairyPremium.id,
        categoryId: categoryDairy.id,
        supplierId: supplier2.id,
      },
    }),
  ]);

  // 10) Multiple carts with different statuses demonstrating full workflow

  // Cart 1: COMPLETED (buyer1) - Full flow completed
  const cart1 = await prisma.cart.create({
    data: {
      status: CartStatus.COMPLETED,
      userId: buyer1.id,
      addressId: buyer1Address.id,
      items: {
        create: [
          {
            quantity: 3,
            unit: cleaningProduct1.customerUnit,
            price: cleaningProduct1.price,
            publicPrice: cleaningProduct1.publicPrice,
            productSnapshot: JSON.stringify(cleaningProduct1),
            product: { connect: { id: cleaningProduct1.id } },
          },
          {
            quantity: 2,
            unit: beverageProduct1.customerUnit,
            price: beverageProduct1.price,
            publicPrice: beverageProduct1.publicPrice,
            productSnapshot: JSON.stringify(beverageProduct1),
            product: { connect: { id: beverageProduct1.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  // Cart 2: PENDING_PAYMENT (buyer2) - Awaiting payment
  const cart2 = await prisma.cart.create({
    data: {
      status: CartStatus.PENDING_PAYMENT,
      userId: buyer2.id,
      addressId: buyer2Address.id,
      items: {
        create: [
          {
            quantity: 5,
            unit: freshProduct1.customerUnit,
            price: freshProduct1.price,
            publicPrice: freshProduct1.publicPrice,
            productSnapshot: JSON.stringify(freshProduct1),
            product: { connect: { id: freshProduct1.id } },
          },
          {
            quantity: 2,
            unit: dairyProduct1.customerUnit,
            price: dairyProduct1.price,
            publicPrice: dairyProduct1.publicPrice,
            productSnapshot: JSON.stringify(dairyProduct1),
            product: { connect: { id: dairyProduct1.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  // Cart 3: DRAFT (buyer3) - Still being built
  const cart3 = await prisma.cart.create({
    data: {
      status: CartStatus.DRAFT,
      userId: buyer3.id,
      addressId: buyer3Address.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: cleaningProduct2.customerUnit,
            price: cleaningProduct2.price,
            publicPrice: cleaningProduct2.publicPrice,
            productSnapshot: JSON.stringify(cleaningProduct2),
            product: { connect: { id: cleaningProduct2.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  // Cart 4: COMPLETED (buyer1) - Another cart from different supplier
  const cart4 = await prisma.cart.create({
    data: {
      status: CartStatus.COMPLETED,
      userId: buyer1.id,
      addressId: buyer1Address.id,
      items: {
        create: [
          {
            quantity: 4,
            unit: freshProduct2.customerUnit,
            price: freshProduct2.price,
            publicPrice: freshProduct2.publicPrice,
            productSnapshot: JSON.stringify(freshProduct2),
            product: { connect: { id: freshProduct2.id } },
          },
          {
            quantity: 2,
            unit: dairyProduct2.customerUnit,
            price: dairyProduct2.price,
            publicPrice: dairyProduct2.publicPrice,
            productSnapshot: JSON.stringify(dairyProduct2),
            product: { connect: { id: dairyProduct2.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  // Cart 5: PENDING_PAYMENT (buyer2) - Mixed products from supplier1
  const cart5 = await prisma.cart.create({
    data: {
      status: CartStatus.PENDING_PAYMENT,
      userId: buyer2.id,
      addressId: buyer2Address.id,
      items: {
        create: [
          {
            quantity: 2,
            unit: beverageProduct2.customerUnit,
            price: beverageProduct2.price,
            publicPrice: beverageProduct2.publicPrice,
            productSnapshot: JSON.stringify(beverageProduct2),
            product: { connect: { id: beverageProduct2.id } },
          },
          {
            quantity: 3,
            unit: cleaningProduct1.customerUnit,
            price: cleaningProduct1.price,
            publicPrice: cleaningProduct1.publicPrice,
            productSnapshot: JSON.stringify(cleaningProduct1),
            product: { connect: { id: cleaningProduct1.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  // 11) Lots from completed carts - grouping by supplier
  const scheduledAt1 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const scheduledAt2 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

  // Lot 1: CONFIRMED_BY_PROVIDER (from cart1 - supplier1)
  const lot1 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0001",
      status: LotStatus.CONFIRMED_BY_PROVIDER,
      scheduledAt: scheduledAt1,
      consolidatedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
      orderSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      confirmedAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
      supplierId: supplier1.id,
      items: {
        connect: cart1.items.map((item) => ({ id: item.id })),
      },
    },
  });

  // Lot 2: PACKAGED (from cart4 - supplier2)
  const lot2 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0002",
      status: LotStatus.PACKAGED,
      scheduledAt: scheduledAt2,
      consolidatedAt: new Date(Date.now() - 0.8 * 24 * 60 * 60 * 1000),
      orderSentAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
      confirmedAt: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000),
      supplierId: supplier2.id,
      items: {
        connect: cart4.items.map((item) => ({ id: item.id })),
      },
    },
  });

  // Lot 3: READY_TO_ORDER (pending lots from cart2 items - supplier2)
  const lot3 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0003",
      status: LotStatus.READY_TO_ORDER,
      scheduledAt: new Date(),
      consolidatedAt: new Date(),
      supplierId: supplier2.id,
      items: {
        connect: cart2.items.map((item) => ({ id: item.id })),
      },
    },
  });

  // Lot 4: PENDING (from cart5 - supplier1)
  const lot4 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0004",
      status: LotStatus.PENDING,
      scheduledAt: new Date(),
      supplierId: supplier1.id,
      items: {
        connect: cart5.items.map((item) => ({ id: item.id })),
      },
    },
  });

  // 12) Packages from lots
  // Packages from lot1 (CONFIRMED) - ready for pickup
  const pkg1 = await prisma.package.create({
    data: {
      status: PackageStatus.READY_FOR_PICKUP,
      trackingId: "PKG-2025-0001",
      weight: 32.5,
      volume: 0.18,
      lotId: lot1.id,
    },
  });

  const pkg2 = await prisma.package.create({
    data: {
      status: PackageStatus.READY_FOR_PICKUP,
      trackingId: "PKG-2025-0002",
      weight: 18.0,
      volume: 0.12,
      lotId: lot1.id,
    },
  });

  // Packages from lot2 (PACKAGED) - in transit
  const pkg3 = await prisma.package.create({
    data: {
      status: PackageStatus.IN_TRANSIT,
      trackingId: "PKG-2025-0003",
      weight: 45.0,
      volume: 0.25,
      lotId: lot2.id,
    },
  });

  const pkg4 = await prisma.package.create({
    data: {
      status: PackageStatus.IN_TRANSIT,
      trackingId: "PKG-2025-0004",
      weight: 30.0,
      volume: 0.15,
      lotId: lot2.id,
    },
  });

  // Package from lot3 - just created
  const pkg5 = await prisma.package.create({
    data: {
      status: PackageStatus.CREATED,
      trackingId: "PKG-2025-0005",
      weight: 25.0,
      volume: 0.1,
      lotId: lot3.id,
    },
  });

  // 13) Shipments carrying packages
  // Shipment 1: IN_TRANSIT with packages from lot1
  const shipment1 = await prisma.shipment.create({
    data: {
      trackingId: "SHIP-2025-0001",
      carrierName: carrier1.name,
      status: ShipmentStatus.IN_TRANSIT,
      startedAt: new Date(Date.now() - 0.3 * 24 * 60 * 60 * 1000),
      eta: new Date(Date.now() + 0.5 * 24 * 60 * 60 * 1000),
      addressId: buyer1Address.id,
      carrierId: carrier1.id,
      packages: {
        create: [
          { package: { connect: { id: pkg1.id } } },
          { package: { connect: { id: pkg2.id } } },
        ],
      },
    },
  });

  // Shipment 2: ARRIVED with packages from lot2
  const shipment2 = await prisma.shipment.create({
    data: {
      trackingId: "SHIP-2025-0002",
      carrierName: carrier2.name,
      status: ShipmentStatus.ARRIVED,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      arrivedAt: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000),
      eta: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000),
      addressId: buyer1Address.id,
      carrierId: carrier2.id,
      packages: {
        create: [
          { package: { connect: { id: pkg3.id } } },
          { package: { connect: { id: pkg4.id } } },
        ],
      },
    },
  });

  // Shipment 3: ASSEMBLING (ready to ship pkg5)
  const shipment3 = await prisma.shipment.create({
    data: {
      trackingId: "SHIP-2025-0003",
      carrierName: carrier1.name,
      status: ShipmentStatus.ASSEMBLING,
      eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      addressId: buyer2Address.id,
      carrierId: carrier1.id,
      packages: {
        create: [{ package: { connect: { id: pkg5.id } } }],
      },
    },
  });

  // 14) Payments for carts, lots, and shipments
  await Promise.all([
    // Cart payments
    prisma.userPayment.create({
      data: {
        amount: cart1.items.reduce(
          (sum, item) => sum + item.publicPrice * item.quantity,
          0,
        ),
        status: PaymentStatus.COMPLETED,
        cartId: cart1.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: cart2.items.reduce(
          (sum, item) => sum + item.publicPrice * item.quantity,
          0,
        ),
        status: PaymentStatus.PENDING,
        cartId: cart2.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: cart4.items.reduce(
          (sum, item) => sum + item.publicPrice * item.quantity,
          0,
        ),
        status: PaymentStatus.COMPLETED,
        cartId: cart4.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: cart5.items.reduce(
          (sum, item) => sum + item.publicPrice * item.quantity,
          0,
        ),
        status: PaymentStatus.PENDING,
        cartId: cart5.id,
      },
    }),
    // Lot payments
    prisma.lotPayment.create({
      data: {
        amount: cart1.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        status: PaymentStatus.COMPLETED,
        lotId: lot1.id,
      },
    }),
    prisma.lotPayment.create({
      data: {
        amount: cart4.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        status: PaymentStatus.COMPLETED,
        lotId: lot2.id,
      },
    }),
    prisma.lotPayment.create({
      data: {
        amount: cart2.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        status: PaymentStatus.PENDING,
        lotId: lot3.id,
      },
    }),
    prisma.lotPayment.create({
      data: {
        amount: cart5.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        status: PaymentStatus.PENDING,
        lotId: lot4.id,
      },
    }),
    // Shipment payments
    prisma.shipmentPayment.create({
      data: {
        amount: 3500,
        status: PaymentStatus.COMPLETED,
        shipmentId: shipment1.id,
      },
    }),
    prisma.shipmentPayment.create({
      data: {
        amount: 25000,
        status: PaymentStatus.COMPLETED,
        shipmentId: shipment2.id,
      },
    }),
    prisma.shipmentPayment.create({
      data: {
        amount: 3500,
        status: PaymentStatus.PENDING,
        shipmentId: shipment3.id,
      },
    }),
  ]);

  // 15) Product ratings, events, and notifications
  await Promise.all([
    prisma.productRating.create({
      data: {
        rating: 5,
        comment:
          "Muy buen detergente, rinde bastante y excelente precio mayorista.",
        userId: buyer1.id,
        productId: cleaningProduct1.id,
      },
    }),
    prisma.productRating.create({
      data: {
        rating: 4,
        comment: "Buenas verduras, frescas. Llegaron en perfecto estado.",
        userId: buyer2.id,
        productId: freshProduct1.id,
      },
    }),
    prisma.productRating.create({
      data: {
        rating: 5,
        comment: "Excelentes cítricos, muy jugosos.",
        userId: buyer1.id,
        productId: freshProduct2.id,
      },
    }),
  ]);

  await Promise.all([
    prisma.event.create({
      data: {
        name: "Primera compra colaborativa",
        description:
          "Primera compra mayorista colaborativa completada con éxito.",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        location: "Ushuaia",
        userId: buyer1.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Segundo pedido",
        description: "Segundo pedido de productos frescos.",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        location: "Ushuaia",
        userId: buyer1.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Primera compra",
        description: "Primera compra en la plataforma.",
        date: new Date(),
        location: "Ushuaia",
        userId: buyer2.id,
      },
    }),
  ]);

  await Promise.all([
    prisma.notification.create({
      data: {
        message:
          "Tu compra fue registrada. Estamos consolidando el lote con otros compradores.",
        type: NotificationType.INFO,
        status: NotificationStatus.SENT,
        userId: buyer1.id,
        channelId: whatsappChannel.id,
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.notification.create({
      data: {
        message:
          "Se generó un nuevo envío para tu pedido. Tracking: SHIP-2025-0001",
        type: NotificationType.INFO,
        status: NotificationStatus.SENT,
        userId: buyer1.id,
        channelId: emailChannel.id,
        scheduledAt: new Date(Date.now() - 0.3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.notification.create({
      data: {
        message:
          "Tu envío ha llegado al depósito local. Pronto estará en camino.",
        type: NotificationType.INFO,
        status: NotificationStatus.SENT,
        userId: buyer1.id,
        channelId: whatsappChannel.id,
        scheduledAt: new Date(Date.now() - 0.1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.notification.create({
      data: {
        message:
          "Tu pago está pendiente. Por favor completa el pago para continuar.",
        type: NotificationType.WARNING,
        status: NotificationStatus.PENDING,
        userId: buyer2.id,
        channelId: emailChannel.id,
        scheduledAt: new Date(),
      },
    }),
  ]);

  console.log("🌱 Seed completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
