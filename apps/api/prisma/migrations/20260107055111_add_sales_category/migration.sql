-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_groups" (
    "id" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "generalDiscount" INTEGER NOT NULL DEFAULT 100,
    "premiumDiscount" INTEGER NOT NULL DEFAULT 100,
    "importedDiscount" INTEGER NOT NULL DEFAULT 100,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "clientCode" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "businessNumber" TEXT,
    "representative" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "groupId" TEXT,
    "creditGrade" TEXT NOT NULL DEFAULT 'B',
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isTopMenu" BOOLEAN NOT NULL DEFAULT false,
    "loginVisibility" TEXT NOT NULL DEFAULT 'always',
    "categoryType" TEXT NOT NULL DEFAULT 'HTML',
    "productionForm" TEXT,
    "isOutsourced" BOOLEAN NOT NULL DEFAULT false,
    "pricingUnit" TEXT,
    "description" TEXT,
    "linkUrl" TEXT,
    "htmlContent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "salesCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "memberType" TEXT NOT NULL DEFAULT 'all',
    "basePrice" DECIMAL(12,2) NOT NULL,
    "thumbnailUrl" TEXT,
    "detailImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_bindings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_papers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_covers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "materialCode" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_covers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_foils" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_foils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_finishings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_finishings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_options" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "values" JSONB,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "custom_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_half_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_half_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryLargeId" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "isPriceAdditive" BOOLEAN NOT NULL DEFAULT true,
    "memberType" TEXT NOT NULL DEFAULT 'all',
    "requiredFileCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnailUrl" TEXT,
    "detailImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "half_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_product_specifications" (
    "id" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "half_product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_product_price_tiers" (
    "id" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "discountRate" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "half_product_price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "half_product_options" (
    "id" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "quantityType" TEXT NOT NULL DEFAULT 'auto',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "half_product_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_half_product_prices" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "halfProductId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_half_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_product_prices" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "my_products" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customName" TEXT,
    "customThumbnail" TEXT,
    "registrationType" TEXT NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "defaultOptions" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "my_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productPrice" DECIMAL(12,2) NOT NULL,
    "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'postpaid',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'pending_receipt',
    "currentProcess" TEXT NOT NULL DEFAULT 'receipt_pending',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "requestedDeliveryDate" TIMESTAMP(3),
    "customerMemo" TEXT,
    "productMemo" TEXT,
    "adminMemo" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_shippings" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "addressDetail" TEXT,
    "courierCode" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "order_shippings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productionNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "printMethod" TEXT NOT NULL,
    "paper" TEXT NOT NULL,
    "bindingType" TEXT NOT NULL,
    "coverMaterial" TEXT,
    "foilName" TEXT,
    "foilColor" TEXT,
    "finishingOptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_files" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "pageRange" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "widthInch" DOUBLE PRECISION NOT NULL,
    "heightInch" DOUBLE PRECISION NOT NULL,
    "dpi" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "inspectionStatus" TEXT NOT NULL DEFAULT 'pending',
    "inspectionNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_histories" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "note" TEXT,
    "processedBy" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_schedules" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openTime" TEXT,
    "closeTime" TEXT,
    "reason" TEXT,
    "reasonType" TEXT,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "holidayName" TEXT,
    "modifiedBy" TEXT,
    "modifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reception_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regular_holiday_settings" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weeklyDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "monthlyDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "yearlyDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regular_holiday_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branchCode_key" ON "branches"("branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "client_groups_groupCode_key" ON "client_groups"("groupCode");

-- CreateIndex
CREATE INDEX "client_groups_branchId_idx" ON "client_groups"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_clientCode_key" ON "clients"("clientCode");

-- CreateIndex
CREATE INDEX "clients_groupId_idx" ON "clients"("groupId");

-- CreateIndex
CREATE INDEX "clients_clientCode_idx" ON "clients"("clientCode");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_categoryType_idx" ON "categories"("categoryType");

-- CreateIndex
CREATE INDEX "categories_isTopMenu_idx" ON "categories"("isTopMenu");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "product_specifications_productId_idx" ON "product_specifications"("productId");

-- CreateIndex
CREATE INDEX "product_bindings_productId_idx" ON "product_bindings"("productId");

-- CreateIndex
CREATE INDEX "product_papers_productId_idx" ON "product_papers"("productId");

-- CreateIndex
CREATE INDEX "product_covers_productId_idx" ON "product_covers"("productId");

-- CreateIndex
CREATE INDEX "product_foils_productId_idx" ON "product_foils"("productId");

-- CreateIndex
CREATE INDEX "product_finishings_productId_idx" ON "product_finishings"("productId");

-- CreateIndex
CREATE INDEX "custom_options_productId_idx" ON "custom_options"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_half_products_productId_halfProductId_key" ON "product_half_products"("productId", "halfProductId");

-- CreateIndex
CREATE UNIQUE INDEX "half_products_code_key" ON "half_products"("code");

-- CreateIndex
CREATE INDEX "half_products_categoryLargeId_idx" ON "half_products"("categoryLargeId");

-- CreateIndex
CREATE INDEX "half_product_specifications_halfProductId_idx" ON "half_product_specifications"("halfProductId");

-- CreateIndex
CREATE INDEX "half_product_price_tiers_halfProductId_idx" ON "half_product_price_tiers"("halfProductId");

-- CreateIndex
CREATE INDEX "half_product_options_halfProductId_idx" ON "half_product_options"("halfProductId");

-- CreateIndex
CREATE UNIQUE INDEX "group_half_product_prices_groupId_halfProductId_key" ON "group_half_product_prices"("groupId", "halfProductId");

-- CreateIndex
CREATE UNIQUE INDEX "group_product_prices_groupId_productId_key" ON "group_product_prices"("groupId", "productId");

-- CreateIndex
CREATE INDEX "my_products_clientId_idx" ON "my_products"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "my_products_clientId_productType_productId_key" ON "my_products"("clientId", "productType", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_barcode_key" ON "orders"("barcode");

-- CreateIndex
CREATE INDEX "orders_clientId_idx" ON "orders"("clientId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderedAt_idx" ON "orders"("orderedAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_shippings_orderId_key" ON "order_shippings"("orderId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_files_orderItemId_idx" ON "order_files"("orderItemId");

-- CreateIndex
CREATE INDEX "process_histories_orderId_idx" ON "process_histories"("orderId");

-- CreateIndex
CREATE INDEX "reception_schedules_year_month_idx" ON "reception_schedules"("year", "month");

-- CreateIndex
CREATE INDEX "reception_schedules_status_idx" ON "reception_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reception_schedules_year_month_day_key" ON "reception_schedules"("year", "month", "day");

-- AddForeignKey
ALTER TABLE "client_groups" ADD CONSTRAINT "client_groups_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "client_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bindings" ADD CONSTRAINT "product_bindings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_papers" ADD CONSTRAINT "product_papers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_covers" ADD CONSTRAINT "product_covers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_foils" ADD CONSTRAINT "product_foils_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_finishings" ADD CONSTRAINT "product_finishings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_options" ADD CONSTRAINT "custom_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_half_products" ADD CONSTRAINT "product_half_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_half_products" ADD CONSTRAINT "product_half_products_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_products" ADD CONSTRAINT "half_products_categoryLargeId_fkey" FOREIGN KEY ("categoryLargeId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_product_specifications" ADD CONSTRAINT "half_product_specifications_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_product_price_tiers" ADD CONSTRAINT "half_product_price_tiers_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "half_product_options" ADD CONSTRAINT "half_product_options_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_half_product_prices" ADD CONSTRAINT "group_half_product_prices_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "client_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_half_product_prices" ADD CONSTRAINT "group_half_product_prices_halfProductId_fkey" FOREIGN KEY ("halfProductId") REFERENCES "half_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_product_prices" ADD CONSTRAINT "group_product_prices_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "client_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_product_prices" ADD CONSTRAINT "group_product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "my_products" ADD CONSTRAINT "my_products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_shippings" ADD CONSTRAINT "order_shippings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_histories" ADD CONSTRAINT "process_histories_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
