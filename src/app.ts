import initApi from "./modules/api/app";
import qrcode from 'qrcode-terminal';
import Worker from "./models/worker";
import cronService from "./services/cron-job";
import messageTimeLast from "./utils/message-timelast";
import { normalizePhoneNumber, parsePhoneNumber } from "./utils/number-paser";
import { adminWhatsappService, userWhatsappService } from "./services/whatsapp-service";
import registerModule from "./modules/register/register";
import chatBot from "./modules/menu/menu";
import { updateWorkerAvailability } from "./modules/api/controllers/controllers";
import User from "./models/user";
import { Message, MessageContent } from "whatsapp-web.js";



initApi();
cronService(async() => {
    const workers = await Worker.findAll();
    const workerRegister = registerModule.currentWorkersRegister;
    for (const worker of workers){
       if(!messageTimeLast(worker.lastMessage) && worker.modeEdit){
            //TODO: delete history messages
           await adminWhatsappService.sendMessage(worker.phone, `Hola ${worker.name ?? ''}, tu actividad ha sido reiniciada, deberas reiniciar el proceso`);
           await Worker.update({modeEdit: false}, {where: {phone: worker.phone}});
           return;
       }
    }
    for (const worker in workerRegister){
        if(!messageTimeLast(workerRegister[worker]!.lastMessage)){
            await adminWhatsappService.sendMessage(worker, `Hola ${workerRegister['full_name'] ?? ''}, tu proceso de registro ha sido reiniciado por inactividad`);
            await adminWhatsappService.sendMessage(worker, 'Por favor, vuelve a enviar un mensaje para reiniciar el proceso');
            registerModule.distroyRegister(worker);
        }
    }
}, '0 */2 * * *');


