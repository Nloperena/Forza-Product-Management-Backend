import axios from 'axios';

async function verify() {
    try {
        const response = await axios.get('https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/products/C150');
        console.log('--- C150 API VERIFICATION ---');
        console.log('Product ID:', response.data.product_id);
        console.log('Name:', response.data.name);
        console.log('Description:', response.data.description);
        console.log('Applications:', JSON.stringify(response.data.applications, null, 2));
        console.log('-----------------------------');
    } catch (error: any) {
        console.error('Error fetching API:', error.message);
    }
}

verify();

