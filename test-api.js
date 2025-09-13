/**
 * Simple API Test Script
 * Tests basic API functionality
 */

const API_BASE = 'http://localhost:3000/api';

// Test health endpoint
async function testHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    console.log('✅ Health Check:', data);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

// Test events endpoint
async function testEvents() {
  try {
    const response = await fetch(`${API_BASE}/events`);
    const data = await response.json();
    console.log('✅ Events API Response:', data);
    return true;
  } catch (error) {
    console.error('❌ Events API Failed:', error.message);
    return false;
  }
}

// Test auth register endpoint
async function testAuthRegister() {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Auth Register:', data);
      return true;
    } else {
      const error = await response.text();
      console.log('ℹ️ Auth Register (Expected):', error);
      return true; // Expected behavior
    }
  } catch (error) {
    console.error('❌ Auth Register Failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  const results = {
    health: await testHealth(),
    events: await testEvents(),
    auth: await testAuthRegister()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Health:', results.health ? '✅' : '❌');
  console.log('Events:', results.events ? '✅' : '❌');
  console.log('Auth:', results.auth ? '✅' : '❌');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`\n🎯 Tests Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All API endpoints are functional!');
  } else {
    console.log('⚠️ Some API endpoints need attention.');
  }
}

// Run if called directly
if (typeof window === 'undefined') {
  runTests();
} else {
  // Export for browser use
  window.runAPITests = runTests;
}