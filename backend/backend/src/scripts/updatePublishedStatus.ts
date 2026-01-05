import { Pool } from 'pg';

class PublishedStatusUpdater {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  async updatePublishedStatus(): Promise<void> {
    try {
      console.log('🔄 Updating published status for some products...');
      
      // Set some products to published: false (every 3rd product)
      const result = await this.pool.query(`
        UPDATE products 
        SET published = false 
        WHERE id % 3 = 0
      `);
      
      console.log(`✅ Updated ${result.rowCount} products to published: false`);
      
      // Verify the update
      const publishedCount = await this.pool.query('SELECT COUNT(*) FROM products WHERE published = true');
      const unpublishedCount = await this.pool.query('SELECT COUNT(*) FROM products WHERE published = false');
      
      console.log(`📊 Published products: ${publishedCount.rows[0].count}`);
      console.log(`📊 Unpublished products: ${unpublishedCount.rows[0].count}`);
      
    } catch (error) {
      console.error('❌ Error updating published status:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new PublishedStatusUpdater();
  updater.updatePublishedStatus()
    .then(() => {
      console.log('🎉 Published status update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Published status update failed:', error);
      process.exit(1);
    });
}

export { PublishedStatusUpdater };
