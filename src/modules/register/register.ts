import * as fs from "fs";
import { Message } from "whatsapp-web.js";
import Worker from "../../models/worker";
import { Convert, ConversationFlow } from "../../models/flows";
import { locationParser, normalizePhoneNumber } from "../../utils/number-paser";
import { CurrentWorkersRegister, NewWorker } from "./interfaces/register-types";
import validateMessageInput from "./utils/validations";
import { hostBackend, hostService } from "../../config/config";
import { fetchData } from "./services/fetch_data";

type Callback = (phone: string, message: string) => Promise<void>;

interface CompletedRegister {
  [phone: string]: {
    createdAt: Date;
    active: boolean;
    value?: string;
  }
}

class RegisterModule {
  #flows: ConversationFlow[] = [];
  #currentWorkersRegister: CurrentWorkersRegister = {};
  #newWorkers: NewWorker = {};
  #pendingRegister: CompletedRegister = {};

  constructor() {
    const data = fs.readFileSync(`db/flows/flow_register.json`);
    this.#flows = Convert.toFlows(data.toString()).conversation_flow;
  }

  async startRegister(phone: string, callback: Callback, message: Message) {
    if (!this.#currentWorkersRegister[phone]) {
      this.#currentWorkersRegister[phone] = {
        step: 0,
        awaitingInput: false,
        lastMessage: new Date(),
      };
      this.#newWorkers[phone] = {};
    }
    await this.#processFlowStep(phone, callback, message);
  }

  async #processUserMessage(phone: string, callback: Callback) {
    while (true) {
      const flow = this.#flows[this.#currentWorkersRegister[phone].step];
      if (flow.type === "info") {
        await callback(phone, flow.message);
        this.#currentWorkersRegister[phone].step += 1;
        continue;
      }
      break;
    }

    const step = this.#currentWorkersRegister[phone].step;
    const flow = this.#flows[step];

    if (!this.#currentWorkersRegister[phone].awaitingInput) {
      await callback(phone, flow.message);
      this.#currentWorkersRegister[phone].awaitingInput = true;

      if (flow.type === "link") {
        await this.#sendUrlPassword(phone, callback);
      }
    }
  }

  async #sendUrlPassword(phone: string, callback: Callback) {
    if (!this.#pendingRegister[phone]) {
      this.#pendingRegister[phone] = {
        createdAt: new Date(),
        active: false,
      }
    }

    console.log(this.#pendingRegister[phone]);
    await callback(phone, `${hostService}/api/register?id=${phone}`);
  }

  async #processFlowStep(phone: string, callback: Callback, message: Message) {
    if (!this.#currentWorkersRegister[phone].awaitingInput) {
      await this.#processUserMessage(phone, callback);
      return;
    }
    const step = this.#currentWorkersRegister[phone].step;
    const flow = this.#flows[step];
    const validation = await validateMessageInput(message, flow.validator);

    if (validation) {
      await message.reply(validation);
      return;
    }

    if (flow.type === "input") {
      if (!this.#newWorkers[phone][flow.params!]) {
        this.#newWorkers[phone][flow.params!] = "";
      }
      this.#newWorkers[phone][flow.params!] += message.body.toLowerCase();
    }

    if (flow.type === "file_upload") {
      if (!this.#newWorkers[phone][flow.params!]) {
        this.#newWorkers[phone][flow.params!] = "";
      }
      const media = await message.downloadMedia();
      this.#newWorkers[phone][flow.params!] = `data:${media.mimetype};base64,${media.data}`;
    }

    if (flow.type === "location") {
      if (!this.#newWorkers[phone][flow.params!]) {
        this.#newWorkers[phone][flow.params!] = "";
      }
      const locationString = `${message.location.latitude},${message.location.longitude}`;
      this.#newWorkers[phone][flow.params!] = locationString;
    }

    if (flow.type === "link") {
      if (this.pendingRegister[phone].active) {
        this.#newWorkers[phone][flow.params!] = this.pendingRegister[phone].value!;
      }else {
        await callback(phone, 'Estamos esperan que establezcas tu contraseña, por favor sigue el siguiente enlace para continuar con el registro');
        await this.#sendUrlPassword(phone, callback);
        return;
      }
    }

    if (this.currentWorkersRegister[phone].awaitingInput) {
      this.#currentWorkersRegister[phone].awaitingInput = false;
      this.#currentWorkersRegister[phone].step += 1;
      this.#currentWorkersRegister[phone].lastMessage = new Date();
      if (await this.#completeRegister(phone, callback)) {
        return;
      }

      await this.#processUserMessage(phone, callback);
      return;
    }
  }

  async #completeRegister(phone: string, callback: Callback) {
    if (this.#currentWorkersRegister[phone].step === this.#flows.length - 1) {
      try {
        const formattedPhoneNumber = normalizePhoneNumber(phone);
        await Worker.create({
          phone: formattedPhoneNumber.phone,
          name: this.#newWorkers[phone]["full_name"]! as string,
          country: formattedPhoneNumber.country,
          modeEdit: false,
          lastMessage: new Date(),
          createdAt: new Date(),
        });
        console.log(this.#newWorkers[phone]["photo"].substring(0, 50));

        await fetchData({
          method: "POST",
          url: `${hostBackend}/api/workers/register`,
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            fullName: this.#newWorkers[phone]["full_name"]!,
            phone: formattedPhoneNumber.phone,
            country: formattedPhoneNumber.country,
            email: this.#newWorkers[phone]["email"]!,
            password: this.#pendingRegister[phone].value!,
            photo: this.#newWorkers[phone]["photo"]! ,
            job: this.#newWorkers[phone]["job"]!,
            category: this.#newWorkers[phone]["category"]!,
            workImages: [],
            location: locationParser(this.#newWorkers[phone]["location"]!),
        }});

        delete this.#newWorkers[phone];
        delete this.#currentWorkersRegister[phone];
        delete this.#pendingRegister[phone];
        await callback(phone, this.#flows[this.#flows.length - 1].message);
        return true;
      } catch (error) {
        console.error(`Error creating worker: ${error}`);
        await callback(phone, "Error al registrar la información");
        this.distroyRegister(phone);
        await Worker.destroy({ where: { phone: normalizePhoneNumber(phone).phone } });
        this.#currentWorkersRegister[phone] = {
          step: 0,
          awaitingInput: false,
          lastMessage: new Date(),
        };
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
    delete this.#pendingRegister[phone];
    return;
  }

  setPasswordByPhone(phone: string, password: string) {
    this.#pendingRegister[phone].active = true;
    this.#pendingRegister[phone].value = password;
    return;
  }

  get pendingRegister() {
    return this.#pendingRegister;
  }
}
const registerModule = new RegisterModule();
export default registerModule;
