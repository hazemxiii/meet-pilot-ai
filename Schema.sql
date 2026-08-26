CREATE TABLE "users" (
  "id" integer PRIMARY KEY,
  "provider" text NOT NULL,
  "provider_user_id" text NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "avatar_url" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "memory_items" (
  "id" integer PRIMARY KEY,
  "user_id" integer NOT NULL,
  "content" text DEFAULT '',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "tasks" (
  "id" integer PRIMARY KEY,
  "user_id" integer NOT NULL,
  "title" text DEFAULT '',
  "details" text DEFAULT '',
  "done" boolean DEFAULT 0,
  "deadline" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "notes" (
  "id" integer PRIMARY KEY,
  "user_id" integer NOT NULL,
  "title" text DEFAULT '',
  "details" text DEFAULT '',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "tags" (
  "id" integer PRIMARY KEY,
  "name" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "note_tags" (
  "note_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "meetings" (
  "id" integer PRIMARY KEY,
  "user_id" integer NOT NULL,
  "external_id" text,
  "title" text DEFAULT '',
  "transcript" text DEFAULT '',
  "time" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "meetings_user_external_key" ON "meetings" ("user_id", "external_id");

CREATE TABLE "files" (
  "id" integer PRIMARY KEY,
  "task_id" integer,
  "note_id" integer,
  "meeting_id" integer,
  "mime_type" text NOT NULL,
  "file_path" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

ALTER TABLE "memory_items" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tasks" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "meetings" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "note_tags" ADD FOREIGN KEY ("note_id") REFERENCES "notes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "note_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "files" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "files" ADD FOREIGN KEY ("note_id") REFERENCES "notes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "files" ADD FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") DEFERRABLE INITIALLY IMMEDIATE;
