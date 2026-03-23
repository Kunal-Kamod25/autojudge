// This file drives the test-apis feature flow and keeps the behavior easy to reason about.
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// testApis handles one focused part of this file's workflow.
const testApis = async () => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    console.log('--- Testing Health Endpoint ---');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('Health:', health.data.status);

    console.log('\n--- Testing Login (Admin) ---');
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@autojudge.com',
        password: 'adminpassword123'
      });
      console.log('Login Success:', loginRes.data.success);
      const token = loginRes.data.accessToken;

      console.log('\n--- Testing Assignments Fetch ---');
      const assignmentsRes = await axios.get(`${BASE_URL}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Assignments Found:', assignmentsRes.data.assignments.length);
      if (assignmentsRes.data.assignments.length > 0) {
        console.log('First Assignment:', assignmentsRes.data.assignments[0].title);
      }
    } catch (err) {
      console.error('Login/Assignments Error:', err.response?.data || err.message);
    }

  } catch (err) {
    console.error('Fatal Error:', err.message);
  }
};

testApis();
