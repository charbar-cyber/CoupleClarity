import fetch from 'node-fetch';
import { createHash } from 'crypto';

async function createUser() {
  try {
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'cbarmore',
        password: 'password123', // This will be hashed by the server
        firstName: 'Cbarmore',
        lastName: 'User',
        email: 'cbarmorecpa@gmail.com',
        displayName: 'Cbarmore'
      }),
    });

    const data = await response.json();
    console.log('Registration response:', data);

    if (response.ok) {
      console.log('User created successfully!');
      console.log('Username: cbarmore');
      console.log('Password: password123');
    } else {
      console.error('Failed to create user:', data.error);
    }
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

// Let's also check existing users
async function listUsers() {
  try {
    const response = await fetch('http://localhost:5000/api/debug/list-users');
    if (response.ok) {
      const users = await response.json();
      console.log('\nAll registered users:');
      users.forEach(user => {
        console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Name: ${user.firstName} ${user.lastName}`);
      });
    } else {
      console.error('Failed to fetch users list');
    }
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

// Run both functions
async function main() {
  // List users before
  await listUsers();
  
  // Create new user
  await createUser();
  
  // List users after
  await listUsers();
}

main();