import WAWebJS, { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import Media from "./interfaces/media";
import WhatsappServiceError from "./errors/whatsapp-serviver-error";


enum WhatsappStatusService {
    AUTHENTIC = 'authenticated',
    UNAUTHENTICATED = 'unauthenticated',
    ERROR = 'error',
    LOADING = 'loading'
}


class WhatsappService {
    #client: Client;
    #status: WhatsappStatusService = WhatsappStatusService.LOADING;

    static instance: WhatsappService;
    
    constructor() { 
        this.#client = new Client({
            puppeteer: { headless: true , args: ['--no-sandbox', '--disable-setuid-sandbox']},
            authStrategy: new LocalAuth(),
        });
        if (WhatsappService.instance) {
            return WhatsappService.instance;
        }
        WhatsappService.instance = this;
        this.#init();
    }

    


    #init(): void{
       try {
            this.#client.on('auth_failure', () => {
                this.#status = WhatsappStatusService.UNAUTHENTICATED;
                throw new WhatsappServiceError('Error authenticating whatsapp service');
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

    async sendMessage(phone: string, message: string): Promise<void> {
        try {
            if (!phone) {
                throw new WhatsappServiceError('Phone is required');
            }
    
            await this.#client.sendMessage(phone, message);
            
        } catch (error) {
           if (error instanceof WhatsappServiceError) {
               throw error;
           }
            throw new WhatsappServiceError(`Error sending message: ${error}`);
        }
    }

    async sendMedia(phone: string, media: Media): Promise<void> {
        try {
            if (!phone) {
                throw new WhatsappServiceError('Phone is required');
            }

            if (!media) {
                throw new WhatsappServiceError('Media is required');
            }

            const messageMedia = new MessageMedia(media.mimetype, media.base64, media.caption);
            await this.#client.sendMessage(phone, messageMedia );
        } catch (error) {
            if (error instanceof WhatsappServiceError) {
                throw error;
            }
            throw new WhatsappServiceError(`Error sending media: ${error}`);
        }
    }


    qrCode(qrGeneratedCallback: (qr:string) => void): void {
        this.#client.on('qr', qrGeneratedCallback);
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


const whatsappService = new WhatsappService();
export default whatsappService;