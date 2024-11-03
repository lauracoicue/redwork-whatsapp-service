import * as fs from 'fs';
import { Message } from 'whatsapp-web.js';
import Worker from '../../models/worker';
import { Convert, ConversationFlow } from '../../models/flows';
import { normalizePhoneNumber } from '../../utils/number-paser';
import { CurrentWorkersRegister, NewWorker } from './interfaces/register-types';
import validateMessageInput from './utils/validations';


type Callback = (phone: string, message: string) => Promise<void>;

class RegisterModule {
  #flows: ConversationFlow[] = [];
  #currentWorkersRegister:CurrentWorkersRegister = {};
  #newWorkers: NewWorker = {};

  constructor() {
    const data = fs.readFileSync(`db/flows/flow_register.json`);
    this.#flows = Convert.toFlows(data.toString()).conversation_flow;
  }

  async startRegister(phone: string, callback: Callback, message: Message)  {
  
    if (!this.#currentWorkersRegister[phone]){
      this.#currentWorkersRegister[phone] = {
        step: 0,
        awaitingInput: false,
        lastMessage: new Date(),
      }
      this.#newWorkers[phone] = {};
    } 
     await this.#processFlowStep(phone, callback, message);
  }


  async #processUserMessage(phone: string, callback: Callback) {
    while(true){
      const flow = this.#flows[this.#currentWorkersRegister[phone].step];
      if (flow.type === 'info'){
        await callback(phone, flow.message);
        this.#currentWorkersRegister[phone].step += 1; 
        continue;
      }
      break;
    }

    const step = this.#currentWorkersRegister[phone].step;
    const flow = this.#flows[step];

    if (!this.#currentWorkersRegister[phone].awaitingInput){
        await callback(phone, flow.message);
        this.#currentWorkersRegister[phone].awaitingInput = true;
    }
  }

  async #processFlowStep(phone:string ,callback: Callback, message: Message) {
    if (!this.#currentWorkersRegister[phone].awaitingInput){
        await this.#processUserMessage(phone, callback);
        return;
    }
    const step = this.#currentWorkersRegister[phone].step;
    const flow = this.#flows[step];
    const validation = await validateMessageInput(phone, message, flow.validator);

    if (validation){
      await message.reply(validation);
      return;
    }

    if (flow.type === 'input'){  
      if (!this.#newWorkers[phone][flow.params!]){
        this.#newWorkers[phone][flow.params!] = '';
      }
      this.#newWorkers[phone][flow.params!] += message.body.toLowerCase();
    }

    if (flow.type === 'file_upload'){
     if (!this.#newWorkers[phone][flow.params!]){
      this.#newWorkers[phone][flow.params!] = '';
     }
      const media = await message.downloadMedia();
      this.#newWorkers[phone][flow.params!] = media.data;
    }

    if (this.currentWorkersRegister[phone].awaitingInput){
      this.#currentWorkersRegister[phone].awaitingInput = false;
      this.#currentWorkersRegister[phone].step += 1;
      this.#currentWorkersRegister[phone].lastMessage = new Date();
      if(await this.#completeRegister(phone, callback)) {
        return;
      } 
      
      await this.#processUserMessage(phone, callback);
      return;
    }
  }

  
  async #completeRegister(phone: string, callback: Callback) {

    if (this.#currentWorkersRegister[phone].step === this.#flows.length - 1){
      try {
        const formattedPhoneNumber = normalizePhoneNumber(phone);
       await Worker.create({
          phone: formattedPhoneNumber.phone,
          name: this.#newWorkers[phone]['full_name']! as string,
          country: formattedPhoneNumber.country,
          modeEdit: false,
          lastMessage: new Date()
        });
        delete this.#newWorkers[phone];
        delete this.#currentWorkersRegister[phone];
        await callback(phone, this.#flows[this.#flows.length - 1].message);
        return true;
      }catch (error) {
        console.error(`Error creating worker: ${error}`);
        await callback(phone, 'Error al registrar la información');
        this.distroyRegister(phone);
        this.#currentWorkersRegister[phone] = {
          step: 0,
          awaitingInput: false,
          lastMessage: new Date(),
        }
        this.#newWorkers[phone] = {};
        return false;
      }
    }
    return false;
  }


  get currentWorkersRegister() {
    return this.#currentWorkersRegister;
  }


  distroyRegister(phone: string) {
    delete this.#currentWorkersRegister[phone];
    delete this.#newWorkers[phone];
    return;
  }
  

}
const registerModule = new RegisterModule();
export default registerModule;