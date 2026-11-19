import type Database from 'better-sqlite3';

export function getClientById(
  db: Database.Database,
  clientId: number
) {
  return db.prepare(`
    SELECT
      client_id,
      client_name,
      contact_title,
      address_line1,
      address_line2,
      city,
      state_region,
      postal_code,
      country,
      direct_phone,
      mobile_phone,
      email
    FROM clients
    WHERE client_id = ?
  `).get(clientId);
}

export function getClientByProjectId(
  db: Database.Database,
  projectId: number
) {
  return db.prepare(`
    SELECT
      c.client_id,
      c.client_name,
      c.contact_title,
      c.address_line1,
      c.address_line2,
      c.city,
      c.state_region,
      c.postal_code,
      c.country,
      c.direct_phone,
      c.mobile_phone,
      c.email
    FROM clients c
    INNER JOIN projects p
      ON p.client_id = c.client_id
    WHERE p.project_id = ?
  `).get(projectId);
}