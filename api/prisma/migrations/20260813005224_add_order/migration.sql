-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "miles" INTEGER NOT NULL,
    "taxesBrl" DOUBLE PRECISION NOT NULL,
    "passengerName" TEXT NOT NULL,
    "passengerCpf" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
