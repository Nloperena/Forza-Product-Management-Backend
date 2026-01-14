import axios from 'axios';

async function verify() {
    try {
        const response = await axios.get('https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/products');
        const c150 = response.data.find((p: any) => p.product_id === 'C150');
        
        if (c150) {
            console.log('--- C150 API LIST VERIFICATION ---');
            console.log('Product ID:', c150.product_id);
            console.log('Description:', c150.description);
            console.log('----------------------------------');
        } else {
            console.log('C150 not found in list');
        }
    } catch (error: any) {
        console.error('Error fetching API:', error.message);
    }
}

verify();




