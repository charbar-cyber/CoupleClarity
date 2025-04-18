import fetch from 'node-fetch';

async function testLogin() {
  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'cbarmore',
        password: 'password123'
      }),
    });

    const data = await response.json();
    console.log('Login response status:', response.status);
    console.log('Login response:', data);

    if (response.ok) {
      console.log('Login successful!');
    } else {
      console.error('Login failed:', data.error);
    }
  } catch (error) {
    console.error('Error during login:', error);
  }
}

testLogin();