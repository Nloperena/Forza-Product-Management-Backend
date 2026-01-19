import { Router, Request, Response } from 'express';
import { backupModel } from '../models/Backup';

const router = Router();

// Get all backups
router.get('/', async (req: Request, res: Response) => {
  try {
    const backups = await backupModel.getAllBackups();
    res.json({ success: true, backups });
  } catch (error: any) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get backup by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const backup = await backupModel.getBackupById(id);
    
    if (!backup) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    
    res.json({ success: true, backup });
  } catch (error: any) {
    console.error('Error fetching backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get backup preview (list of products without full data)
router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const preview = await backupModel.getBackupPreview(id);
    
    if (!preview) {
      return res.status(404).json({ success: false, error: 'Backup not found or has no data' });
    }
    
    res.json({ success: true, ...preview });
  } catch (error: any) {
    console.error('Error fetching backup preview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new backup
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, created_by } = req.body;
    
    if (!name || !created_by) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and created_by are required' 
      });
    }
    
    const backup = await backupModel.createBackup(name, description, created_by);
    res.status(201).json({ success: true, backup });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Promote (restore) a backup to production
router.post('/:id/promote', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { promoted_by } = req.body;
    
    if (!promoted_by) {
      return res.status(400).json({ 
        success: false, 
        error: 'promoted_by is required' 
      });
    }
    
    const result = await backupModel.promoteBackup(id, promoted_by);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Error promoting backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a backup
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { deleted_by } = req.body;
    
    const deleted = await backupModel.deleteBackup(id, deleted_by || 'Unknown');
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

