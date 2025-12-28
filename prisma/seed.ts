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
  Unit,
} from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

console.log("@@@@@@@@@@ Starting seed script...");
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

let stepCounter = 0;
const logStep = (message: string) =>
  console.log(`➡️ [seed:${++stepCounter}] ${message}`);

console.log("@@@@@@@@@@ Connecting to database...", process.env.DATABASE_URL);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const productTemplate = (data: Record<string, any>) => ({
  currency: "ARS",
  priceUnitMultiplier: 1,
  supplierUnitMultiplier: 1,
  customerUnitMultiplier: 1,
  publicPriceMultiplier: 1,
  minFractionPerUser: 1,
  ...data,
});

async function main() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Clean database in FK-safe order before seeding
  console.log("🧹 Cleaning database...");

  logStep("Cleaning notifications, events, payments, shipments, lots, carts");
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();

  await prisma.shipmentPayment.deleteMany();
  await prisma.shipmentPackage.deleteMany();
  await prisma.package.deleteMany();
  await prisma.shipment.deleteMany();
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

  logStep("Cleaning carriers and related rates/routes");
  await prisma.carrierRate.deleteMany();
  await prisma.carrierRoutes.deleteMany();
  await prisma.carrier.deleteMany();

  logStep("Cleaning addresses, cards, roles, settings, accounts, users, channels");
  await prisma.address.deleteMany();
  await prisma.savedPaymentCard.deleteMany();
  await prisma.role.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.channel.deleteMany();

  console.log("✅ Database cleaned");

  // 1) Channels
  logStep("Creating channels");
  const [whatsappChannel, emailChannel, smsChannel, pushChannel] =
    await Promise.all([
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
      prisma.channel.create({
        data: {
          type: ChannelType.SMS,
          name: "SMS fallback",
          description: "Low priority SMS channel",
          token: "sms-api-token-dev",
        },
      }),
      prisma.channel.create({
        data: {
          type: ChannelType.PUSH,
          name: "Push notifications",
          description: "Mobile push channel",
          token: "push-api-token-dev",
        },
      }),
    ]);

  // 2) Users
  logStep("Creating users");
  const [
    adminUser,
    devAdminUser,
    cocoAdminUser,
    buyer1,
    buyer2,
    buyer3,
    supplierUser1,
    supplierUser2,
    carrierUser,
    allyUser,
    fractionatorUser,
    pickerUser,
  ] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@example.com",
        phone: "+54 9 2901 000000",
        taxId: "27-00000000-9",
        taxType: "CUIT",
      },
    }),
    prisma.user.create({
      data: {
        name: "Flavio Gragnolati",
        email: "gragnolatif@gmail.com",
        phone: "+54 9 11 1234 5678",
        taxId: "20-55559999-7",
        taxType: "CUIT",
      },
    }),
    prisma.user.create({
      data: {
        name: "Coco Dev Admin",
        email: "coco.dev@gmail.com",
        phone: "+54 9 11 0000 0000",
        taxId: "27-44443333-0",
        taxType: "CUIT",
      },
    }),
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
    prisma.user.create({
      data: {
        name: "Alianza Comunitaria",
        email: "ally@example.com",
        phone: "+54 9 2901 777777",
        taxId: "20-77777777-1",
        taxType: "CUIT",
      },
    }),
    prisma.user.create({
      data: {
        name: "Fraccionadora Sur",
        email: "fractionator@example.com",
        phone: "+54 9 2901 888888",
        taxId: "27-88888888-2",
        taxType: "CUIT",
      },
    }),
    prisma.user.create({
      data: {
        name: "Picker Express",
        email: "picker@example.com",
        phone: "+54 9 2901 999999",
        taxId: "27-99999999-3",
        taxType: "CUIT",
      },
    }),
  ]);

  // 3) User settings
  logStep("Creating user settings");
  await Promise.all(
    [
      adminUser,
      devAdminUser,
      cocoAdminUser,
      buyer1,
      buyer2,
      buyer3,
      supplierUser1,
      supplierUser2,
      carrierUser,
      allyUser,
      fractionatorUser,
      pickerUser,
    ].map((user) =>
      prisma.userSettings.create({
        data: {
          userId: user.id,
          notificationsEnabled: true,
        },
      }),
    ),
  );

  // 4) Roles
  logStep("Creating roles");
  await Promise.all([
    prisma.role.create({
      data: {
        type: RoleType.ADMIN,
        name: "admin",
        description: "Platform administrator",
        userId: adminUser.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.ADMIN,
        name: "admin",
        description: "Platform administrator (dev)",
        userId: devAdminUser.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.ADMIN,
        name: "admin",
        description: "Platform administrator (coco dev)",
        userId: cocoAdminUser.id,
      },
    }),
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
    prisma.role.create({
      data: {
        type: RoleType.ALLY,
        name: "ally",
        description: "Community ally to support logistics",
        userId: allyUser.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.FRACTIONATOR,
        name: "fractionator",
        description: "Handles bulk fractioning",
        userId: fractionatorUser.id,
      },
    }),
    prisma.role.create({
      data: {
        type: RoleType.PICKER,
        name: "picker",
        description: "Prepares orders for shipment",
        userId: pickerUser.id,
      },
    }),
  ]);

  // 5) Addresses (user)
  logStep("Creating addresses");
  const [
    buyer1Address,
    buyer2Address,
    buyer3Address,
    buyer1HomeAddress,
    buyer1BillingAddress,
    buyer2WorkAddress,
    adminWorkAddress,
    devAdminAddress,
    cocoAdminAddress,
    allyFractioningAddress,
  ] = await Promise.all([
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
    prisma.address.create({
      data: {
        type: AddressType.HOME,
        fullAddress: "B° Andes 120, Ushuaia, Tierra del Fuego, Argentina",
        street: "B° Andes",
        number: "120",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Buyer 1 home address",
        userId: buyer1.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.BILLING,
        fullAddress: "Oficina Centro 230, Ushuaia, Tierra del Fuego",
        street: "Oficina Centro",
        number: "230",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Buyer 1 billing address",
        userId: buyer1.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.WORK,
        fullAddress:
          "Parque Industrial Nave 5, Ushuaia, Tierra del Fuego, Argentina",
        street: "Parque Industrial",
        number: "Nave 5",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Buyer 2 work address",
        userId: buyer2.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.WORK,
        fullAddress: "Centro Cívico 1500, Ushuaia, Tierra del Fuego",
        street: "Centro Cívico",
        number: "1500",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Admin office",
        userId: adminUser.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.SHIPPING,
        fullAddress: "Test Admin Base, Av. Dev 999, Ushuaia, Tierra del Fuego",
        street: "Av. Dev",
        number: "999",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Dev admin shipping address",
        userId: devAdminUser.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.WORK,
        fullAddress: "Coco Dev Hub, Calle Tech 500, Ushuaia, Tierra del Fuego",
        street: "Calle Tech",
        number: "500",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Coco dev admin office",
        userId: cocoAdminUser.id,
      },
    }),
    prisma.address.create({
      data: {
        type: AddressType.FRACTIONING,
        fullAddress: "Deposito Comunitario 12, Ushuaia",
        street: "Deposito Comunitario",
        number: "12",
        city: "Ushuaia",
        state: "Tierra del Fuego",
        postalCode: "9410",
        country: "AR",
        description: "Ally / fractioning hub",
        userId: allyUser.id,
      },
    }),
  ]);

  // 6) Carrier + routes + rates
  logStep("Creating carriers");
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

  logStep("Creating carrier routes");
  const [route1, route2] = await Promise.all([
    prisma.carrierRoutes.create({
      data: {
        name: "Ushuaia City Route",
        description: "Last-mile delivery inside Ushuaia",
        origin: "Deposito Ushuaia",
        destination: "Zona urbana Ushuaia",
        distance: 25,
        duration: 1,
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
        duration: 5,
        price: 25000,
        carrierId: carrier2.id,
      },
    }),
  ]);

  logStep("Creating carrier rates");
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
  logStep("Creating suppliers");
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
  logStep("Creating categories");
  const [
    categoryCleaning,
    categoryBeverages,
    categoryFresh,
    categoryDairy,
    categoryPantry,
    categorySnacks,
    categoryPersonalCare,
    categoryFrozen,
    categoryPets,
    categoryHome,
  ] = await Promise.all([
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
    prisma.category.create({
      data: {
        name: "Despensa",
        tags: ["despensa", "almacén", "secos"],
        description: "Almacén seco y básicos de cocina",
      },
    }),
    prisma.category.create({
      data: {
        name: "Snacks",
        tags: ["snacks", "golosinas", "merienda"],
        description: "Snacks y golosinas para consumo masivo",
      },
    }),
    prisma.category.create({
      data: {
        name: "Cuidado personal",
        tags: ["higiene", "baño", "perfumería"],
        description: "Artículos de cuidado y perfumería",
      },
    }),
    prisma.category.create({
      data: {
        name: "Congelados",
        tags: ["frio", "freezer", "congelados"],
        description: "Productos congelados listos para consumo",
      },
    }),
    prisma.category.create({
      data: {
        name: "Mascotas",
        tags: ["perros", "gatos", "alimento"],
        description: "Productos y alimentos para mascotas",
      },
    }),
    prisma.category.create({
      data: {
        name: "Hogar y cocina",
        tags: ["hogar", "cocina", "utiles"],
        description: "Accesorios y descartables de cocina",
      },
    }),
  ]);

  logStep("Creating brands");
  const [
    brandGeneric,
    brandSpark,
    brandFreshValley,
    brandDairyPremium,
    brandAndesPantry,
    brandPatagoniaSnacks,
    brandCarePlus,
    brandFrost,
    brandPetCare,
    brandCasaPro,
  ] = await Promise.all([
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
    prisma.brand.create({
      data: {
        name: "Andes Pantry",
        description: "Productos secos patagónicos",
      },
    }),
    prisma.brand.create({
      data: {
        name: "Patagonia Snacks",
        description: "Snacks regionales",
      },
    }),
    prisma.brand.create({
      data: {
        name: "CarePlus",
        description: "Cuidado personal diario",
      },
    }),
    prisma.brand.create({
      data: {
        name: "Frost Bite",
        description: "Congelados listos para usar",
      },
    }),
    prisma.brand.create({
      data: {
        name: "PetCare",
        description: "Alimentos para mascotas de calidad",
      },
    }),
    prisma.brand.create({
      data: {
        name: "CasaPro",
        description: "Accesorios y descartables de hogar",
      },
    }),
  ]);

  // 9) Products (units aligned to Unit enum)
  logStep("Creating products");
  const productInputs = {
    detergent5l: productTemplate({
      name: "Detergente concentrado 5L",
      description:
        "Detergente líquido concentrado para uso general, bidón 5L.",
      searchTags: ["detergente", "limpieza", "cocina"],
      publicTags: ["detergente", "concentrado"],
      code: "DET-005-UNIT",
      supplierCode: "MS-DET-005",
      supplierUrl: "https://mayoristasur.example.com/detergente-5l",
      images: ["https://dummyimage.com/600x400/00a/ffffff&text=Detergente+5L"],
      price: 4500,
      priceUnit: Unit.UNIT,
      supplierMoqQty: 4,
      supplierMoqQtyUnit: Unit.UNIT,
      supplierMultiplierUnit: Unit.UNIT,
      customerMoq: 1,
      customerUnit: Unit.UNIT,
      publicPrice: 5200,
      publicPriceUnit: Unit.UNIT,
      minFractionPerUser: 1,
      brandId: brandGeneric.id,
      categoryId: categoryCleaning.id,
      supplierId: supplier1.id,
    }),
    desinfectante20l: productTemplate({
      name: "Desinfectante multiusos 20L",
      description: "Desinfectante industrial en bidón de 20 litros.",
      searchTags: ["desinfectante", "limpieza", "industrial"],
      publicTags: ["desinfectante", "industrial"],
      code: "DES-020-UNIT",
      supplierCode: "MS-DES-020",
      supplierUrl: "https://mayoristasur.example.com/desinfectante-20l",
      images: ["https://dummyimage.com/600x400/0a0/ffffff&text=Desinfectante"],
      price: 15000,
      priceUnit: Unit.UNIT,
      supplierMoqQty: 2,
      supplierMoqQtyUnit: Unit.UNIT,
      supplierMultiplierUnit: Unit.UNIT,
      customerMoq: 1,
      customerUnit: Unit.UNIT,
      publicPrice: 18000,
      publicPriceUnit: Unit.UNIT,
      brandId: brandGeneric.id,
      categoryId: categoryCleaning.id,
      supplierId: supplier1.id,
    }),
    colaPack6: productTemplate({
      name: "Gaseosa cola pack x6",
      description: "Pack mayorista de 6 botellas de 2.25L de cola.",
      searchTags: ["gaseosa", "cola", "bebidas"],
      publicTags: ["pack", "gaseosa"],
      code: "COLA-PACK-006",
      supplierCode: "MS-COLA-006",
      supplierUrl: "https://mayoristasur.example.com/cola-pack",
      images: ["https://dummyimage.com/600x400/a00/ffffff&text=Cola+Pack+6"],
      price: 7200,
      priceUnit: Unit.PACK,
      priceUnitMultiplier: 6,
      supplierMoqQty: 5,
      supplierMoqQtyUnit: Unit.PACK,
      supplierMultiplierUnit: Unit.PACK,
      customerMoq: 1,
      customerUnit: Unit.PACK,
      publicPrice: 8600,
      publicPriceUnit: Unit.PACK,
      publicPriceMultiplier: 6,
      brandId: brandSpark.id,
      categoryId: categoryBeverages.id,
      supplierId: supplier1.id,
    }),
    aguaCaja24: productTemplate({
      name: "Agua mineral x500ml (caja x24)",
      description: "Caja con 24 botellas de agua mineral sin gas.",
      searchTags: ["agua", "mineral", "bebidas"],
      publicTags: ["agua", "pack"],
      code: "AGUA-BOX-024",
      supplierCode: "MS-AGUA-024",
      supplierUrl: "https://mayoristasur.example.com/agua-pack",
      images: ["https://dummyimage.com/600x400/00f/ffffff&text=Agua+24+Pack"],
      price: 6500,
      priceUnit: Unit.BOX,
      priceUnitMultiplier: 24,
      supplierMoqQty: 3,
      supplierMoqQtyUnit: Unit.BOX,
      supplierMultiplierUnit: Unit.BOX,
      customerMoq: 1,
      customerUnit: Unit.BOX,
      publicPrice: 7800,
      publicPriceUnit: Unit.BOX,
      publicPriceMultiplier: 24,
      brandId: brandGeneric.id,
      categoryId: categoryBeverages.id,
      supplierId: supplier1.id,
    }),
    mixVerduras10kg: productTemplate({
      name: "Mix verduras estacionales 10kg",
      description:
        "Caja de verduras orgánicas de estación. Variedad según disponibilidad.",
      searchTags: ["verduras", "orgánico", "fresh"],
      publicTags: ["orgánico", "verduras"],
      code: "VERD-MIX-010",
      supplierCode: "FV-VERD-MIX-010",
      supplierUrl: "https://freshvalley.example.com/verduras-mix",
      images: ["https://dummyimage.com/600x400/0a0/ffffff&text=Verduras+Mix"],
      price: 12000,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 10,
      supplierMoqQty: 10,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 5,
      customerUnit: Unit.KG,
      publicPrice: 15000,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 10,
      brandId: brandFreshValley.id,
      categoryId: categoryFresh.id,
      supplierId: supplier2.id,
    }),
    citrus15kg: productTemplate({
      name: "Frutas cítricas 15kg",
      description:
        "Caja con naranjas, mandarinas y limones. Origen: Tucumán.",
      searchTags: ["frutas", "cítricos", "naranjas", "limones"],
      publicTags: ["frutas", "cítricos"],
      code: "FRUT-CIT-015",
      supplierCode: "FV-FRUT-CIT-015",
      supplierUrl: "https://freshvalley.example.com/citricos",
      images: ["https://dummyimage.com/600x400/fa0/ffffff&text=Citricos"],
      price: 18000,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 15,
      supplierMoqQty: 15,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 5,
      customerUnit: Unit.KG,
      publicPrice: 22000,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 15,
      brandId: brandFreshValley.id,
      categoryId: categoryFresh.id,
      supplierId: supplier2.id,
    }),
    lechePack12l: productTemplate({
      name: "Leche entera pack x12",
      description: "Pack de 12 litros de leche entera pasteurizada.",
      searchTags: ["leche", "lácteos", "entera"],
      publicTags: ["leche", "pack"],
      code: "LECH-ENT-012",
      supplierCode: "FV-LECH-ENT-012",
      supplierUrl: "https://freshvalley.example.com/leche",
      images: ["https://dummyimage.com/600x400/fff/000&text=Leche+Pack"],
      price: 9600,
      priceUnit: Unit.PACK,
      priceUnitMultiplier: 12,
      supplierMoqQty: 2,
      supplierMoqQtyUnit: Unit.PACK,
      supplierMultiplierUnit: Unit.PACK,
      customerMoq: 1,
      customerUnit: Unit.PACK,
      publicPrice: 11500,
      publicPriceUnit: Unit.PACK,
      publicPriceMultiplier: 12,
      brandId: brandDairyPremium.id,
      categoryId: categoryDairy.id,
      supplierId: supplier2.id,
    }),
    mozzarella5kg: productTemplate({
      name: "Queso mozzarella barra 5kg",
      description: "Barra de queso mozzarella para pizzería.",
      searchTags: ["queso", "mozzarella", "lácteos"],
      publicTags: ["queso", "mozzarella"],
      code: "QUES-MOZ-005",
      supplierCode: "FV-QUES-MOZ-005",
      supplierUrl: "https://freshvalley.example.com/queso-mozzarella",
      images: ["https://dummyimage.com/600x400/ff0/000&text=Mozzarella"],
      price: 25000,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 5,
      supplierMoqQty: 2,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 2.5,
      customerUnit: Unit.KG,
      publicPrice: 30000,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 5,
      brandId: brandDairyPremium.id,
      categoryId: categoryDairy.id,
      supplierId: supplier2.id,
    }),
    yogurtGriegoPack: productTemplate({
      name: "Yogurt griego natural pack x8",
      description: "Pack de 8 unidades de yogurt griego descremado.",
      searchTags: ["yogurt", "griego", "pack"],
      publicTags: ["yogurt", "griego"],
      code: "YOG-GRIEGO-008",
      supplierCode: "FV-YOG-GRIEGO-008",
      supplierUrl: "https://freshvalley.example.com/yogurt-griego",
      images: ["https://dummyimage.com/600x400/dff/000&text=Yogurt+Griego"],
      price: 14000,
      priceUnit: Unit.PACK,
      priceUnitMultiplier: 8,
      supplierMoqQty: 3,
      supplierMoqQtyUnit: Unit.PACK,
      supplierMultiplierUnit: Unit.PACK,
      customerMoq: 1,
      customerUnit: Unit.PACK,
      publicPrice: 16500,
      publicPriceUnit: Unit.PACK,
      publicPriceMultiplier: 8,
      brandId: brandDairyPremium.id,
      categoryId: categoryDairy.id,
      supplierId: supplier2.id,
    }),
    mantecaCaja: productTemplate({
      name: "Manteca 200g caja x20",
      description: "Caja cerrada con 20 unidades de manteca 200g.",
      searchTags: ["manteca", "lácteos", "caja"],
      publicTags: ["manteca", "caja"],
      code: "MANT-BOX-020",
      supplierCode: "FV-MANT-020",
      images: ["https://dummyimage.com/600x400/f8e/000&text=Manteca+20"],
      price: 11000,
      priceUnit: Unit.BOX,
      priceUnitMultiplier: 20,
      supplierMoqQty: 2,
      supplierMoqQtyUnit: Unit.BOX,
      supplierMultiplierUnit: Unit.BOX,
      customerMoq: 1,
      customerUnit: Unit.BOX,
      publicPrice: 13200,
      publicPriceUnit: Unit.BOX,
      publicPriceMultiplier: 20,
      brandId: brandDairyPremium.id,
      categoryId: categoryDairy.id,
      supplierId: supplier2.id,
    }),
    arroz10kg: productTemplate({
      name: "Arroz largo fino 10kg",
      description: "Bolsa de arroz largo fino premium de 10kg.",
      searchTags: ["arroz", "despensa", "grano"],
      publicTags: ["arroz", "bolsa"],
      code: "ARR-010-KG",
      supplierCode: "MS-ARR-010",
      images: ["https://dummyimage.com/600x400/efe/000&text=Arroz+10kg"],
      price: 7800,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 10,
      supplierMoqQty: 10,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 5,
      customerUnit: Unit.KG,
      publicPrice: 9200,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 10,
      brandId: brandAndesPantry.id,
      categoryId: categoryPantry.id,
      supplierId: supplier1.id,
    }),
    harina25kg: productTemplate({
      name: "Harina 000 bolsa 25kg",
      description: "Bolsa industrial de harina 000 para panificación.",
      searchTags: ["harina", "pan", "despensa"],
      publicTags: ["harina", "industrial"],
      code: "HAR-025-KG",
      supplierCode: "MS-HAR-025",
      images: ["https://dummyimage.com/600x400/ddd/000&text=Harina+25kg"],
      price: 12500,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 25,
      supplierMoqQty: 25,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 12.5,
      customerUnit: Unit.KG,
      publicPrice: 14900,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 25,
      brandId: brandAndesPantry.id,
      categoryId: categoryPantry.id,
      supplierId: supplier1.id,
    }),
    aceite15lPack: productTemplate({
      name: "Aceite de girasol 1.5L pack x12",
      description: "Pack de 12 botellas PET de aceite de girasol 1.5L.",
      searchTags: ["aceite", "girasol", "despensa"],
      publicTags: ["aceite", "pack"],
      code: "ACE-1.5L-012",
      supplierCode: "MS-ACE-012",
      images: ["https://dummyimage.com/600x400/fc0/000&text=Aceite+1.5L"],
      price: 26000,
      priceUnit: Unit.PACK,
      priceUnitMultiplier: 12,
      supplierMoqQty: 2,
      supplierMoqQtyUnit: Unit.PACK,
      supplierMultiplierUnit: Unit.PACK,
      customerMoq: 1,
      customerUnit: Unit.PACK,
      publicPrice: 30500,
      publicPriceUnit: Unit.PACK,
      publicPriceMultiplier: 12,
      brandId: brandAndesPantry.id,
      categoryId: categoryPantry.id,
      supplierId: supplier1.id,
    }),
    papasFritas24: productTemplate({
      name: "Papas fritas sabor queso pack x24",
      description: "Caja con 24 paquetes de papas fritas sabor queso.",
      searchTags: ["papas", "snacks", "queso"],
      publicTags: ["snack", "caja"],
      code: "PAP-QUESO-024",
      supplierCode: "MS-PAP-024",
      images: ["https://dummyimage.com/600x400/f90/fff&text=Papas+24"],
      price: 19000,
      priceUnit: Unit.BOX,
      priceUnitMultiplier: 24,
      supplierMoqQty: 1,
      supplierMoqQtyUnit: Unit.BOX,
      supplierMultiplierUnit: Unit.BOX,
      customerMoq: 1,
      customerUnit: Unit.BOX,
      publicPrice: 22500,
      publicPriceUnit: Unit.BOX,
      publicPriceMultiplier: 24,
      brandId: brandPatagoniaSnacks.id,
      categoryId: categorySnacks.id,
      supplierId: supplier1.id,
    }),
    galletitasIntegrales: productTemplate({
      name: "Galletitas integrales surtidas caja x12",
      description: "Caja cerrada de 12 paquetes de galletitas integrales.",
      searchTags: ["galletitas", "snack", "integral"],
      publicTags: ["integral", "caja"],
      code: "GAL-INT-012",
      supplierCode: "MS-GAL-012",
      images: ["https://dummyimage.com/600x400/c90/fff&text=Galletitas"],
      price: 15000,
      priceUnit: Unit.BOX,
      priceUnitMultiplier: 12,
      supplierMoqQty: 1,
      supplierMoqQtyUnit: Unit.BOX,
      supplierMultiplierUnit: Unit.BOX,
      customerMoq: 1,
      customerUnit: Unit.BOX,
      publicPrice: 17800,
      publicPriceUnit: Unit.BOX,
      publicPriceMultiplier: 12,
      brandId: brandPatagoniaSnacks.id,
      categoryId: categorySnacks.id,
      supplierId: supplier1.id,
    }),
    shampooHidratante: productTemplate({
      name: "Shampoo hidratante 750ml pack x6",
      description: "Pack de 6 botellas de shampoo hidratante de 750ml.",
      searchTags: ["shampoo", "cuidado", "cabello"],
      publicTags: ["shampoo", "pack"],
      code: "SHA-HID-006",
      supplierCode: "MS-SHA-006",
      images: ["https://dummyimage.com/600x400/9cf/000&text=Shampoo"],
      price: 13500,
      priceUnit: Unit.PACK,
      priceUnitMultiplier: 6,
      supplierMoqQty: 2,
      supplierMoqQtyUnit: Unit.PACK,
      supplierMultiplierUnit: Unit.PACK,
      customerMoq: 1,
      customerUnit: Unit.PACK,
      publicPrice: 16000,
      publicPriceUnit: Unit.PACK,
      publicPriceMultiplier: 6,
      brandId: brandCarePlus.id,
      categoryId: categoryPersonalCare.id,
      supplierId: supplier1.id,
    }),
    jabonLiquido5l: productTemplate({
      name: "Jabón líquido para manos 5L",
      description: "Bidón de jabón líquido antibacterial de 5L.",
      searchTags: ["jabón", "higiene", "manos"],
      publicTags: ["jabón", "antibacterial"],
      code: "JAB-LIQ-005",
      supplierCode: "MS-JAB-005",
      images: ["https://dummyimage.com/600x400/39f/fff&text=Jabon+5L"],
      price: 7200,
      priceUnit: Unit.UNIT,
      supplierMoqQty: 3,
      supplierMoqQtyUnit: Unit.UNIT,
      supplierMultiplierUnit: Unit.UNIT,
      customerMoq: 1,
      customerUnit: Unit.UNIT,
      publicPrice: 8800,
      publicPriceUnit: Unit.UNIT,
      brandId: brandCarePlus.id,
      categoryId: categoryPersonalCare.id,
      supplierId: supplier1.id,
    }),
    alimentoPerro20kg: productTemplate({
      name: "Alimento premium perro 20kg",
      description: "Alimento balanceado premium para perros adultos.",
      searchTags: ["perro", "mascotas", "alimento"],
      publicTags: ["mascotas", "perro"],
      code: "DOG-FOOD-020",
      supplierCode: "MS-DOG-020",
      images: ["https://dummyimage.com/600x400/aaf/000&text=Perro+20kg"],
      price: 23000,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 20,
      supplierMoqQty: 20,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 10,
      customerUnit: Unit.KG,
      publicPrice: 26500,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 20,
      brandId: brandPetCare.id,
      categoryId: categoryPets.id,
      supplierId: supplier1.id,
    }),
    alimentoGato10kg: productTemplate({
      name: "Alimento gato 10kg",
      description: "Alimento para gatos adultos sabor pollo.",
      searchTags: ["gato", "mascotas", "alimento"],
      publicTags: ["mascotas", "gato"],
      code: "CAT-FOOD-010",
      supplierCode: "MS-CAT-010",
      images: ["https://dummyimage.com/600x400/ccf/000&text=Gato+10kg"],
      price: 14500,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 10,
      supplierMoqQty: 10,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 5,
      customerUnit: Unit.KG,
      publicPrice: 17200,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 10,
      brandId: brandPetCare.id,
      categoryId: categoryPets.id,
      supplierId: supplier1.id,
    }),
    vegetalesCongelados5kg: productTemplate({
      name: "Mix vegetales congelados 5kg",
      description: "Bolsa de vegetales congelados listos para cocinar.",
      searchTags: ["congelados", "vegetales", "freezer"],
      publicTags: ["congelados", "mix"],
      code: "CONG-VEG-005",
      supplierCode: "FV-CONG-VEG-005",
      images: ["https://dummyimage.com/600x400/0cf/000&text=Veg+Cong"],
      price: 12500,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 5,
      supplierMoqQty: 2.5,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 2.5,
      customerUnit: Unit.KG,
      publicPrice: 15000,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 5,
      brandId: brandFrost.id,
      categoryId: categoryFrozen.id,
      supplierId: supplier2.id,
    }),
    pizzaCongeladaCaja12: productTemplate({
      name: "Pizza congelada muzzarella caja x12",
      description: "Caja con 12 pizzas congeladas listas para hornear.",
      searchTags: ["pizza", "congelados", "hornear"],
      publicTags: ["pizza", "caja"],
      code: "PIZ-CON-012",
      supplierCode: "FV-PIZ-012",
      images: ["https://dummyimage.com/600x400/0af/fff&text=Pizza+12"],
      price: 28000,
      priceUnit: Unit.BOX,
      priceUnitMultiplier: 12,
      supplierMoqQty: 1,
      supplierMoqQtyUnit: Unit.BOX,
      supplierMultiplierUnit: Unit.BOX,
      customerMoq: 1,
      customerUnit: Unit.BOX,
      publicPrice: 32000,
      publicPriceUnit: Unit.BOX,
      publicPriceMultiplier: 12,
      brandId: brandFrost.id,
      categoryId: categoryFrozen.id,
      supplierId: supplier2.id,
    }),
    esponjasMultiuso20: productTemplate({
      name: "Esponjas multiuso pack x20",
      description: "Pack industrial de esponjas multiuso.",
      searchTags: ["esponja", "limpieza", "hogar"],
      publicTags: ["pack", "limpieza"],
      code: "ESP-MULTI-020",
      supplierCode: "MS-ESP-020",
      images: ["https://dummyimage.com/600x400/cc0/fff&text=Esponjas"],
      price: 4200,
      priceUnit: Unit.PACK,
      priceUnitMultiplier: 20,
      supplierMoqQty: 2,
      supplierMoqQtyUnit: Unit.PACK,
      supplierMultiplierUnit: Unit.PACK,
      customerMoq: 1,
      customerUnit: Unit.PACK,
      publicPrice: 5200,
      publicPriceUnit: Unit.PACK,
      publicPriceMultiplier: 20,
      brandId: brandCasaPro.id,
      categoryId: categoryHome.id,
      supplierId: supplier1.id,
    }),
    filmPlasticoRollo: productTemplate({
      name: "Film plástico industrial 45cm",
      description: "Rollo de film plástico para cocina industrial.",
      searchTags: ["film", "cocina", "descartable"],
      publicTags: ["film", "cocina"],
      code: "FILM-045-ROL",
      supplierCode: "MS-FILM-045",
      images: ["https://dummyimage.com/600x400/ccc/000&text=Film"],
      price: 3800,
      priceUnit: Unit.UNIT,
      supplierMoqQty: 5,
      supplierMoqQtyUnit: Unit.UNIT,
      supplierMultiplierUnit: Unit.UNIT,
      customerMoq: 1,
      customerUnit: Unit.UNIT,
      publicPrice: 4500,
      publicPriceUnit: Unit.UNIT,
      brandId: brandCasaPro.id,
      categoryId: categoryHome.id,
      supplierId: supplier1.id,
    }),
    cafeGrano5kg: productTemplate({
      name: "Café en grano 5kg",
      description: "Café en grano tostado para cafeterías.",
      searchTags: ["cafe", "despensa", "grano"],
      publicTags: ["cafe", "grano"],
      code: "CAF-GRAN-005",
      supplierCode: "MS-CAF-005",
      images: ["https://dummyimage.com/600x400/6a4/fff&text=Cafe+5kg"],
      price: 17500,
      priceUnit: Unit.KG,
      priceUnitMultiplier: 5,
      supplierMoqQty: 5,
      supplierMoqQtyUnit: Unit.KG,
      supplierMultiplierUnit: Unit.KG,
      customerMoq: 2.5,
      customerUnit: Unit.KG,
      publicPrice: 20500,
      publicPriceUnit: Unit.KG,
      publicPriceMultiplier: 5,
      brandId: brandAndesPantry.id,
      categoryId: categoryPantry.id,
      supplierId: supplier1.id,
    }),
    heladoPaletaPack20: productTemplate({
      name: "Paletas heladas pack x20",
      description: "Pack de 20 paletas heladas surtidas.",
      searchTags: ["helado", "paleta", "congelados"],
      publicTags: ["helado", "pack"],
      code: "HEL-PALE-020",
      supplierCode: "FV-HEL-020",
      images: ["https://dummyimage.com/600x400/08a/fff&text=Helado+20"],
      price: 32000,
      priceUnit: Unit.PACK,
      priceUnitMultiplier: 20,
      supplierMoqQty: 1,
      supplierMoqQtyUnit: Unit.PACK,
      supplierMultiplierUnit: Unit.PACK,
      customerMoq: 1,
      customerUnit: Unit.PACK,
      publicPrice: 37000,
      publicPriceUnit: Unit.PACK,
      publicPriceMultiplier: 20,
      brandId: brandFrost.id,
      categoryId: categoryFrozen.id,
      supplierId: supplier2.id,
    }),
  };

  const productEntries = await Promise.all(
    Object.entries(productInputs).map(async ([key, data]) => {
      const product = await prisma.product.create({ data });
      return [key, product] as const;
    }),
  );
  type SeedProduct = Awaited<ReturnType<typeof prisma.product.create>>;
  const products = Object.fromEntries(productEntries) as Record<
    keyof typeof productInputs,
    SeedProduct
  >;

  // 10) Saved payment cards
  logStep("Creating saved payment cards");
  await prisma.savedPaymentCard.createMany({
    data: [
      {
        cardholderName: "Juan Pérez",
        cardLast4: "4242",
        expiryMonth: 12,
        expiryYear: 2026,
        cardBrand: "Visa",
        isDefault: true,
        isActive: true,
        userId: buyer1.id,
      },
      {
        cardholderName: "Juan Pérez",
        cardLast4: "1881",
        expiryMonth: 3,
        expiryYear: 2025,
        cardBrand: "Mastercard",
        isDefault: false,
        isActive: true,
        userId: buyer1.id,
      },
      {
        cardholderName: "María González",
        cardLast4: "3782",
        expiryMonth: 7,
        expiryYear: 2027,
        cardBrand: "Amex",
        isDefault: true,
        isActive: true,
        userId: buyer2.id,
      },
      {
        cardholderName: "Carlos Rodríguez",
        cardLast4: "9995",
        expiryMonth: 1,
        expiryYear: 2026,
        cardBrand: "Visa",
        isDefault: true,
        isActive: false,
        userId: buyer3.id,
      },
      {
        cardholderName: "Admin User",
        cardLast4: "5100",
        expiryMonth: 10,
        expiryYear: 2028,
        cardBrand: "Mastercard",
        isDefault: true,
        isActive: true,
        userId: adminUser.id,
      },
      {
        cardholderName: "Flavio Gragnolati",
        cardLast4: "4243",
        expiryMonth: 11,
        expiryYear: 2027,
        cardBrand: "Visa",
        isDefault: true,
        isActive: true,
        userId: devAdminUser.id,
      },
      {
        cardholderName: "Flavio Gragnolati",
        cardLast4: "1234",
        expiryMonth: 6,
        expiryYear: 2026,
        cardBrand: "Amex",
        isDefault: false,
        isActive: false,
        userId: devAdminUser.id,
      },
      {
        cardholderName: "Coco Dev Admin",
        cardLast4: "8888",
        expiryMonth: 9,
        expiryYear: 2026,
        cardBrand: "Visa",
        isDefault: true,
        isActive: true,
        userId: cocoAdminUser.id,
      },
      {
        cardholderName: "Alianza Comunitaria",
        cardLast4: "7001",
        expiryMonth: 5,
        expiryYear: 2025,
        cardBrand: "Visa",
        isDefault: false,
        isActive: true,
        userId: allyUser.id,
      },
    ],
  });

  // 11) Carts with diverse statuses
  logStep("Creating carts and cart items");
  const cart1 = await prisma.cart.create({
    data: {
      status: CartStatus.COMPLETED,
      userId: buyer1.id,
      addressId: buyer1Address.id,
      paidAt: new Date(now - 2 * dayMs),
      items: {
        create: [
          {
            quantity: 3,
            unit: products.detergent5l.customerUnit,
            price: products.detergent5l.price,
            publicPrice: products.detergent5l.publicPrice,
            productSnapshot: JSON.stringify(products.detergent5l),
            product: { connect: { id: products.detergent5l.id } },
          },
          {
            quantity: 2,
            unit: products.colaPack6.customerUnit,
            price: products.colaPack6.price,
            publicPrice: products.colaPack6.publicPrice,
            productSnapshot: JSON.stringify(products.colaPack6),
            product: { connect: { id: products.colaPack6.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart2 = await prisma.cart.create({
    data: {
      status: CartStatus.PENDING_PAYMENT,
      userId: buyer2.id,
      addressId: buyer2Address.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: products.mixVerduras10kg.customerUnit,
            price: products.mixVerduras10kg.price,
            publicPrice: products.mixVerduras10kg.publicPrice,
            productSnapshot: JSON.stringify(products.mixVerduras10kg),
            product: { connect: { id: products.mixVerduras10kg.id } },
          },
          {
            quantity: 2,
            unit: products.lechePack12l.customerUnit,
            price: products.lechePack12l.price,
            publicPrice: products.lechePack12l.publicPrice,
            productSnapshot: JSON.stringify(products.lechePack12l),
            product: { connect: { id: products.lechePack12l.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart3 = await prisma.cart.create({
    data: {
      status: CartStatus.DRAFT,
      userId: buyer3.id,
      addressId: buyer3Address.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: products.desinfectante20l.customerUnit,
            price: products.desinfectante20l.price,
            publicPrice: products.desinfectante20l.publicPrice,
            productSnapshot: JSON.stringify(products.desinfectante20l),
            product: { connect: { id: products.desinfectante20l.id } },
          },
          {
            quantity: 1,
            unit: products.esponjasMultiuso20.customerUnit,
            price: products.esponjasMultiuso20.price,
            publicPrice: products.esponjasMultiuso20.publicPrice,
            productSnapshot: JSON.stringify(products.esponjasMultiuso20),
            product: { connect: { id: products.esponjasMultiuso20.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart4 = await prisma.cart.create({
    data: {
      status: CartStatus.COMPLETED,
      userId: buyer1.id,
      addressId: buyer1HomeAddress.id,
      paidAt: new Date(now - 1 * dayMs),
      items: {
        create: [
          {
            quantity: 4,
            unit: products.citrus15kg.customerUnit,
            price: products.citrus15kg.price,
            publicPrice: products.citrus15kg.publicPrice,
            productSnapshot: JSON.stringify(products.citrus15kg),
            product: { connect: { id: products.citrus15kg.id } },
          },
          {
            quantity: 2,
            unit: products.mozzarella5kg.customerUnit,
            price: products.mozzarella5kg.price,
            publicPrice: products.mozzarella5kg.publicPrice,
            productSnapshot: JSON.stringify(products.mozzarella5kg),
            product: { connect: { id: products.mozzarella5kg.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart5 = await prisma.cart.create({
    data: {
      status: CartStatus.PENDING_PAYMENT,
      userId: buyer2.id,
      addressId: buyer2WorkAddress.id,
      items: {
        create: [
          {
            quantity: 2,
            unit: products.aguaCaja24.customerUnit,
            price: products.aguaCaja24.price,
            publicPrice: products.aguaCaja24.publicPrice,
            productSnapshot: JSON.stringify(products.aguaCaja24),
            product: { connect: { id: products.aguaCaja24.id } },
          },
          {
            quantity: 1,
            unit: products.arroz10kg.customerUnit,
            price: products.arroz10kg.price,
            publicPrice: products.arroz10kg.publicPrice,
            productSnapshot: JSON.stringify(products.arroz10kg),
            product: { connect: { id: products.arroz10kg.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart6 = await prisma.cart.create({
    data: {
      status: CartStatus.PAYMENT_FAILED,
      userId: buyer3.id,
      addressId: buyer3Address.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: products.vegetalesCongelados5kg.customerUnit,
            price: products.vegetalesCongelados5kg.price,
            publicPrice: products.vegetalesCongelados5kg.publicPrice,
            productSnapshot: JSON.stringify(products.vegetalesCongelados5kg),
            product: { connect: { id: products.vegetalesCongelados5kg.id } },
          },
          {
            quantity: 1,
            unit: products.pizzaCongeladaCaja12.customerUnit,
            price: products.pizzaCongeladaCaja12.price,
            publicPrice: products.pizzaCongeladaCaja12.publicPrice,
            productSnapshot: JSON.stringify(products.pizzaCongeladaCaja12),
            product: { connect: { id: products.pizzaCongeladaCaja12.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart7 = await prisma.cart.create({
    data: {
      status: CartStatus.CANCELLED_BY_USER,
      userId: buyer2.id,
      addressId: buyer2Address.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: products.shampooHidratante.customerUnit,
            price: products.shampooHidratante.price,
            publicPrice: products.shampooHidratante.publicPrice,
            productSnapshot: JSON.stringify(products.shampooHidratante),
            product: { connect: { id: products.shampooHidratante.id } },
          },
          {
            quantity: 1,
            unit: products.jabonLiquido5l.customerUnit,
            price: products.jabonLiquido5l.price,
            publicPrice: products.jabonLiquido5l.publicPrice,
            productSnapshot: JSON.stringify(products.jabonLiquido5l),
            product: { connect: { id: products.jabonLiquido5l.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cart8 = await prisma.cart.create({
    data: {
      status: CartStatus.REFUNDED,
      userId: buyer1.id,
      addressId: buyer1BillingAddress.id,
      paidAt: new Date(now - 4 * dayMs),
      items: {
        create: [
          {
            quantity: 1,
            unit: products.alimentoPerro20kg.customerUnit,
            price: products.alimentoPerro20kg.price,
            publicPrice: products.alimentoPerro20kg.publicPrice,
            productSnapshot: JSON.stringify(products.alimentoPerro20kg),
            product: { connect: { id: products.alimentoPerro20kg.id } },
          },
          {
            quantity: 1,
            unit: products.filmPlasticoRollo.customerUnit,
            price: products.filmPlasticoRollo.price,
            publicPrice: products.filmPlasticoRollo.publicPrice,
            productSnapshot: JSON.stringify(products.filmPlasticoRollo),
            product: { connect: { id: products.filmPlasticoRollo.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  // Dev admin carts with varied payment states
  const devAdminCartCompleted = await prisma.cart.create({
    data: {
      status: CartStatus.COMPLETED,
      userId: devAdminUser.id,
      addressId: devAdminAddress.id,
      paidAt: new Date(now - 3 * dayMs),
      items: {
        create: [
          {
            quantity: 2,
            unit: products.cafeGrano5kg.customerUnit,
            price: products.cafeGrano5kg.price,
            publicPrice: products.cafeGrano5kg.publicPrice,
            productSnapshot: JSON.stringify(products.cafeGrano5kg),
            product: { connect: { id: products.cafeGrano5kg.id } },
          },
          {
            quantity: 1,
            unit: products.heladoPaletaPack20.customerUnit,
            price: products.heladoPaletaPack20.price,
            publicPrice: products.heladoPaletaPack20.publicPrice,
            productSnapshot: JSON.stringify(products.heladoPaletaPack20),
            product: { connect: { id: products.heladoPaletaPack20.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const devAdminCartPending = await prisma.cart.create({
    data: {
      status: CartStatus.PENDING_PAYMENT,
      userId: devAdminUser.id,
      addressId: devAdminAddress.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: products.aceite15lPack.customerUnit,
            price: products.aceite15lPack.price,
            publicPrice: products.aceite15lPack.publicPrice,
            productSnapshot: JSON.stringify(products.aceite15lPack),
            product: { connect: { id: products.aceite15lPack.id } },
          },
          {
            quantity: 1,
            unit: products.jabonLiquido5l.customerUnit,
            price: products.jabonLiquido5l.price,
            publicPrice: products.jabonLiquido5l.publicPrice,
            productSnapshot: JSON.stringify(products.jabonLiquido5l),
            product: { connect: { id: products.jabonLiquido5l.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const devAdminCartFailed = await prisma.cart.create({
    data: {
      status: CartStatus.PAYMENT_FAILED,
      userId: devAdminUser.id,
      addressId: devAdminAddress.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: products.mantecaCaja.customerUnit,
            price: products.mantecaCaja.price,
            publicPrice: products.mantecaCaja.publicPrice,
            productSnapshot: JSON.stringify(products.mantecaCaja),
            product: { connect: { id: products.mantecaCaja.id } },
          },
          {
            quantity: 1,
            unit: products.alimentoGato10kg.customerUnit,
            price: products.alimentoGato10kg.price,
            publicPrice: products.alimentoGato10kg.publicPrice,
            productSnapshot: JSON.stringify(products.alimentoGato10kg),
            product: { connect: { id: products.alimentoGato10kg.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  const cocoAdminCart = await prisma.cart.create({
    data: {
      status: CartStatus.PENDING_PAYMENT,
      userId: cocoAdminUser.id,
      addressId: cocoAdminAddress.id,
      items: {
        create: [
          {
            quantity: 1,
            unit: products.citrus15kg.customerUnit,
            price: products.citrus15kg.price,
            publicPrice: products.citrus15kg.publicPrice,
            productSnapshot: JSON.stringify(products.citrus15kg),
            product: { connect: { id: products.citrus15kg.id } },
          },
          {
            quantity: 1,
            unit: products.galletitasIntegrales.customerUnit,
            price: products.galletitasIntegrales.price,
            publicPrice: products.galletitasIntegrales.publicPrice,
            productSnapshot: JSON.stringify(products.galletitasIntegrales),
            product: { connect: { id: products.galletitasIntegrales.id } },
          },
        ],
      },
    },
    include: { items: true },
  });

  // 13) Lots from carts
  logStep("Creating lots");
  const scheduledAt1 = new Date(now - 2 * dayMs);
  const scheduledAt2 = new Date(now - 1 * dayMs);

  const lot1 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0001",
      status: LotStatus.CONFIRMED_BY_PROVIDER,
      scheduledAt: scheduledAt1,
      consolidatedAt: new Date(now - 1.5 * dayMs),
      orderSentAt: new Date(now - 1 * dayMs),
      confirmedAt: new Date(now - 0.5 * dayMs),
      supplierId: supplier1.id,
      items: {
        connect: cart1.items.map((item) => ({ id: item.id })),
      },
    },
  });

  const lot2 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0002",
      status: LotStatus.PACKAGED,
      scheduledAt: scheduledAt2,
      consolidatedAt: new Date(now - 0.8 * dayMs),
      orderSentAt: new Date(now - 0.5 * dayMs),
      confirmedAt: new Date(now - 0.2 * dayMs),
      supplierId: supplier2.id,
      items: {
        connect: cart4.items.map((item) => ({ id: item.id })),
      },
    },
  });

  const lot3 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0003",
      status: LotStatus.READY_TO_ORDER,
      scheduledAt: new Date(now + dayMs),
      consolidatedAt: new Date(now + dayMs),
      supplierId: supplier2.id,
      items: {
        connect: cart2.items.map((item) => ({ id: item.id })),
      },
    },
  });

  const lot4 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0004",
      status: LotStatus.PENDING,
      scheduledAt: new Date(now + 2 * dayMs),
      supplierId: supplier1.id,
      items: {
        connect: cart5.items.map((item) => ({ id: item.id })),
      },
    },
  });

  const lot5 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0005",
      status: LotStatus.ORDER_SENT,
      scheduledAt: new Date(now - 0.5 * dayMs),
      orderSentAt: new Date(now - 0.4 * dayMs),
      supplierId: supplier2.id,
      items: {
        connect: cart6.items.map((item) => ({ id: item.id })),
      },
    },
  });

  const lot6 = await prisma.lot.create({
    data: {
      trackingNumber: "LOT-2025-0006",
      status: LotStatus.READY_TO_ORDER,
      scheduledAt: new Date(now - dayMs),
      supplierId: supplier1.id,
      items: {
        connect: cart8.items.map((item) => ({ id: item.id })),
      },
    },
  });

  // 14) Packages from lots
  logStep("Creating packages");
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
      status: PackageStatus.IN_TRANSIT,
      trackingId: "PKG-2025-0002",
      weight: 18.0,
      volume: 0.12,
      lotId: lot1.id,
    },
  });

  const pkg3 = await prisma.package.create({
    data: {
      status: PackageStatus.DELIVERED,
      trackingId: "PKG-2025-0003",
      weight: 45.0,
      volume: 0.25,
      lotId: lot2.id,
    },
  });

  const pkg4 = await prisma.package.create({
    data: {
      status: PackageStatus.DELIVERED,
      trackingId: "PKG-2025-0004",
      weight: 30.0,
      volume: 0.15,
      lotId: lot2.id,
    },
  });

  const pkg5 = await prisma.package.create({
    data: {
      status: PackageStatus.CREATED,
      trackingId: "PKG-2025-0005",
      weight: 25.0,
      volume: 0.1,
      lotId: lot3.id,
    },
  });

  const pkg6 = await prisma.package.create({
    data: {
      status: PackageStatus.IN_TRANSIT,
      trackingId: "PKG-2025-0006",
      weight: 20.0,
      volume: 0.09,
      lotId: lot5.id,
    },
  });

  const pkg7 = await prisma.package.create({
    data: {
      status: PackageStatus.DELIVERED,
      trackingId: "PKG-2025-0007",
      weight: 24.0,
      volume: 0.11,
      lotId: lot6.id,
    },
  });

  // 15) Shipments carrying packages
  logStep("Creating shipments");
  const shipment1 = await prisma.shipment.create({
    data: {
      trackingId: "SHIP-2025-0001",
      carrierName: carrier1.name,
      status: ShipmentStatus.IN_TRANSIT,
      startedAt: new Date(now - 0.3 * dayMs),
      eta: new Date(now + 0.5 * dayMs),
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

  const shipment2 = await prisma.shipment.create({
    data: {
      trackingId: "SHIP-2025-0002",
      carrierName: carrier2.name,
      status: ShipmentStatus.CLOSED,
      startedAt: new Date(now - 1 * dayMs),
      arrivedAt: new Date(now - 0.1 * dayMs),
      eta: new Date(now - 0.1 * dayMs),
      addressId: buyer1HomeAddress.id,
      carrierId: carrier2.id,
      packages: {
        create: [
          { package: { connect: { id: pkg3.id } } },
          { package: { connect: { id: pkg4.id } } },
        ],
      },
    },
  });

  const shipment3 = await prisma.shipment.create({
    data: {
      trackingId: "SHIP-2025-0003",
      carrierName: carrier1.name,
      status: ShipmentStatus.ASSEMBLING,
      eta: new Date(now + 3 * dayMs),
      addressId: buyer2Address.id,
      carrierId: carrier1.id,
      packages: {
        create: [{ package: { connect: { id: pkg5.id } } }],
      },
    },
  });

  const shipment4 = await prisma.shipment.create({
    data: {
      trackingId: "SHIP-2025-0004",
      carrierName: carrier2.name,
      status: ShipmentStatus.CLOSED,
      startedAt: new Date(now - 3 * dayMs),
      arrivedAt: new Date(now - 1 * dayMs),
      eta: new Date(now - 1 * dayMs),
      addressId: buyer1BillingAddress.id,
      carrierId: carrier2.id,
      packages: {
        create: [{ package: { connect: { id: pkg7.id } } }],
      },
    },
  });

  // 16) Payments for carts, lots, and shipments
  logStep("Creating payments for carts, lots, and shipments");
  const sumCart = (cart: typeof cart1) =>
    cart.items.reduce(
      (sum, item) => sum + item.publicPrice * item.quantity,
      0,
    );

  await Promise.all([
    prisma.userPayment.create({
      data: {
        amount: sumCart(cart1),
        status: PaymentStatus.COMPLETED,
        transaction: { id: "txn-cart1", provider: "mock-pay", status: "paid" },
        cartId: cart1.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(cart2),
        status: PaymentStatus.PENDING,
        transaction: {
          id: "txn-cart2",
          provider: "mock-pay",
          status: "pending",
        },
        cartId: cart2.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(cart4),
        status: PaymentStatus.COMPLETED,
        transaction: {
          id: "txn-cart4",
          provider: "mock-pay",
          status: "paid",
        },
        cartId: cart4.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(cart5),
        status: PaymentStatus.PENDING,
        transaction: {
          id: "txn-cart5",
          provider: "mock-pay",
          status: "pending",
        },
        cartId: cart5.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(cart6),
        status: PaymentStatus.FAILED,
        transaction: {
          id: "txn-cart6",
          provider: "mock-pay",
          status: "failed",
        },
        cartId: cart6.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(cart7),
        status: PaymentStatus.FAILED,
        transaction: {
          id: "txn-cart7",
          provider: "mock-pay",
          status: "cancelled",
        },
        cartId: cart7.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(cart8),
        status: PaymentStatus.COMPLETED,
        transaction: {
          id: "txn-cart8",
          provider: "mock-pay",
          status: "refunded",
        },
        cartId: cart8.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(devAdminCartCompleted),
        status: PaymentStatus.COMPLETED,
        transaction: {
          id: "txn-devadmin-completed",
          provider: "mock-pay",
          status: "paid",
        },
        cartId: devAdminCartCompleted.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(devAdminCartPending),
        status: PaymentStatus.PENDING,
        transaction: {
          id: "txn-devadmin-pending",
          provider: "mock-pay",
          status: "pending",
        },
        cartId: devAdminCartPending.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(devAdminCartFailed),
        status: PaymentStatus.FAILED,
        transaction: {
          id: "txn-devadmin-failed",
          provider: "mock-pay",
          status: "failed",
        },
        cartId: devAdminCartFailed.id,
      },
    }),
    prisma.userPayment.create({
      data: {
        amount: sumCart(cocoAdminCart),
        status: PaymentStatus.PENDING,
        transaction: {
          id: "txn-cocoadmin-pending",
          provider: "mock-pay",
          status: "pending",
        },
        cartId: cocoAdminCart.id,
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
    prisma.lotPayment.create({
      data: {
        amount: cart6.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        status: PaymentStatus.FAILED,
        lotId: lot5.id,
      },
    }),
    prisma.lotPayment.create({
      data: {
        amount: cart8.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        status: PaymentStatus.COMPLETED,
        lotId: lot6.id,
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
    prisma.shipmentPayment.create({
      data: {
        amount: 18000,
        status: PaymentStatus.FAILED,
        shipmentId: shipment4.id,
      },
    }),
  ]);

  // 17) Product ratings, events, and notifications
  logStep("Creating product ratings");
  await Promise.all([
    prisma.productRating.create({
      data: {
        rating: 5,
        comment:
          "Muy buen detergente, rinde bastante y excelente precio mayorista.",
        userId: buyer1.id,
        productId: products.detergent5l.id,
      },
    }),
    prisma.productRating.create({
      data: {
        rating: 4,
        comment: "Buenas verduras, frescas. Llegaron en perfecto estado.",
        userId: buyer2.id,
        productId: products.mixVerduras10kg.id,
      },
    }),
    prisma.productRating.create({
      data: {
        rating: 5,
        comment: "Pizza muy rica y práctica de preparar.",
        userId: buyer3.id,
        productId: products.pizzaCongeladaCaja12.id,
      },
    }),
    prisma.productRating.create({
      data: {
        rating: 5,
        comment: "Excelente pack para las pruebas completas.",
        userId: devAdminUser.id,
        productId: products.cafeGrano5kg.id,
      },
    }),
  ]);

  logStep("Creating events");
  await Promise.all([
    prisma.event.create({
      data: {
        name: "Primera compra colaborativa",
        description:
          "Primera compra mayorista colaborativa completada con éxito.",
        date: new Date(now - 2 * dayMs),
        location: "Ushuaia",
        userId: buyer1.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Segundo pedido",
        description: "Segundo pedido de productos frescos.",
        date: new Date(now - 1 * dayMs),
        location: "Ushuaia",
        userId: buyer1.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Entrega a sucursal",
        description: "Entrega cerrada en ruta logística.",
        date: new Date(now - 0.5 * dayMs),
        location: "Ushuaia",
        userId: buyer2.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Admin audit",
        description: "Revisión de logs y configuraciones.",
        date: new Date(now - 0.2 * dayMs),
        location: "Ushuaia",
        userId: adminUser.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Full system seed",
        description: "Operación completa para usuario gragnolatif.",
        date: new Date(now - 0.1 * dayMs),
        location: "Ushuaia",
        userId: devAdminUser.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Coco admin review",
        description: "Chequeo de datos de coco.dev.",
        date: new Date(now - 0.15 * dayMs),
        location: "Ushuaia",
        userId: cocoAdminUser.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Supplier catalog sync",
        description: "Actualización de catálogo del proveedor.",
        date: new Date(now - 0.4 * dayMs),
        location: "Ushuaia",
        userId: supplierUser1.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Carrier schedule update",
        description: "Nuevo horario de rutas cargado.",
        date: new Date(now - 0.6 * dayMs),
        location: "Buenos Aires",
        userId: carrierUser.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Ally support shift",
        description: "Soporte comunitario en marcha.",
        date: new Date(now - 0.7 * dayMs),
        location: "Ushuaia",
        userId: allyUser.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Fractionation batch",
        description: "Lote fraccionado para pedidos.",
        date: new Date(now - 0.8 * dayMs),
        location: "Ushuaia",
        userId: fractionatorUser.id,
      },
    }),
    prisma.event.create({
      data: {
        name: "Picker start",
        description: "Inicio de preparación de pedidos.",
        date: new Date(now - 0.9 * dayMs),
        location: "Ushuaia",
        userId: pickerUser.id,
      },
    }),
  ]);

  logStep("Creating notifications");
  await Promise.all([
    prisma.notification.create({
      data: {
        message:
          "Tu compra fue registrada. Estamos consolidando el lote con otros compradores.",
        type: NotificationType.INFO,
        status: NotificationStatus.SENT,
        userId: buyer1.id,
        channelId: whatsappChannel.id,
        scheduledAt: new Date(now - 2 * dayMs),
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
        scheduledAt: new Date(now - 0.3 * dayMs),
      },
    }),
    prisma.notification.create({
      data: {
        message: "Tu pago está pendiente. Por favor completa el pago para continuar.",
        type: NotificationType.WARNING,
        status: NotificationStatus.PENDING,
        userId: buyer2.id,
        channelId: emailChannel.id,
        scheduledAt: new Date(now),
      },
    }),
    prisma.notification.create({
      data: {
        message: "Error al procesar el pago. Intenta con otro medio.",
        type: NotificationType.ERROR,
        status: NotificationStatus.FAILED,
        userId: buyer3.id,
        channelId: smsChannel.id,
        scheduledAt: new Date(now - 0.1 * dayMs),
      },
    }),
    prisma.notification.create({
      data: {
        message:
          "Reintentaremos el envío de notificaciones push para tu pedido.",
        type: NotificationType.ERROR,
        status: NotificationStatus.RETRY,
        userId: buyer1.id,
        channelId: pushChannel.id,
        scheduledAt: new Date(now - 0.05 * dayMs),
      },
    }),
    prisma.notification.create({
      data: {
        message: "Pago aprobado para tu compra de prueba.",
        type: NotificationType.SUCCESS,
        status: NotificationStatus.SENT,
        userId: devAdminUser.id,
        channelId: emailChannel.id,
        scheduledAt: new Date(now - 0.2 * dayMs),
      },
    }),
    prisma.notification.create({
      data: {
        message: "Hubo un problema con tu tarjeta en el último intento.",
        type: NotificationType.ERROR,
        status: NotificationStatus.FAILED,
        userId: devAdminUser.id,
        channelId: smsChannel.id,
        scheduledAt: new Date(now - 0.1 * dayMs),
      },
    }),
    prisma.notification.create({
      data: {
        message: "Operación completa de pruebas para gragnolatif.",
        type: NotificationType.SUCCESS,
        status: NotificationStatus.SENT,
        userId: devAdminUser.id,
        channelId: emailChannel.id,
        scheduledAt: new Date(now - 0.02 * dayMs),
      },
    }),
    prisma.notification.create({
      data: {
        message: "Revisión pendiente de rutas y roles.",
        type: NotificationType.INFO,
        status: NotificationStatus.SENT,
        userId: cocoAdminUser.id,
        channelId: pushChannel.id,
        scheduledAt: new Date(now - 0.03 * dayMs),
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
