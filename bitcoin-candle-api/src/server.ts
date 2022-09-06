import { Console } from 'console';
import { config } from 'dotenv';
import { connection } from 'mongoose';
import { app } from './app';
import { connectToMongoDB } from './config/db';
import CandleMessageChannel from './messages/CandleMessageChannel';


const createServer = async () => {
    config();

    await connectToMongoDB();
    const PORT = process.env.PORT;
    const server = app.listen(PORT, () => console.log(`App running on port ${PORT}`));

    const candleMsgChannel = new CandleMessageChannel(server);
    candleMsgChannel.consumeMessages();

    //Se o servidor for interrompido, matar a conexão com o mongodb
    process.on('SIGINT', async () => {
        await connection.close();
        server.close();
        console.log('Server and Connection to MongoDB closed');
    })

}

createServer();