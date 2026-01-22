import { Router, Request, Response } from 'express';
import { auditLogModel } from '../models/AuditLog';

const router = Router();

// Get audit logs with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      entity_type, 
      entity_id, 
      action, 
      user_name,
      limit = '50',
      offset = '0'
    } = req.query;
    
    const result = await auditLogModel.getLogs({
      entity_type: entity_type as string,
      entity_id: entity_id as string,
      action: action as string,
      user_name: user_name as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    
    return res.json({ 
      success: true, 
      logs: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get audit log by ID (for viewing full before/after data)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const log = await auditLogModel.getLogById(id);
    
    if (!log) {
      return res.status(404).json({ success: false, error: 'Audit log not found' });
    }
    
    return res.json({ success: true, log });
  } catch (error: any) {
    console.error('Error fetching audit log:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get audit logs for a specific product
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { limit = '20', offset = '0' } = req.query;
    
    const result = await auditLogModel.getLogs({
      entity_type: 'product',
      entity_id: productId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    
    return res.json({ 
      success: true, 
      logs: result.logs,
      total: result.total
    });
  } catch (error: any) {
    console.error('Error fetching product audit logs:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

