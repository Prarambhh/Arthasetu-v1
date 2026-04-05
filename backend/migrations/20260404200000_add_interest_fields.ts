import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add interest_rate to loans
  await knex.schema.alterTable("loans", (table) => {
    table.decimal("interest_rate", 5, 2).nullable(); // 1.00 to 15.00
  });

  // Add outstanding_principal and last_payment_at to contracts
  await knex.schema.alterTable("contracts", (table) => {
    table.decimal("outstanding_principal", 14, 2).notNullable().defaultTo(0);
    // last_payment_at defaults to the contract issue date usually, but we will manage this explicitly in code.
    table.timestamp("last_payment_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("contracts", (table) => {
    table.dropColumn("last_payment_at");
    table.dropColumn("outstanding_principal");
  });

  await knex.schema.alterTable("loans", (table) => {
    table.dropColumn("interest_rate");
  });
}
