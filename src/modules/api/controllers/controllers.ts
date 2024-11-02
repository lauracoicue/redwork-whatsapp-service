import { Request, Response } from 'express';
import {WhatsappStatusService, userWhatsappService, adminWhatsappService} from '../../../services/whatsapp-service';
import { parsePhoneNumber } from '../../../utils/number-paser';
import { MessageRequest } from '../../../services/interfaces/whatsapp-servive-types';

const sendMessageController = async (req: Request, res: Response) => {  
    try {
        
        const messageRequestData = req.body as MessageRequest;

        const whatsappService = messageRequestData.userType === 'worker' ? adminWhatsappService : userWhatsappService;

        if (whatsappService.getStatus() !== WhatsappStatusService.AUTHENTIC) {
            res.status(400).send({
                message: 'Whatsapp service not authenticated, please check the status',
            });
            return;
        }
        const { phone, country, message } = messageRequestData;      

        if (!phone || !country || !message) {
            res.status(400).send({
                message: 'Phone, country and message are required',
            });
            return;
        }

        await whatsappService.sendMessage(parsePhoneNumber(phone, country), message);
        res.status(200).send({
            message: 'Message sent successfully',
        });
    } catch (error) {
        res.status(500).send({
            message: `Error sending message: ${error}`,
        });
    }
};


const statusServiceController = async (req: Request, res: Response) => {
    try {
        const adminStatus = adminWhatsappService.getStatus();
        const userStatus = userWhatsappService.getStatus();
        res.status(200).send({
            admin: adminStatus,
            user: userStatus,
        });
    } catch (error) {
        res.status(500).send(`Error getting status: ${error}`);
    }
};


export { sendMessageController, statusServiceController };
