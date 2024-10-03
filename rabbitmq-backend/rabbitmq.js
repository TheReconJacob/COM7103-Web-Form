const amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', (err, connection) => {
  if (err) throw err;

  connection.createChannel((err, channel) => {
    if (err) throw err;

    const queue = 'my-queue';
    channel.assertQueue(queue, { durable: false });

    channel.sendToQueue(queue, Buffer.from('Hello from RabbitMQ!'));

    console.log('Message sent to RabbitMQ');
  });
});