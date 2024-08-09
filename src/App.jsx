import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [request, setRequest] = useState('');
  const [requests, setRequests] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [userId]);

  const fetchRequests = async () => {
    if (userId) {
      const { data, error } = await supabase
        .from('Requests')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.error('Error fetching requests:', error);
      } else {
        setRequests(data);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('Users')
      .insert([{ email, password }])
      .select();
    if (error) {
      console.error('Error registering user:', error);
    } else {
      setUserId(data[0].id);
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('Requests')
      .insert([{ user_id: userId, request, status: 'pending' }]);
    if (error) {
      console.error('Error submitting request:', error);
    } else {
      fetchRequests();
      setRequest('');
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Game Request Portal</h1>
      </header>
      <main>
        {!userId ? (
          <form onSubmit={handleRegister}>
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
            <button type="submit">Register</button>
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
              <li key={req.id}>
                <strong>{req.user_id}</strong>: {req.request} - <em>{req.status}</em>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;