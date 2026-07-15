require('dotenv').config();

async function testCRUD() {
  const API_BASE = 'http://localhost:5000/api/admin';
  
  try {
    // 1. Login
    console.log('1. Admin Login...');
    const loginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.token) {
      console.error('❌ Login failed');
      return;
    }
    console.log('✅ Login successful');
    
    const token = loginData.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Test Product CRUD
    console.log('\n2. Testing Product CRUD...');
    
    // Create Product
    console.log('  2a. Creating product...');
    const createProductRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        product_name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        category: 'fashion',
        stock: 50,
        images: ['https://via.placeholder.com/300'],
        colors: ['black', 'white'],
        sizes: 'S,M,L,XL'
      })
    });
    
    const createProductData = await createProductRes.json();
    if (createProductRes.ok) {
      console.log('✅ Product created:', createProductData.product?.id);
      const productId = createProductData.product?.id;
      
      // Read Product
      console.log('  2b. Reading product...');
      const readProductRes = await fetch(`${API_BASE}/products/${productId}`, { headers });
      const readProductText = await readProductRes.text();
      const readProductData = JSON.parse(readProductText);
      if (readProductRes.ok) {
        console.log('✅ Product read:', readProductData.product?.product_name);
        
        // Update Product
        console.log('  2c. Updating product...');
        const updateProductRes = await fetch(`${API_BASE}/products/${productId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            product_name: 'Updated Test Product',
            price: 149.99
          })
        });
        
        const updateProductData = await updateProductRes.json();
        if (updateProductRes.ok) {
          console.log('✅ Product updated');
          
          // Delete Product
          console.log('  2d. Deleting product...');
          const deleteProductRes = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'DELETE',
            headers
          });
          
          if (deleteProductRes.ok) {
            console.log('✅ Product deleted');
          } else {
            console.log('❌ Product delete failed');
          }
        } else {
          console.log('❌ Product update failed');
        }
      } else {
        console.log('❌ Product read failed');
      }
    } else {
      console.log('❌ Product create failed:', createProductData.message);
    }
    
    // 3. Test Order Status Update
    console.log('\n3. Testing Order Status Update...');
    const ordersRes = await fetch(`${API_BASE}/orders`, { headers });
    const ordersText = await ordersRes.text();
    const ordersData = JSON.parse(ordersText);
    
    if (ordersRes.ok && ordersData.orders?.length > 0) {
      const orderId = ordersData.orders[0].orderId;
      console.log(`  Updating order ${orderId} status...`);
      
      const updateOrderRes = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'processing' })
      });
      
      const updateOrderText = await updateOrderRes.text();
      const updateOrderData = JSON.parse(updateOrderText);
      
      if (updateOrderRes.ok) {
        console.log('✅ Order status updated');
      } else {
        console.log('❌ Order status update failed:', updateOrderData.message);
      }
    } else {
      console.log('⚠️  No orders found to test');
    }
    
    // 4. Test Public APIs
    console.log('\n4. Testing Public APIs...');
    
    // Get Products
    const publicProductsRes = await fetch('http://localhost:5000/api/products');
    const publicProductsText = await publicProductsRes.text();
    const publicProductsData = JSON.parse(publicProductsText);
    
    if (publicProductsRes.ok) {
      console.log('✅ Public products API:', publicProductsData.products?.length || 0, 'products');
      
      // Get Single Product
      if (publicProductsData.products?.length > 0) {
        const singleProductRes = await fetch(`http://localhost:5000/api/products/${publicProductsData.products[0].id}`);
        const singleProductText = await singleProductRes.text();
        const singleProductData = JSON.parse(singleProductText);
        
        if (singleProductRes.ok) {
          console.log('✅ Single product API working');
        } else {
          console.log('❌ Single product API failed');
        }
      }
    } else {
      console.log('❌ Public products API failed');
    }
    
    console.log('\n✅ CRUD Testing Complete');
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testCRUD();
