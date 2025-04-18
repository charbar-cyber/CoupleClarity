import fetch from 'node-fetch';

// This script tests the emotion tracking and analysis features of CoupleClarity
async function main() {
  // Login as test user to get session cookie
  console.log('Logging in as testuser...');
  const loginResponse = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'testuser',
      password: 'password123'
    }),
    redirect: 'manual'
  });

  // Get the cookies from the response
  const cookies = loginResponse.headers.get('set-cookie');
  
  if (!cookies) {
    console.error('Login failed: No cookies returned');
    return;
  }

  console.log('Login successful, got session cookie');

  // Add a few emotional expressions
  const emotions = [
    {
      emotion: 'happy',
      context: 'Feeling good about our recent date night',
      intensity: 8,
      tags: ['date', 'quality-time']
    },
    {
      emotion: 'anxious',
      context: 'Worried about our upcoming conversation about finances',
      intensity: 7,
      tags: ['money', 'future']
    },
    {
      emotion: 'grateful',
      context: 'Partner made breakfast this morning',
      intensity: 9,
      tags: ['acts-of-service', 'appreciation']
    },
    {
      emotion: 'frustrated',
      context: 'Partner was late again for our planned movie night',
      intensity: 6,
      tags: ['time-management', 'plans']
    },
    {
      emotion: 'loved',
      context: 'Partner sent a supportive message during my difficult work day',
      intensity: 10,
      tags: ['support', 'words-of-affirmation']
    }
  ];

  console.log('Adding emotional expressions...');
  for (const emotion of emotions) {
    const response = await fetch('http://localhost:5000/api/emotional-expressions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(emotion)
    });

    if (response.ok) {
      console.log(`Added ${emotion.emotion} emotional expression`);
    } else {
      console.error(`Failed to add ${emotion.emotion}: ${await response.text()}`);
    }
  }

  // Get all emotions
  console.log('\nFetching all emotional expressions...');
  const getEmotionsResponse = await fetch('http://localhost:5000/api/emotional-expressions', {
    headers: {
      'Cookie': cookies
    }
  });

  if (getEmotionsResponse.ok) {
    const emotions = await getEmotionsResponse.json();
    console.log(`Found ${emotions.length} emotional expressions:`);
    emotions.forEach((e: any) => {
      console.log(`- ${e.emotion} (intensity: ${e.intensity}): ${e.context}`);
    });
  } else {
    console.error('Failed to fetch emotions:', await getEmotionsResponse.text());
  }

  // Get emotion patterns analysis
  console.log('\nFetching emotion patterns analysis...');
  const patternsResponse = await fetch('http://localhost:5000/api/emotions/patterns', {
    headers: {
      'Cookie': cookies
    }
  });

  if (patternsResponse.ok) {
    const patterns = await patternsResponse.json();
    console.log('Emotion patterns analysis:');
    console.log(JSON.stringify(patterns, null, 2));
  } else {
    console.error('Failed to fetch patterns:', await patternsResponse.text());
  }
}

main().catch(console.error);