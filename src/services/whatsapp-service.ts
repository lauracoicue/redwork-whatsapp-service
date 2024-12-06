import WAWebJS, { Client, LocalAuth, Location, MessageMedia} from "whatsapp-web.js";
import WhatsappServiceError from "./errors/whatsapp-serviver-error";
import {MediaMessage, LocationMessage } from "./interfaces/whatsapp-servive-types";


enum WhatsappStatusService {
    AUTHENTIC = 'authenticated',
    UNAUTHENTICATED = 'unauthenticated',
    ERROR = 'error',
    LOADING = 'loading'
}


class WhatsappService {
    #client: Client;
    #status: WhatsappStatusService = WhatsappStatusService.LOADING;
    #idClient: string;
  
    constructor(id: string) { 
        this.#idClient = id;
        this.#client = new Client({
            puppeteer: { headless: true , args: ['--no-sandbox', '--disable-setuid-sandbox']},
            authStrategy: new LocalAuth({clientId: this.#idClient}),
        });
        this.#init();
    }


    #init(): void{
       try {
            this.#client.on('auth_failure', () => {
                this.#status = WhatsappStatusService.UNAUTHENTICATED;
                throw new WhatsappServiceError('Error authenticating whatsapp service');
            });


            this.#client.on('ready', () => {
                console.log(`Whatsapp service ready for ${this.#idClient}`);    
            });


            this.#client.on('authenticated', () => {
                this.#status = WhatsappStatusService.AUTHENTIC;
            });


            this.#client.on('disconnected', () => {
                this.#status = WhatsappStatusService.UNAUTHENTICATED;
            });


            this.#client.initialize();
       } catch (error) {
             if (error instanceof WhatsappServiceError) {
                throw error;
             }
            throw new WhatsappServiceError(`Error initializing whatsapp service: ${error}`);
       }
    } 

    async sendMessage(phone: string, message: MediaMessage | string | LocationMessage): Promise<void> {

        try {
            if (!phone) {
                throw new WhatsappServiceError('Phone is required');
            }

            if (!message) {
                throw new WhatsappServiceError('Message is required');
            }
            
            if (typeof message === 'string') {
                await this.#client.sendMessage(phone, message);
                return;
            }
            

            if(typeof message === 'object' && 'latitude' in message && 'longitude' in message) {
                const location = new Location(message.latitude, message.longitude);
                await this.#client.sendMessage(phone, location);
                return;
            }

            if (typeof message === 'object' && 'base64' in message && 'mimetype' in message) {
                const media = message.base64 ? new MessageMedia(message.base64, message.mimetype!) :await  MessageMedia.fromUrl(message.url!);
                await this.#client.sendMessage(phone, media, message.caption ? { caption: message.caption } : undefined);
                return;
            }

            if (typeof message === 'object' && 'url' in message) {
                const media = await MessageMedia.fromUrl(message.url!);
                await this.#client.sendMessage(phone, media, message.caption ? { caption: message.caption } : undefined);
                return;
            }

            throw new WhatsappServiceError('Invalid message type');
        } catch (error) {
           if (error instanceof WhatsappServiceError) {
               throw error;
           }
            throw new WhatsappServiceError(`Error sending message: ${error}`);
        }
    }


    qrCode(qrGeneratedCallback: (qr:string) => void): void {
        this.#client.on('qr', (qr) => {
            console.log(`QR Code generated for ${this.#idClient}`);
            qrGeneratedCallback(qr);
        });
    }

    
    onMessage(callback: (message: WAWebJS.Message) => void): void {
        try {
            this.#client.on('message', callback);
        } catch (error) {
          if (error instanceof WhatsappServiceError) {
              throw error;
          }
            throw new WhatsappServiceError(`Error listening to messages: ${error}`);
        }
    }

    getStatus(): WhatsappStatusService {
        return this.#status;
    }
 
}


const userWhatsappService  = new WhatsappService('user');
const adminWhatsappService = new WhatsappService('admin');
export { userWhatsappService, adminWhatsappService, WhatsappStatusService}