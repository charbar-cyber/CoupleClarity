import fetch from 'node-fetch';

async function createTestUser() {
  try {
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testcouple',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        email: 'testcouple@example.com',
        displayName: 'Test Couple'
      }),
    });

    const data = await response.json();
    console.log('Registration response:', data);

    if (response.ok) {
      console.log('Test user created successfully!');
      console.log('Username: testcouple');
      console.log('Password: password123');
    } else {
      console.error('Failed to create test user:', data.error);
    }
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();