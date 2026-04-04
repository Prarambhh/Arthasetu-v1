import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Users
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.string("name").notNullable();
    table.string("email").notNullable().unique();
    table.string("hashed_password").notNullable();
    table.timestamps(true, true); // created_at, updated_at
  });

  // Wallets
  await knex.schema.createTable("wallets", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("user_id").notNullable().unique().references("id").inTable("users").onDelete("CASCADE");
    table.decimal("balance", 14, 2).notNullable().defaultTo(0);
    // Add check constraint to ensure balance >= 0
    table.timestamps(true, true);
  });
  await knex.raw('ALTER TABLE "wallets" ADD CONSTRAINT check_wallet_balance_positive CHECK ("balance" >= 0)');

  // Loans
  await knex.schema.createTable("loans", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("borrower_id").notNullable().references("id").inTable("users");
    table.uuid("lender_id").nullable().references("id").inTable("users");
    table.decimal("amount", 14, 2).notNullable();
    table.enum("status", [
      "requested",
      "docs_requested",
      "under_review",
      "approved",
      "disbursed",
      "settled",
      "rejected"
    ]).notNullable().defaultTo("requested");
    table.timestamp("requested_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Loan Requirements
  await knex.schema.createTable("loan_requirements", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("loan_id").notNullable().references("id").inTable("loans").onDelete("CASCADE");
    table.enum("type", ["document", "guarantors"]).notNullable(); // 'guarantors' or 'document'
    table.string("label").notNullable();
    table.boolean("fulfilled").notNullable().defaultTo(false);
  });

  // Loan Documents
  await knex.schema.createTable("loan_documents", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("loan_id").notNullable().references("id").inTable("loans").onDelete("CASCADE");
    table.uuid("requirement_id").notNullable().references("id").inTable("loan_requirements").onDelete("CASCADE");
    table.uuid("uploaded_by").notNullable().references("id").inTable("users");
    table.string("file_reference").notNullable();
    table.timestamp("uploaded_at").defaultTo(knex.fn.now());
  });

  // Guarantors
  await knex.schema.createTable("guarantors", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("loan_id").notNullable().references("id").inTable("loans").onDelete("CASCADE");
    table.uuid("user_id").notNullable().references("id").inTable("users");
    table.enum("status", ["pending", "approved", "rejected"]).notNullable().defaultTo("pending");
    table.timestamp("responded_at").nullable();
    table.unique(["loan_id", "user_id"]);
  });

  // Wallet Transactions
  await knex.schema.createTable("wallet_transactions", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("loan_id").notNullable().references("id").inTable("loans");
    table.uuid("debit_wallet_id").notNullable().references("id").inTable("wallets");
    table.uuid("credit_wallet_id").notNullable().references("id").inTable("wallets");
    table.decimal("amount", 14, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // Contracts
  await knex.schema.createTable("contracts", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("loan_id").notNullable().unique().references("id").inTable("loans");
    table.uuid("borrower_id").notNullable().references("id").inTable("users");
    table.uuid("lender_id").nullable().references("id").inTable("users");
    table.decimal("amount", 14, 2).notNullable();
    table.enum("status", ["pending", "settled"]).notNullable().defaultTo("pending");
    table.timestamp("issued_at").defaultTo(knex.fn.now());
    table.timestamp("settled_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("contracts");
  await knex.schema.dropTableIfExists("wallet_transactions");
  await knex.schema.dropTableIfExists("guarantors");
  await knex.schema.dropTableIfExists("loan_documents");
  await knex.schema.dropTableIfExists("loan_requirements");
  await knex.schema.dropTableIfExists("loans");
  await knex.schema.dropTableIfExists("wallets");
  await knex.schema.dropTableIfExists("users");
}
