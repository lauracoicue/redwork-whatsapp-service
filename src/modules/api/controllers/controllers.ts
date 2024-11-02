import { Request, Response } from 'express';
import whatsappService from '../../../services/whatsapp-service';
import { parsePhoneNumber } from '../../../utils/number-paser';

const sendMessageController = async (req: Request, res: Response) => {  
    try {
        const { phone, country,  message} = req.body;   
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
        const status = whatsappService.getStatus();
        res.status(200).send({status});
    } catch (error) {
        res.status(500).send(`Error getting status: ${error}`);
    }
};


export { sendMessageController, statusServiceController };
