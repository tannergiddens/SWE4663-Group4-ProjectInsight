import { Router } from 'express';
import type Database from 'better-sqlite3';

import { getClientByProjectId } from '../database/repositories/clientRepository.js';

export function createClientRoutes(db: Database.Database) {
  const router = Router();

  // GET /api/projects/:projectId/client
  router.get('/projects/:projectId/client', (req, res) => {

    const projectId = Number(req.params.projectId);

    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      res.status(400).json({
        error: 'Invalid project ID',
      });
      return;
    }

    try {
      const client = getClientByProjectId(db, projectId);

      if (!client) {
        res.status(404).json({
          error: 'Client not found for this project',
        });
        return;
      }

      res.json(client);

    } catch (error) {
      console.error('Error retrieving client:', error);

      res.status(500).json({
        error: 'Unable to retrieve client information',
      });
    }
  });

  return router;
}