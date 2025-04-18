import fetch from 'node-fetch';

async function resetUsers() {
  try {
    console.log('Attempting to reset all users in the system...');
    
    // First, list current users
    const listResponse = await fetch('http://localhost:5000/api/debug/list-users');
    if (listResponse.ok) {
      const users = await listResponse.json();
      console.log(`Current users in system (${users.length}):`);
      users.forEach(user => {
        console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
      });
    } else {
      console.log('Failed to list users before reset');
    }

    // Now reset all users
    const resetResponse = await fetch('http://localhost:5000/api/debug/reset-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (resetResponse.ok) {
      const result = await resetResponse.json();
      console.log('Users reset successfully:', result);
      
      // Verify reset worked by listing users again
      const verifyResponse = await fetch('http://localhost:5000/api/debug/list-users');
      if (verifyResponse.ok) {
        const remainingUsers = await verifyResponse.json();
        console.log(`Remaining users after reset: ${remainingUsers.length}`);
        if (remainingUsers.length > 0) {
          console.warn('Warning: Some users still exist in the system!');
          remainingUsers.forEach(user => {
            console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
          });
        } else {
          console.log('Success: All users have been removed from the system!');
        }
      }
    } else {
      console.error('Failed to reset users:', await resetResponse.text());
    }
  } catch (error) {
    console.error('Error during reset process:', error);
  }
}

resetUsers();