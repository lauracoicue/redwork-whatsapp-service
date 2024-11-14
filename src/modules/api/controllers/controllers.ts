import { Request, Response } from 'express';
import {WhatsappStatusService, userWhatsappService, adminWhatsappService} from '../../../services/whatsapp-service';
import { parsePhoneNumber } from '../../../utils/number-paser';
import { MessageRequest } from '../../../services/interfaces/whatsapp-servive-types';
import registerModule from '../../register/register';

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


const registerController = async (req: Request, res: Response) => {
    try {
        if (req.method === 'GET') {
            const phone = req.query.id as string;
          res.render('security-password', {
              title: 'Finaliza tu registro',
              message: 'Por favor establece una contraseña para finalizar tu registro',
              action: '/api/register',
              id: phone,
          });
          return;
          }
      
          const password = req.body.password;
          const phone = req.body.id;

          if (!password) {
              res.status(400).render('error', {
                  title: 'Error al establecer contraseña',
                  message: 'La contraseña es requerida',
                  link: 'http://localhost:3000/'
              });
              return;
          }
        
          if (!phone) {
              res.status(400).render('error', {
                  title: 'Error al establecer contraseña',
                  message: 'El número de teléfono es requerido',
                  link: 'http://localhost:3000/'
              });
              return;
          }

            if (!registerModule.pendingRegister[phone]) {
                res.status(400).render('error', {
                    title: 'Error al establecer contraseña',
                    message: 'El número de teléfono no se encuentra registrado',
                    link: 'http://localhost:3000/'
                });
                return;
            }


          const now = new Date();
          const createAt = registerModule.pendingRegister[phone].createdAt
      
          if (now.getTime() - createAt.getTime() > 5 * 60 * 1000) {
              res.status(400).render('error', {
                  title: 'Error al establecer contraseña',
                  message: 'El tiempo para establecer la contraseña ha expirado, por favor vuelva a escribir',
                  link: 'https:wa.me/573002222222'
              });
              return;
          }
      
      
          registerModule.setPasswordByPhone(phone, password);
      
          res.status(200).render('security-password', {
              title: 'Contraseña establecida',
              message: 'La contraseña ha sido establecida correctamente',
              link: 'https://wa.me/573002214787?text=Contraseña%20establecida',
              action: undefined,
          })
      
    } catch (error) {
        res.status(500).send({
            message: `Error registering user: ${error}`,
        });
    }
   
};


export { sendMessageController, statusServiceController, securityPasswordController, registerController };
