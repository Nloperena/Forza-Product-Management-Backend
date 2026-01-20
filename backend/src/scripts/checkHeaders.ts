import axios from 'axios';

async function checkHeaders() {
    try {
        const response = await axios.get('https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/products/C150');
        console.log('Headers:', response.headers);
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

checkHeaders();
