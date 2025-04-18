import fetch from 'node-fetch';

async function findUser(searchUsername) {
  try {
    // First, check all users
    const response = await fetch('http://localhost:5000/api/debug/list-users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const users = await response.json();
      console.log('All registered users:');
      users.forEach(user => {
        console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Name: ${user.firstName} ${user.lastName}`);
      });
      
      // Check if the user exists
      const foundUser = users.find(user => 
        user.username.toLowerCase() === searchUsername.toLowerCase() || 
        user.email.toLowerCase() === searchUsername.toLowerCase()
      );
      
      if (foundUser) {
        console.log('\nFound matching user:');
        console.log(foundUser);
      } else {
        console.log(`\nNo user found with username or email: ${searchUsername}`);
      }
    } else {
      console.error('Failed to fetch users list. Adding debug endpoint...');
    }
  } catch (error) {
    console.error('Error during user search:', error);
  }
}

// You can change this to your actual username or email to check
const searchUsername = process.argv[2] || 'cbarmore';
findUser(searchUsername);