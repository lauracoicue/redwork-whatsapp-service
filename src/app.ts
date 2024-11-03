import initApi from "./modules/api/app";
import qrcode from 'qrcode-terminal';
import Worker from "./models/worker";
import cronService from "./services/cron-job";
import messageTimeLast from "./utils/message-timelast";
import { normalizePhoneNumber } from "./utils/number-paser";
import { adminWhatsappService } from "./services/whatsapp-service";
import registerModule from "./modules/register/register";


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
                await adminWhatsappService.sendMessage(message.from, `Hola ${worker.name ?? ''}, estas en el sistema`);
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

