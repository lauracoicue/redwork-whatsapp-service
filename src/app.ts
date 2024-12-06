import initApi from "./modules/api/app";
import qrcode from 'qrcode-terminal';
import Worker from "./models/worker";
import cronService from "./services/cron-job";
import messageTimeLast from "./utils/message-timelast";
import { normalizePhoneNumber, parsePhoneNumber } from "./utils/number-paser";
import { adminWhatsappService } from "./services/whatsapp-service";
import registerModule from "./modules/register/register";
import chatBot from "./modules/menu/menu";
import { updateWorkerAvailability } from "./modules/api/controllers/controllers";
import { time } from "console";


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
        qrcode.generate(qr, {small: true});
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
                const timeDiff = new Date().getTime() - worker.lastMessage.getTime();
                const timeDiffMinutes = Math.floor(timeDiff / 60000);
                console.log(timeDiff);
                console.log(timeDiffMinutes);
                console.log(worker.awaitAvailability);
                if (worker.awaitAvailability && timeDiffMinutes < 2.5){

                    if (message.body === '1'){
                        await Worker.update({awaitAvailability: false}, {where: {phone: worker.phone}});
                        updateWorkerAvailability(worker.phone, true);
                        await adminWhatsappService.sendMessage(parsePhoneNumber(worker.phone, worker.country), 'Tu disponibilidad ha sido actualizada');
                        return;
                    } else if (message.body === '2'){
                        await Worker.update({awaitAvailability: false}, {where: {phone: worker.phone}});
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

