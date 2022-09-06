import { Channel, connect } from "amqplib";
import { config } from "dotenv";
import * as http from "http";
import { Server } from "socket.io";
import CandleController from "../controllers/CandleController";
import { Candle } from "../models/candleModel";

config();

export default class CandleMessageChannel {

    private _channel: Channel;
    private _candleCtrl: CandleController;
    private _io: Server;

    constructor(server: http.Server) {
        this._candleCtrl = new CandleController;
        this._io = new Server(server, {
            cors: {
                origin: process.env.SOCKET_CLIENT_SERVER,
                methods: ["GET", "POST"]
            }
        })
        this._io.on('connection', () => console.log('web socket connection created'));
    }

    private async _createMessageChannel() {
        try {
            const connection = await connect(process.env.AMQP_SERVER);
            this._channel = await connection.createChannel();
            this._channel.assertQueue(process.env.QUEUE_NAME);
        } catch (error) {
            console.log('Connect to rabbitMQ failed');
            console.log(error);
        }
    }

    async consumeMessages() {
        //consome a fila para mandar para o banco
        await this._createMessageChannel()
        if (this._channel) {
            this._channel.consume(process.env.QUEUE_NAME, async msg => {
                const candleObj = JSON.parse(msg.content.toString());
                console.log('Message received');
                console.log(candleObj);

                //avisa o rabbitMq que ja foi consumido a fila para liberar espaço
                this._channel.ack(msg);

                //envia para o banco
                const candle: Candle = candleObj;
                this._candleCtrl.save(candle);
                console.log('Candle saved to database');

                //envia para o frontend
                this._io.emit(process.env.SOCKET_EVENT_NAME, candle);
                console.log('new candle emited by web socket');
            })
            console.log('Candle consumer started');
        }

    }
}