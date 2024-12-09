import { Message } from "whatsapp-web.js";
import { hostBackend, hostService } from "../../config/config";
import { validateMessageInput } from "../register/utils/validations";

type Module = 'profile' | 'reports' | 'password' | 'deleteAccount' | null;

interface UserState {
  currentFlow: Module;
}

interface DeleteAccount {
  currentFlow: number;
  awaitConfirm: boolean;
  lastMessage: Date;
}

class ChatBot {
  #mainMenuOptions: string[] = [
    'Actualizar perfil',
    'Reportes',
    'Cambiar contraseña',
    'Eliminar cuenta',
  ];


  #userStates: { [phone: string]: UserState };
  #currentFlowMessage: { [phone: string]: DeleteAccount}; 

  constructor() {
    this.#userStates = {};
    this.#currentFlowMessage = {};
  }

 
  async handleMessage(phone: string, id:string, message: Message): Promise<string>{
   
    if (!(phone in this.#userStates)) {
      this.#userStates[phone] = { currentFlow: null };
      return this.#showMainMenu();
    }

    const userState = this.#userStates[phone];
    if (!userState.currentFlow) {
        if (!message.body) {
            return 'Por favor, selecciona una opción válida.';
        }
        const optionIndex = parseInt(message.body);
        if (isNaN(optionIndex)) {
            return 'Opción inválida. Por favor, selecciona una opción válida.';
        }
        const option =  this.selectOption(phone, optionIndex);
        if (option) {
            return option;
        }
        return await this.#redirectToModule(phone,id, message);
    } else {
      return await this.#redirectToModule(phone,id, message);
    }
  }

  #showMainMenu(): string {
    let menu = 'Menú principal:\n';
    this.#mainMenuOptions.forEach((option, index) => {
      menu += `${index + 1}. ${option}\n`;
    });
    menu += 'Por favor, selecciona una opción (1-4):';
    return menu;
  }

  selectOption(phone: string, optionIndex: number): string | undefined {
    const userState = this.#userStates[phone];
    if (!userState) {
      return 'Error: Usuario no encontrado. Por favor, inicia desde el menú principal.';
    }

    if (optionIndex < 1 || optionIndex > this.#mainMenuOptions.length) {
      return 'Opción inválida. Por favor, selecciona una opción válida.';
    }

    const moduleMapping: Module[] = ['profile', 'reports', 'password', 'deleteAccount'];
    userState.currentFlow = moduleMapping[optionIndex - 1];
    return undefined;
  }

 async #redirectToModule(phone: string, id:string, message: Message): Promise<string> {
    const userState = this.#userStates[phone];

    switch (userState.currentFlow) {
      case 'profile': 
        return await this.updateAccount(phone, message.body);
      case 'reports':
        return `Manejando el módulo de reportes para el usuario ${phone}. Recibido: ${message}`;
      case 'password':
        return await this.resetPassword(phone, id);
      case 'deleteAccount':
        return this.deleteAccount(phone, message.body)
      default:
        userState.currentFlow = null;
        return 'Algo salió mal. Volviendo al menú principal.';
    }
  }

  async resetPassword(phone: string, id:string): Promise<string>{
    try{
      const url = `${hostService}/api/security-password?id=${id}&option=reset`;
      const urlFecth = `${hostBackend}/api/workers/reset-password`;
      const response = await fetch(urlFecth, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            id
          })
        });
  
        const data = await response.json()
        return `Se ha enviado un enlace de recuperación al correo: \n\n${data.email}`;
    }catch (e){
      return 'No se pudo enviar solicitar la recuperación'
    } finally {
      this.reset(phone)
    }
   

   
  }

  reset(phone: string): string {
    if (!(phone in this.#userStates)) {
      return 'No se encontró el estado del usuario. Por favor, inicia desde el menú principal.';
    }

    this.#userStates[phone].currentFlow = null;
    return 'Volviendo al menú principal.';
  }

  async updateAccount(phone: string, message:string): Promise<string>{
    if(!this.#currentFlowMessage[phone]){
      this.#currentFlowMessage[phone] = {
        currentFlow: 0,
        awaitConfirm: false,
        lastMessage: new Date(),
    }
  }
  const flowUpdateAccount = [
    {
      message: '¿Qué información deseas actualizar?\nSelecciona una opción:\n 1. Categoría\n 2. Trabajos\n 3. Foto de perfil\n 4. Correo electronico\n 5. Ubicación\n 6. Agregar fotos de trabajos',
    },
    {
      message: '¿Qué *categoría* describe mejor tu trabajo?\n1 - Construcción\n2 - Mantenimiento de vehículos\n3 - Arte y diseño\n4 - Salud y bienestar\n5 - Educación\n6 - Servicios de transporte\n7 - Servicios del hogar\n8 - Servicios tecnológicos\n9 - Servicios administrativos\n10 - Servicios legales\n11 - Servicios estéticos',
    },
    {
      message: '¿Cuál es el *trabajo o trabajos* que realizas?',
    },
    {
      message: 'Envíanos una *foto de perfil* donde te veas bien! 😊 Esta será la imagen que los clientes verán, así que elige una que te represente.',
    },
    {
      message: '¿cuál es tu *correo electrónico*?',
    },
    {
      message: 'Envíanos *fotos* de los trabajos que has realizado, para que los clientes puedan tener referencias. Cuando finalices envía la palabra *Listo*.',
    },
    {
      message: 'Por favor, comparte tu *ubicación* actual',
    },
    {
      message: 'Para confirmar la actualización de tu cuenta, ingresa al siguiente enlace:',
    },
    {
      message: 'Tu información ha sido actualizada con éxito.',
    }
    ];
    const currentFlow = this.#currentFlowMessage[phone];
    const phoneUrlencoded = encodeURIComponent(phone);
    const updates: { category?: string, job?: string, email?:string, photo?: string, location?: string, workImages?: string[] } = {};
    const url = `${hostService}/api/security-password?id=${phoneUrlencoded}&option=update`;
    if (!currentFlow.awaitConfirm) {
      currentFlow.awaitConfirm = true;
      return flowUpdateAccount[0].message;
    }
    if (currentFlow.currentFlow === 0) {
      if (message === '1') {
        currentFlow.currentFlow = 1;
        return flowUpdateAccount[1].message;
      }
      if (message === '2') {
        currentFlow.currentFlow = 2;
        return flowUpdateAccount[2].message;
      }
      if (message === '3') {
        currentFlow.currentFlow = 3;
        return flowUpdateAccount[3].message;
      }
      if (message === '4') {
        currentFlow.currentFlow = 4;
        return flowUpdateAccount[4].message;
      }
      if (message === '5') {
        currentFlow.currentFlow = 5;
        return flowUpdateAccount[5].message;
      }
      if (message === '6') {
        currentFlow.currentFlow = 6;
        return flowUpdateAccount[6].message;
      }
      return 'Por favor, selecciona una opción válida.';
    }
    if (currentFlow.awaitConfirm) {
      let validationResult;
      if (currentFlow.currentFlow === 1) {
          const validator = { type: 'category' };
          validationResult = await validateMessageInput({ body: message } as Message, validator);
          if (validationResult) return validationResult;
          updates.category = message;
      }
      if (currentFlow.currentFlow === 2) {
          const validator = { type: 'text' };
          validationResult = await validateMessageInput({ body: message } as Message, validator);
          if (validationResult) return validationResult;
          updates.job = message;
      }
      if (currentFlow.currentFlow === 3) {
          const validator = { type: 'file' };
          validationResult = await validateMessageInput({ body: message } as Message, validator);
          if (validationResult) return validationResult;
          updates.photo = message;
      }
      if (currentFlow.currentFlow === 4) {
          const validator = { type: 'email' };
          validationResult = await validateMessageInput({ body: message } as Message, validator);
          if (validationResult) return validationResult;
          updates.email = message;
      }
      if (currentFlow.currentFlow === 5) {
          const validator = { type: 'location' };
          validationResult = await validateMessageInput({ body: message } as Message, validator);
          if (validationResult) return validationResult;
          updates.location = message;
      }
      if (currentFlow.currentFlow === 6) {
          const validator = { type: 'file_or_input' };
          validationResult = await validateMessageInput({ body: message } as Message, validator);
          if (validationResult) return validationResult;
          updates.workImages = message.split(','); 
      }
      try {
          await fetch(`${hostService}/api/security-password?id=${phoneUrlencoded}&option=update`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  id: phone,
                  updates,
              }),
          });
          flowUpdateAccount[7].message + `\n${url}`;
          
      } catch (error) {
          return `Error: No se pudo actualizar la cuenta. ${error}`;
      }
  }

  return 'Error: Algo salió mal. Por favor, intenta de nuevo.';
}

  deleteAccount(phone: string, message:string): string {
    if(!this.#currentFlowMessage[phone]){
      this.#currentFlowMessage[phone] = {
        currentFlow: 0,
        awaitConfirm: false,
        lastMessage: new Date(),
      }
    }
   const flowDeleteAccount = [
      {
        message: '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.\nSelecciona una opción:\n 1. Sí\n 2. No',
      },
      {
      message: 'Para confirmar la eliminación de tu cuenta, ingresa al siguiente enlace:',
      },
      {
        message: 'Tu cuenta ha sido eliminada con éxito. ¡Gracias por usar nuestros servicios!',
      },
      {
        message: 'Eliminación de cuenta cancelada.',
      }
   ];

    const currentFlow = this.#currentFlowMessage[phone];
    if (!currentFlow.awaitConfirm) {
        currentFlow.awaitConfirm = true;
        return flowDeleteAccount[0].message;
    }

    if (currentFlow.currentFlow === 0) {
      if (message === '1') {
        currentFlow.currentFlow = 1;
        const phoneUrlencoded = encodeURIComponent(phone);
        return flowDeleteAccount[1].message + `\n${hostService}/api/security-password?id=${phoneUrlencoded}&option=delete`;
      }  
      if (message === '2') {
        delete this.#currentFlowMessage[phone];
        delete this.#userStates[phone];
        return flowDeleteAccount[3].message;
      }
      return 'Por favor, selecciona una opción válida.';
  }

  if (currentFlow.currentFlow === 1 && currentFlow.awaitConfirm) {
    return 'Ingresa al enlace para confimar la accion';
  }

  return 'Error: Algo salió mal. Por favor, intenta de nuevo.';
}

  expireDeleteAccount(phone: string): Date {
    return this.#currentFlowMessage[phone].lastMessage;
  }

  confirmDeleteAccount(phone: string): boolean {
    return this.#currentFlowMessage[phone] && this.#currentFlowMessage[phone].awaitConfirm;
  }
}



const chatBot = new ChatBot();
export default chatBot;