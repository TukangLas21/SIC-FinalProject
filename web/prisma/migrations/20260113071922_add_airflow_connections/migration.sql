-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('INTAKE', 'EXHAUST', 'TRANSFER');

-- CreateEnum
CREATE TYPE "BSLLevel" AS ENUM ('BSL_1', 'BSL_2', 'BSL_3', 'BSL_4');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('EXHAUST_FAN', 'INTAKE_FAN', 'AC_UNIT', 'DOOR_SENSOR', 'LIGHTING', 'TEMPERATURE', 'HUMIDITY', 'AIR_PRESSURE', 'AIR_QUALITY', 'OTHER');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bslLevel" "BSLLevel" NOT NULL DEFAULT 'BSL_1',
    "targetPressure" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "targetTemp" DOUBLE PRECISION NOT NULL DEFAULT 24.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "setting" DOUBLE PRECISION,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorLog" (
    "id" SERIAL NOT NULL,
    "roomId" TEXT NOT NULL,
    "pressure" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "co2Level" DOUBLE PRECISION,
    "anomalyStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerLog" (
    "id" SERIAL NOT NULL,
    "componentId" TEXT NOT NULL,
    "voltage" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL,
    "power" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PowerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirflowConnection" (
    "id" TEXT NOT NULL,
    "sourceRoomId" TEXT NOT NULL,
    "targetRoomId" TEXT NOT NULL,
    "flowType" "FlowType" NOT NULL DEFAULT 'EXHAUST',
    "flowRate" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirflowConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SensorLog_roomId_createdAt_idx" ON "SensorLog"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "AirflowConnection_sourceRoomId_idx" ON "AirflowConnection"("sourceRoomId");

-- CreateIndex
CREATE INDEX "AirflowConnection_targetRoomId_idx" ON "AirflowConnection"("targetRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "AirflowConnection_sourceRoomId_targetRoomId_key" ON "AirflowConnection"("sourceRoomId", "targetRoomId");

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorLog" ADD CONSTRAINT "SensorLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerLog" ADD CONSTRAINT "PowerLog_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirflowConnection" ADD CONSTRAINT "AirflowConnection_sourceRoomId_fkey" FOREIGN KEY ("sourceRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirflowConnection" ADD CONSTRAINT "AirflowConnection_targetRoomId_fkey" FOREIGN KEY ("targetRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
