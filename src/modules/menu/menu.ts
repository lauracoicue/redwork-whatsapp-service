type Module = 'profile' | 'reports' | 'password' | 'deleteAccount' | null;

interface UserState {
  currentFlow: Module;
}

class ChatBot {
  #mainMenuOptions: string[] = [
    'Actualizar perfil',
    'Reportes',
    'Cambiar contraseña',
    'Eliminar cuenta',
  ];


  #userStates: { [phone: string]: UserState };

  constructor() {
    this.#userStates = {};
  }

 
  handleMessage(phone: string, message: string): string {
   
    if (!(phone in this.#userStates)) {
      this.#userStates[phone] = { currentFlow: null };
      return this.#showMainMenu();
    }

    const userState = this.#userStates[phone];
    console.log(userState);

    if (!userState.currentFlow) {
        
        const optionIndex = parseInt(message);
        if (isNaN(optionIndex)) {
            return 'Opción inválida. Por favor, selecciona una opción válida.';
        }
        return this.selectOption(phone, optionIndex);
    } else {
      return this.#redirectToModule(phone, message);
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

  selectOption(phone: string, optionIndex: number): string {
    const userState = this.#userStates[phone];
    if (!userState) {
      return 'Error: Usuario no encontrado. Por favor, inicia desde el menú principal.';
    }

    if (optionIndex < 1 || optionIndex > this.#mainMenuOptions.length) {
      return 'Opción inválida. Por favor, selecciona una opción válida.';
    }

    const moduleMapping: Module[] = ['profile', 'reports', 'password', 'deleteAccount'];
    userState.currentFlow = moduleMapping[optionIndex - 1];
    return `Redirigiendo al módulo: ${this.#mainMenuOptions[optionIndex - 1]}`;
  }

  #redirectToModule(phone: string, message: string): string {
    const userState = this.#userStates[phone];

    switch (userState.currentFlow) {
      case 'profile': 
        return `Manejando el módulo de perfil para el usuario ${phone}. Recibido: ${message}`;
      case 'reports':
        return `Manejando el módulo de reportes para el usuario ${phone}. Recibido: ${message}`;
      case 'password':
        return `Manejando el módulo de cambio de contraseña para el usuario ${phone}. Recibido: ${message}`;
      case 'deleteAccount':
        return `Manejando el módulo de eliminación de cuenta para el usuario ${phone}. Recibido: ${message}`;
      default:
        userState.currentFlow = null;
        return 'Algo salió mal. Volviendo al menú principal.';
    }
  }

  reset(phone: string): string {
    if (!(phone in this.#userStates)) {
      return 'No se encontró el estado del usuario. Por favor, inicia desde el menú principal.';
    }

    this.#userStates[phone].currentFlow = null;
    return 'Volviendo al menú principal.';
  }
}


const chatBot = new ChatBot();
export default chatBot;