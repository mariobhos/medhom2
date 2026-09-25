CREATE TABLE "dose_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treatment_id" uuid,
	"medicine_id" uuid NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" text DEFAULT 'tablets' NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"batch_id" uuid,
	"dose_event_id" uuid,
	"type" text NOT NULL,
	"quantity_delta" double precision NOT NULL,
	"unit" text DEFAULT 'tablets' NOT NULL,
	"quantity_after" double precision,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicine_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'tablets' NOT NULL,
	"expiration_date" date,
	"added_at" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active_ingredient" text,
	"strength" text,
	"form" text DEFAULT 'other' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"name" text,
	"dose_quantity" double precision NOT NULL,
	"doses_per_day" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dose_events" ADD CONSTRAINT "dose_events_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_events" ADD CONSTRAINT "dose_events_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_batch_id_medicine_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."medicine_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_dose_event_id_dose_events_id_fk" FOREIGN KEY ("dose_event_id") REFERENCES "public"."dose_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_batches" ADD CONSTRAINT "medicine_batches_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dose_events_treatment_idx" ON "dose_events" USING btree ("treatment_id");--> statement-breakpoint
CREATE INDEX "dose_events_taken_at_idx" ON "dose_events" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX "inventory_transactions_medicine_idx" ON "inventory_transactions" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_created_at_idx" ON "inventory_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "medicine_batches_medicine_idx" ON "medicine_batches" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "medicine_batches_expiration_idx" ON "medicine_batches" USING btree ("expiration_date");--> statement-breakpoint
CREATE INDEX "medicines_name_idx" ON "medicines" USING btree ("name");--> statement-breakpoint
CREATE INDEX "treatments_medicine_idx" ON "treatments" USING btree ("medicine_id");