import { Message } from "whatsapp-web.js";
import { hostBackend, hostService } from "../../config/config";

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
        return `Manejando el módulo de perfil para el usuario ${phone}. Recibido: ${message}`;
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