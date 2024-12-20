import { Request, Response } from 'express';
import {WhatsappStatusService, userWhatsappService, adminWhatsappService} from '../../../services/whatsapp-service';
import { normalizePhoneNumber, parsePhoneNumber } from '../../../utils/number-paser';
import { MessageRequest } from '../../../services/interfaces/whatsapp-servive-types';
import registerModule from '../../register/register';
import Worker from '../../../models/worker';
import { hostBackend, hostFrontend, hostService } from '../../../config/config';
import chatBot from '../../menu/menu';

const renderSecurityPassword = (res: Response, params:{title: string, message: string, link: string | undefined, action: string | undefined, id: string | undefined}) => {
    console.log(params);
    res.status(200).render('security-password', { ...params });
};

const renderError = (res: Response, title: string, message: string, link: string) => {
    res.status(400).render('error', { title, message, link });
};


const isRequestExpired = (createdAt: Date, expirationTime: number = 5 * 60 * 1000) => {
    return new Date().getTime() - createdAt.getTime() > expirationTime;
};




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
            console.log('confirmar');
            console.log(phone);
            console.log(country);
          
            const worker = await Worker.findOne({ where: {   phone: phone} });
            if (!worker) {
                console.log('worker not found', phone);
                res.status(404).send({
                    message: 'Worker not found',
                });
                return;
            }
            
            await worker.update({ awaitAvailability: true });
            worker.lastMessage = new Date();
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

const updateAccountController = async (req: Request, res: Response) => {
    const id = req.body.id as string | undefined;
    const password = req.body.password as string | undefined;
    const updates = req.body.updates as string[] | undefined;

    if (!id || !password) {
        renderError(res, 'Error al actualizar cuenta', 'El número de teléfono, la contraseña y las actualizaciones son requeridos', hostFrontend);
        return;
    }

    const worker = await Worker.findOne({ where: { phone: normalizePhoneNumber(id).phone } });

    if (!worker) {
        renderError(res, 'Error al actualizar cuenta', 'El número de teléfono no se encuentra registrado', hostFrontend);
        return;
    }

    try {
        await fetch(`${hostBackend}/api/workers/${worker.phone}/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id, updates }),
        });

        renderSecurityPassword(res, {
            title: 'Cuenta actualizada', message: 'Tu cuenta ha sido actualizada con éxito', link: hostFrontend, id: undefined, action: undefined
        });

        await adminWhatsappService.sendMessage(id, `Su cuenta ha sido actualizada con éxito.`);
    } catch (error) {
        res.status(500).send({ message: `Error updating account: ${error}` });
    }
}

const deleteAccountController = async (req: Request, res: Response) => {
    const id = req.body.id as string | undefined;
    const password = req.body.password as string | undefined;

    if (!id || !password) {
        renderError(res, 'Error al eliminar cuenta', 'El número de teléfono y la contraseña son requeridos', hostFrontend);
        return;
    }

    const worker = await Worker.findOne({ where: { phone: normalizePhoneNumber(id).phone } });

    if (!worker) {
        renderError(res, 'Error al eliminar cuenta', 'El número de teléfono no se encuentra registrado', hostFrontend);
        return;
    }

    try{
       await fetch(`${hostBackend}/api/workers/${worker.phone}/delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
        })
        worker?.destroy();
        renderSecurityPassword(res, {
            title: 'Cuenta eliminada', message: 'Tu cuenta ha sido eliminada con éxito', link: hostFrontend, id: undefined, action: undefined
        });

        await adminWhatsappService.sendMessage(id, 'Su cuenta ha sido eliminada')
        chatBot.reset(id);
        return;
    }catch (error) {
        res.status(500).send({ message: `Error deleting account: ${error}` });
        
    } 
}


const securityPasswordController = async (req: Request, res: Response) => {
    const id = req.query.id as string | undefined;
    const option = req.query.option as string | undefined;



    if (!id) {
        renderError(res, 'Error al establecer contraseña', 'El número de teléfono es requerido', hostFrontend);
        return;
    }

    if (option === 'delete' ){

        if(!chatBot.confirmDeleteAccount(id)){
            renderError(res, 'Error al eliminar cuenta', 'El número de teléfono no se encuentra registrado o no ha solicitado la eliminacion', hostFrontend);
            return;
        }

        if(isRequestExpired(chatBot.expireDeleteAccount(id))){
            renderError(res, 'Error al eliminar cuenta', 'El tiempo para eliminar la cuenta ha expirado, por favor vuelva a escribir', 'https:wa.me/573002222222');
            return;
        }
    
    
        renderSecurityPassword(res, {
            title: 'Eliminar cuenta', message: '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.', link: undefined, action: '/api/delete-account', id});
        
        return;
    }

    if (option === 'reset') {
        renderSecurityPassword(res, {
            title: 'Establecer contraseña', message: 'Por favor establezca su nueva contraseña', link: undefined, action: '/api/reset-password', id}); 
    }

    if (option === 'update') {
        renderSecurityPassword(res, {
            title: 'Actualizar cuenta', message: 'Por favor ingrese su contraseña', link: undefined, action: '/api/update-account', id});
    }

    return;
};

const urlPasswordController = async (req: Request, res: Response) => {
   
    try {
       const {password, id} = req.body;
        await fetch(`${hostBackend}/api/workers/${id}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: password }), 
        });
      
        renderSecurityPassword(res,{
            title:'Contraseña restablecida', message: 'Tu contraseña fue restablecida con exito, puedes seguir disfrutando de la plataforma', link: hostFrontend,
            id: undefined, action: undefined
       });

        const worker = await Worker.findOne({ where: { id: id } });
        const phone = parsePhoneNumber(worker?.phone!, worker?.country!); 
       await adminWhatsappService.sendMessage(phone, 'Tu contraseña ha sido restablecida con éxito');
    } catch (error) {
        renderError(res,'Error', 'No se pudo restablecer la contraseña', '')
    }
}



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

const updateWorkerAvailability = async (phone: string, isAvailable: boolean) => {
    try {
      await fetch(`${hostBackend}/api/workers/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, isAvailable }),
      });
    } catch (error) {
      console.error('Error updating worker availability:', error);
    }
  };


export { sendMessageController, statusServiceController, securityPasswordController, registerController, updateWorkerAvailability, deleteAccountController, urlPasswordController, updateAccountController };
