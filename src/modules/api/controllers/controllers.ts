import { Request, Response } from 'express';
import {WhatsappStatusService, userWhatsappService, adminWhatsappService} from '../../../services/whatsapp-service';
import { normalizePhoneNumber, parsePhoneNumber } from '../../../utils/number-paser';
import { MessageRequest } from '../../../services/interfaces/whatsapp-servive-types';
import registerModule from '../../register/register';
import Worker from '../../../models/worker';
import { hostFrontend } from '../../../config/config';
import { timeStamp } from 'console';

const sendMessageController = async (req: Request, res: Response) => {  
    try {
        const messageRequestData = req.body as MessageRequest;
        if (!messageRequestData) {
            res.status(400).send({
                message: 'Message data is required',
            });
            return;
        }
        const whatsappService = messageRequestData.userType === 'worker' ? adminWhatsappService : userWhatsappService;

        if (whatsappService.getStatus() !== WhatsappStatusService.AUTHENTIC) {
            res.status(400).send({
                message: 'Whatsapp service not authenticated, please check the status',
            });
            return;
        }
        const { phone, country, message, typeRequest } = messageRequestData;   
           
        if (typeRequest === 'confirm') {
            const worker = await Worker.findOne({ where: { phone: phone } });
            if (!worker) {
                res.status(404).send({
                    message: 'Worker not found',
                });
                return;
            }
            worker.awaitAvailability = true;
        }

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


const securityPasswordController = async (req: Request, res: Response) => {
    if (req.method === 'GET'){
        res.render('security-password', {
            title: 'Establecer contraseña',
            message: 'Por favor establezca una contraseña para acceder a la aplicación', 
        });
        return;
    }

    const password = req.body.password;

};


const renderError = (res: Response, title: string, message: string, link: string) => {
    res.status(400).render('error', { title, message, link });
};

const renderSecurityPassword = (res: Response, params:{title: string, message: string, link: string | undefined, action: string | undefined, id: string | undefined}) => {
    console.log(params);
    res.status(200).render('security-password', { ...params });
};

const isRequestExpired = (createdAt: Date, expirationTime: number = 5 * 60 * 1000) => {
    return new Date().getTime() - createdAt.getTime() > expirationTime;
};

const registerController = async (req: Request, res: Response) => {
    try {
        const phone = req.method === 'GET' ? req.query.id as string : req.body.id as string;
        const password = req.method === 'POST' ? req.body.password : undefined;

        if (!phone) {
            renderError(res, 'Error al establecer contraseña', 'El número de teléfono es requerido', hostFrontend);
            return;
        }

        const register = registerModule.pendingRegister[phone];

        if (req.method === 'GET') {
            const worker = await Worker.findOne({ where: { phone: normalizePhoneNumber(phone).phone } });

            if (worker) {
                renderSecurityPassword(res,{
                     title:'Usuario registrado', message: `El usuario ${worker.name} ya se encuentra registrado`, link: hostFrontend,
                     id: undefined, action: undefined
                });
                return;
            }

            if (register && isRequestExpired(register.createdAt)) {
                renderError(res, 'Error al establecer contraseña', 'El tiempo para establecer la contraseña ha expirado, por favor vuelva a escribir', 'https:wa.me/573002222222');
                return;
            }

            if (register && register.active){
                renderSecurityPassword(res, {
                    title: 'Ya se ha establecido la contraseña', message: 'Ya se ha establecido la contraseña para este número de teléfono', link: hostFrontend, id: undefined, action: undefined});
            }

            renderSecurityPassword(res, {
                title: 'Establecer contraseña',
                message: 'Por favor establezca una contraseña para acceder a la aplicación',
                link: undefined,
                action: '/api/register',
                id: phone,
            });
            return;
        }

        if (req.method === 'POST') {
            if (!password) {
                renderError(res, 'Error al establecer contraseña', 'La contraseña es requerida', hostFrontend);
                return;
            }

            if (!register) {
                renderError(res, 'Error al establecer contraseña', 'El número de teléfono no se encuentra registrado', hostFrontend);
                return;
            }

            if (isRequestExpired(register.createdAt)) {
                renderError(res, 'Error al establecer contraseña', 'El tiempo para establecer la contraseña ha expirado, por favor vuelva a escribir', 'https:wa.me/573002222222?text=Establecer%20contraseña');
                return;
            }

            registerModule.setPasswordByPhone(phone, password);
            renderSecurityPassword(res, {
                title:'Contraseña establecida', message:'La contraseña ha sido establecida correctamente',link: 'https://wa.me/573002214787?text=Contraseña%20establecida',
                id: undefined, action: undefined
            });
            return;
        }
    } catch (error) {
        res.status(500).send({ message: `Error registering user: ${error}` });
    }
};




export { sendMessageController, statusServiceController, securityPasswordController, registerController };
