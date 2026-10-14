-- CreateIndex
CREATE INDEX "customers_business_id_created_at_idx" ON "customers"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "vehicles_business_id_created_at_idx" ON "vehicles"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "services_business_id_name_idx" ON "services"("business_id", "name");

-- CreateIndex
CREATE INDEX "staff_business_id_name_idx" ON "staff"("business_id", "name");

-- CreateIndex
CREATE INDEX "work_orders_business_id_status_accepted_at_idx" ON "work_orders"("business_id", "status", "accepted_at");
