-- CreateTable
CREATE TABLE "media_events" (
    "id" BIGSERIAL NOT NULL,
    "media_id" INTEGER NOT NULL,
    "event_type" VARCHAR(20) NOT NULL,
    "source" VARCHAR(30),
    "ip_hash" VARCHAR(128),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_notifications" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(600) NOT NULL,
    "target_url" TEXT,
    "payload" JSONB,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_admin_id" UUID,
    CONSTRAINT "push_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" BIGSERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_media_events_created_at" ON "media_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_media_events_event_type" ON "media_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_media_events_media_id" ON "media_events"("media_id");

-- CreateIndex
CREATE INDEX "idx_push_notifications_created_at" ON "push_notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_push_notifications_created_by_admin" ON "push_notifications"("created_by_admin_id");

-- CreateIndex
CREATE INDEX "idx_push_notifications_sent_at" ON "push_notifications"("sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "idx_push_subscriptions_is_active" ON "push_subscriptions"("is_active");

-- CreateIndex
CREATE INDEX "idx_push_subscriptions_updated_at" ON "push_subscriptions"("updated_at");

-- AddForeignKey
ALTER TABLE "media_events" ADD CONSTRAINT "media_events_media_id_fkey"
FOREIGN KEY ("media_id") REFERENCES "learning_media"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_notifications" ADD CONSTRAINT "push_notifications_created_by_admin_id_fkey"
FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
