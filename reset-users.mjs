import fetch from 'node-fetch';

async function resetUsers() {
  try {
    // We'll add a debug endpoint to reset users
    const response = await fetch('http://localhost:5000/api/debug/reset-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Users reset successfully:', result);
    } else {
      console.error('Failed to reset users:', await response.text());
    }
  } catch (error) {
    console.error('Error resetting users:', error);
  }
}

resetUsers();