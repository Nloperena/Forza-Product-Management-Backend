import express from 'express';
import { ProductController } from '../controllers/productController';

const router = express.Router();

// Lazy initialization of controller to avoid database connection issues
let productController: ProductController | null = null;

function getProductController(): ProductController {
  if (!productController) {
    productController = new ProductController();
  }
  return productController;
}

// GET /api/statistics - Get product statistics
router.get('/', (req, res) => getProductController().getStatistics(req, res));

export default router;
