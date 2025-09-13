// Simple service test using native fetch (Node.js 18+)
const BASE_URL = 'http://localhost:3000';

const testEndpoints = [
  { name: 'Health Check', path: '/health', method: 'GET' },
  { name: 'Events API', path: '/api/events', method: 'GET' },
  { name: 'Featured Events', path: '/api/events/featured', method: 'GET' },
  { name: 'Tickets API', path: '/api/tickets', method: 'GET' },
  { name: 'Users API', path: '/api/users', method: 'GET' },
  { name: 'Payments API', path: '/api/payments', method: 'GET' },
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🧪 Testing ${endpoint.name}...`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success! Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Failed! Error:`, errorText.substring(0, 200) + '...');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 RobustTicketing Service Integration Tests');
  console.log('=' .repeat(50));
  
  let passed = 0;
  let total = testEndpoints.length;

  for (const endpoint of testEndpoints) {
    const success = await testEndpoint(endpoint);
    if (success) passed++;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} endpoints working`);
  
  if (passed === total) {
    console.log('🎉 All services are operational!');
  } else {
    console.log('⚠️  Some services need attention.');
  }
}

// Run tests
runAllTests().catch(console.error);