import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [request, setRequest] = useState('');
  const [requests, setRequests] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchRequests();
    }
  }, [isLoggedIn]);

  const fetchRequests = async () => {
    if (userId) {
      const { data, error } = await supabase
        .from('Requests')
        .select('id, user_id, Request, status');
      if (error) {
        console.error('Error fetching requests:', error);
      } else {
        setRequests(data);
      }
    }
  };

  const handleAuth = async (e, action) => {
    e.preventDefault();
    if (action === 'register') {
      const { data, error } = await supabase
        .from('Users')
        .insert([{ email, password }])
        .select();
      if (error) {
        console.error('Error registering user:', error);
      } else {
        setUserId(data[0].id);
        setIsLoggedIn(true);
      }
    } else if (action === 'login') {
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('email', email)
        .eq('password', password);
      if (error || data.length === 0) {
        console.error('Error logging in:', error || 'Invalid credentials');
      } else {
        setUserId(data[0].id);
        setIsLoggedIn(true);
      }
    }
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!request) {
      console.error('Request cannot be empty');
      return;
    }
    try {
      const requestBody = { request };
  
      const response = await fetch('http://localhost:4000/publish-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const { data, error } = await supabase
      .from('Requests')
      .insert([{ user_id: userId, Request: request, status: 'pending' }]);
      if (error) {
        console.error('Error submitting request:', error);
      } else {
        fetchRequests();
        setRequest('');
      }
      if (response.ok) {
        console.log('Request published successfully!');
        fetchRequests();
        setRequest(''); // Clear the input after successful submission
      } else {
        console.error('Error publishing request:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };   

  return (
    <div className="App">
      <header>
        <h1>Game Request Portal</h1>
      </header>
      <main>
        {!isLoggedIn ? (
          <form>
            <h2>Register/Login</h2>
            <div>
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button onClick={(e) => handleAuth(e, 'register')}>Register</button>
            <button onClick={(e) => handleAuth(e, 'login')}>Login</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="request">Request:</label>
              <textarea
                id="request"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit">Submit Request</button>
          </form>
        )}
        <section>
          <h2>Submitted Requests</h2>
          <ul>
            {requests.map((req) => (
              <ul key={req.id}>
                <strong> {req.Request}</strong> - <em>{req.status}</em>
              </ul>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;