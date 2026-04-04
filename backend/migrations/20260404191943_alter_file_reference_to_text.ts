import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('loan_documents', (table) => {
    table.text('file_reference').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('loan_documents', (table) => {
    table.string('file_reference', 255).alter();
  });
}
