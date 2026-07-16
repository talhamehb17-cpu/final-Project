require('dotenv').config();

async function testAdminAPI() {
  const API_BASE = 'https://final-project-production-13f4.up.railway.app/api/admin';
  
  try {
    // 1. Login
    console.log('1. Testing Admin Login...');
    const loginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      })
    });
    
    const loginData = await loginRes.json();
    console.log('Login Response:', loginRes.status, loginData.message || 'Success');
    
    if (!loginData.token) {
      console.error('Login failed');
      return;
    }
    
    const token = loginData.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Verify Token
    console.log('\n2. Testing Token Verification...');
    const verifyRes = await fetch(`${API_BASE}/verify`, { headers });
    const verifyData = await verifyRes.json();
    console.log('Verify Response:', verifyRes.status, verifyData.message || 'Success');
    
    // 3. Dashboard Stats
    console.log('\n3. Testing Dashboard Stats...');
    const statsRes = await fetch(`${API_BASE}/stats`, { headers });
    const statsData = await statsRes.json();
    console.log('Stats Response:', statsRes.status);
    if (statsRes.ok) {
      console.log('  - Total Orders:', statsData.totalOrders);
      console.log('  - Total Revenue:', statsData.totalRevenue);
      console.log('  - Total Customers:', statsData.totalCustomers);
      console.log('  - Total Products:', statsData.totalProducts);
      console.log('  - Order Statuses:', statsData.orderStatuses);
      console.log('  - Low Stock Count:', statsData.lowStockCount);
      console.log('  - Recent Orders:', statsData.recentOrders?.length || 0);
    } else {
      console.log('  Error:', statsData.message);
    }
    
    // 4. Products
    console.log('\n4. Testing Products...');
    const productsRes = await fetch(`${API_BASE}/products`, { headers });
    const productsData = await productsRes.json();
    console.log('Products Response:', productsRes.status);
    if (productsRes.ok) {
      console.log('  - Total Products:', productsData.products?.length || 0);
      console.log('  - Pagination:', productsData.pagination);
    } else {
      console.log('  Error:', productsData.message);
    }
    
    // 5. Orders
    console.log('\n5. Testing Orders...');
    const ordersRes = await fetch(`${API_BASE}/orders`, { headers });
    const ordersData = await ordersRes.json();
    console.log('Orders Response:', ordersRes.status);
    if (ordersRes.ok) {
      console.log('  - Total Orders:', ordersData.orders?.length || 0);
      console.log('  - Pagination:', ordersData.pagination);
      if (ordersData.orders?.length > 0) {
        console.log('  - First Order ID:', ordersData.orders[0].orderId);
        console.log('  - First Order Items:', ordersData.orders[0].items?.length || 0);
      }
    } else {
      console.log('  Error:', ordersData.message);
    }
    
    // 6. Customers
    console.log('\n6. Testing Customers...');
    const customersRes = await fetch(`${API_BASE}/customers`, { headers });
    const customersData = await customersRes.json();
    console.log('Customers Response:', customersRes.status);
    if (customersRes.ok) {
      console.log('  - Total Customers:', customersData.customers?.length || 0);
      console.log('  - Pagination:', customersData.pagination);
    } else {
      console.log('  Error:', customersData.message);
    }
    
    // 7. Inventory
    console.log('\n7. Testing Inventory...');
    const inventoryRes = await fetch(`${API_BASE}/inventory`, { headers });
    const inventoryData = await inventoryRes.json();
    console.log('Inventory Response:', inventoryRes.status);
    if (inventoryRes.ok) {
      console.log('  - Total Products:', inventoryData.products?.length || 0);
      console.log('  - Pagination:', inventoryData.pagination);
    } else {
      console.log('  Error:', inventoryData.message);
    }
    
    // 8. Analytics
    console.log('\n8. Testing Analytics...');
    const analyticsRes = await fetch(`${API_BASE}/analytics`, { headers });
    const analyticsData = await analyticsRes.json();
    console.log('Analytics Response:', analyticsRes.status);
    if (analyticsRes.ok) {
      console.log('  - Sales Data Points:', analyticsData.salesData?.length || 0);
      console.log('  - Best Sellers:', analyticsData.bestSellers?.length || 0);
      console.log('  - Customer Growth:', analyticsData.customerGrowth?.length || 0);
      console.log('  - Category Revenue:', analyticsData.categoryRevenue?.length || 0);
    } else {
      console.log('  Error:', analyticsData.message);
    }
    
    console.log('\n✅ Admin API Test Complete');
    
  } catch (error) {
    console.error('Test Error:', error.message);
  }
}

testAdminAPI();