const main = async () => {
  
    adminWhatsappService.qrCode((qr: string) => {
        console.log('qr code - admin');
        qrcode.generate(qr, {small: true});
    });
    userWhatsappService.qrCode((qr: string) => {
        console.log('qr code - user');
        qrcode.generate(qr, {small: true});
    });

    userWhatsappService.onMessage( async(message) => {
        if ((!message.body && !message.hasMedia) || message.hasReaction) {
            return;
        }

        if (message.from.includes('g.us')  || message.fromMe || message.isStatus){ 
            return;
        }
        try {
            const user = await User.findOne({where: {phone: normalizePhoneNumber(message.from).phone}});
            const worker = await Worker.findOne({where: {phone: normalizePhoneNumber(message.from).phone}});
            if(user){
                if (user.awaitName){
                    await user.update({name: message.body, awaitName: false});
                    await userWhatsappService.sendMessage(message.from, 'Gracias, ahora en adelante los mensajes serán enviados al trabajador');
                    await userWhatsappService.sendMessage(message.from, 'Para dejar de recibir y enviar mensajes al trabajador, envía "FIN"');
                    await userWhatsappService.sendMessage(message.from, 'Para proponer una conversación directa con el trabajador, envía "DIRECTO"');
                    return;
                }

                if (user.requestConversation){
                   await userWhatsappService.sendMessage(message.from, 'El trabajador ha sido notificado de tu solicitud, por favor espera su respuesta');
                   return;
                }

                if (message.body.trim() === 'FIN'){
                    await user.destroy();
                    await userWhatsappService.sendMessage(message.from, 'Gracias por utilizar nuestro servicio');
                    return;
                }
                const worker = await Worker.findOne({where: {id: user.idWorker}});

                if (!worker){
                    await userWhatsappService.sendMessage(message.from, 'El trabajador no se encuentra disponible');
                    return;
                }

                if (message.body.trim() === 'DIRECTO'){
                    await  userWhatsappService.sendMessage(message.from, 'Soliciando conversación directa al trabajador');
                    await user.update({requestConversation: true});
                    const phone = parsePhoneNumber(worker.phone, worker.country);
                    await userWhatsappService.sendMessage(phone, 'El usuario ha solicitado una conversación directa contigo, si deseas aceptar responde *SI* o *NO* para continuar con el chat');
                    await userWhatsappService.sendMessage(phone, 'Al aceptar, se compartirá tu número de teléfono con el usuario y el número del usuario contigo');
                    return;
                }

                const phone = parsePhoneNumber(worker.phone, worker.country);
                await userWhatsappService.retransmitMessage(phone, await  messageContent(message), user.name);
                return;
            }

            if (worker){
                const user = await User.findOne({where: {idWorker: worker.id}});

                if (!user){
                    userWhatsappService.sendMessage(message.from, 'El usuario no se encuentra disponible');
                    return;
                }
                const phone = parsePhoneNumber(user.phone, user.country);

                if (message.body.trim().toUpperCase() === 'SI' && user.requestConversation){
                    await user.update({requestConversation: false});
                    await userWhatsappService.sendMessage(phone, 'El trabajador ha aceptado tu solicitud, ahora puedes comunicarte directamente con el trabajador');
                    await userWhatsappService.sendMessage(phone, 'Comunicate con respeto');
                    await userWhatsappService.sendMessage(phone, 'Trabajador: ' + worker.name);
                    await userWhatsappService.sendMessage(phone, 'Número de contacto: ' + worker.phone);      
                    await userWhatsappService.sendMessage(message.from, 'Usuario: ' + user.name);
                    await userWhatsappService.sendMessage(message.from, 'Número de contacto: ' + user.phone);
                    return;
                }

                if (message.body.trim().toUpperCase() === 'NO' && user.requestConversation){
                    await user.update({requestConversation: false});
                    await userWhatsappService.sendMessage(phone, 'El trabajador ha rechazado tu solicitud, sigue comunicandote a través de la plataforma');
                    return;
                }

                if (user.requestConversation){
                    await userWhatsappService.sendMessage(message.from, 'Elige una opción válida');
                    return;
                }

                if (message.body.trim() === 'FIN'){
                    await user.destroy();
                    await userWhatsappService.sendMessage(message.from, 'Abandonaste la conversación con el cliente');
                    return;
                }
                
                await userWhatsappService.retransmitMessage(phone, await  messageContent(message), worker.name!);
                return;
            }
        
            const idWorker =  message.body.split('\n')[0].split(': ')[1].trim();
            if (idWorker){
                const worker = await Worker.findOne({where: {id: idWorker}});
                if (worker){
                    await User.create(
                        {   
                            name: '',
                            phone: normalizePhoneNumber(message.from).phone,
                            country: normalizePhoneNumber(message.from).country,
                            awaitName: true,
                            idWorker: worker.id,
                            
                        }
                    );
                    await userWhatsappService.sendMessage(message.from, `Hola, para poder comunicarte con ${worker.name ?? ''}, por favor indicanos tu nombre o como te gustaría que te llamen`);

                }else {
                    await userWhatsappService.sendMessage(message.from, 'No se ha encontrado el trabajador, verifica el ID e intenta nuevamente');
                    await userWhatsappService.sendMessage(message.from, 'El ID del trabajador se establece en el perfil del trabajador, si modificas el mensaje inicial, no podras comunicarte con el trabajador');
                }
            } else {
                await userWhatsappService.sendMessage(message.from, 'Por favor, envía el ID del trabajador al que deseas contactar');
            }

        } catch (error) {
            console.error(`Error processing message: ${error}`);
            return;
        }
    });

    
    adminWhatsappService.onMessage( async(message) => {

        if ((!message.body && !message.hasMedia) || message.hasReaction) {
            return;
        }

        if (message.from.includes('g.us')  || message.fromMe || message.isStatus){ 
            return;
        }
        try {
            const worker =  await  Worker.findOne({where: {phone: normalizePhoneNumber(message.from).phone}});
            if(worker){
                if (worker.awaitAvailability){
                    console.log('awaiting availability');
                    if (message.body === '1'){
                        await worker.update({awaitAvailability: false});
                        updateWorkerAvailability(worker.phone, true);
                        await adminWhatsappService.sendMessage(parsePhoneNumber(worker.phone, worker.country), 'Tu disponibilidad ha sido actualizada');
                        setTimeout(() => {
                            updateWorkerAvailability(worker.phone, false);
                        }, 150000);
                        return;
                    } else if (message.body === '2'){
                        await worker.update({awaitAvailability: false});
                        updateWorkerAvailability(worker.phone, false);
                        await adminWhatsappService.sendMessage(parsePhoneNumber(worker.phone, worker.country), 'Tu disponibilidad ha sido actualizada');
                        return;
                    } else {
                        await adminWhatsappService.sendMessage(parsePhoneNumber(worker.phone, worker.country), 'Por favor, elige una opción válida');
                        return;
                    }
                }
                const messageResponse = chatBot.handleMessage(message.from, message);
                await adminWhatsappService.sendMessage(message.from, messageResponse);
                return;
            } 
            registerModule.startRegister(message.from, (phone, msg) => adminWhatsappService.sendMessage(phone, msg), message);
        } catch (error) {
            console.error(`Error processing message: ${error}`);
            return;
        }  
});
}

main();



async function messageContent(message: Message): Promise<MessageContent> {
    if (message.hasMedia){
        
        return await message.downloadMedia();
    }
    if (message.location){
       return message.location;
    }

    return message.body;
}