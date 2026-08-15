const prisma = require('./db');

// Generates the next sequential, human-readable document number for a given
// prefix (e.g. "QT-DM", "INV-FO", "PO-MT" - business code folded in already),
// scoped by calendar year, e.g. "QT-DM-2026-001". Uses a dedicated sequence
// table + upsert so numbers stay gapless even if the underlying record
// creation later fails inside the same transaction. Each business gets its
// own independent series because its code is part of the stored prefix.
async function nextDocNumber(tx, prefix) {
  const year = new Date().getFullYear();
  const client = tx || prisma;

  const existing = await client.documentSequence.findUnique({
    where: { prefix_year: { prefix, year } },
  });

  let seq;
  if (existing) {
    const updated = await client.documentSequence.update({
      where: { id: existing.id },
      data: { seq: { increment: 1 } },
    });
    seq = updated.seq;
  } else {
    const created = await client.documentSequence.create({
      data: { prefix, year, seq: 1 },
    });
    seq = created.seq;
  }

  const padded = String(seq).padStart(3, '0');
  return `${prefix}-${year}-${padded}`;
}

module.exports = { nextDocNumber };
