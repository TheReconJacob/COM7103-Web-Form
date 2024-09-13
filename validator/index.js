const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const app = express();
const port = 5000;

const supabaseUrl1 = 'https://wxjmxphdkmhgthgnizkv.supabase.co';
const supabaseKey1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4am14cGhka21oZ3RoZ25pemt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDI4MjgsImV4cCI6MjAzODE3ODgyOH0.23RLOOXWXYOKLNIv2ApUnx_VV7Af1Vp2y9WvtsOdhVs';
const supabase1 = createClient(supabaseUrl1, supabaseKey1);

const supabaseUrl2 = 'https://servjwuxyghyunleemhk.supabase.co';
const supabaseKey2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZqd3V4eWdoeXVubGVlbWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0MTIxNzUsImV4cCI6MjAzOTk4ODE3NX0.wW8zEhpqKMhhgn5FIsEgCURJBUH83m5LVdp4brmhVHk';
const supabase2 = createClient(supabaseUrl2, supabaseKey2);

app.use(express.json());

app.use(cors());

const rabbitmqUrl = 'amqp://rabbitmq:5672';
const queueName = 'messageQueue';

const wss = new WebSocket.Server({ noServer: true });

const processMessage = async (message) => {
  const messageContent = message.content.toString();
  console.log('Received message content:', messageContent);

  try {
    if (!messageContent) {
      throw new Error('Invalid request data');
    }

    const request = messageContent;

    const { data: existingRequest1, error: requestError1, status1 } = await supabase2
      .from('Requests')
      .select('*')
      .eq('request', request)
      .single();

    if (requestError1 && status1 !== 406) {
      throw new Error(requestError1.message);
    }
    
    if (existingRequest1) {
      await supabase2
        .from('Requests')
        .update({ status: 'processed', updated_at: new Date() })
        .eq('id', existingRequest1.id);
    } else {
      await supabase2
        .from('Requests')
        .insert([{ request, status: 'processed' }]);
    }

    const { data: existingRequest2, error: requestError2, status2 } = await supabase1
      .from('Requests')
      .select('*')
      .eq('request', request)
      .single();

    if (requestError2 && status2 !== 406) {
      throw new Error(requestError2.message);
    }
    
    if (existingRequest2) {
      await supabase1
        .from('Requests')
        .update({ status: 'processed', updated_at: new Date() })
        .eq('id', existingRequest2.id);
    } else {
      await supabase1
        .from('Requests')
        .insert([{ request, status: 'processed' }]);
    }

    // Notify all connected WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ request, status: 'processed' }));
      }
    });

    console.log('Request processed successfully');
  } catch (error) {
    console.error('Validation or processing error:', error.message);

    const { error: logError } = await supabase2
      .from('ValidationLogs')
      .insert([{ request_message: messageContent, error_message: error.message }]);

    if (logError) {
      console.error('Error logging validation:', logError);
    }
  }
};

const connectToRabbitMQ = async (retryCount = 0) => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName);

    channel.consume(queueName, (message) => {
      if (message) {
        processMessage(message);
        channel.ack(message);
      }
    });

    console.log('Waiting for messages...');
  } catch (error) {
    console.error('Error consuming messages:', error);

    const maxRetries = 5;
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying to connect in ${retryDelay / 1000} seconds...`);
      setTimeout(() => connectToRabbitMQ(retryCount + 1), retryDelay);
    } else {
      console.error('Max retries reached. Could not connect to RabbitMQ.');
    }
  }
};

connectToRabbitMQ();

const server = app.listen(port, () => {
  console.log(`Validation microservice running on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});