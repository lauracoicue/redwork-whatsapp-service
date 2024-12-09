import { Convert, Validator } from '../../../models/flows';
import { Message } from "whatsapp-web.js";
import { validateCategory } from './categoryValidator';

export const  validateMessageInput = async (userMessage: Message, validator: Validator | undefined): Promise<string | undefined> => {
   
    if (!validator){
      return;
    }
   
    switch (validator.type){
      case 'text':
        const message = userMessage.body;
        if (!userMessage.body) {
          return 'Debes ingresar un texto';
        }

         if (message.length < validator.min_length!){
            return `Debes ingresar al menos ${validator.min_length} caracteres`;
         }
        return;
      case 'email':
        const email = userMessage.body;
        const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!regex.test(email)){
          return `El email no es valido`;
        }

        return;
      case 'file':
        if (!userMessage.hasMedia){
          return 'Debes enviar un archivo';
        }

        const media = await userMessage.downloadMedia();
        if (!validator.allowed_types!.includes(media.mimetype)){
          return `El archivo debe ser de alguno de los siguientes tipos: ${validator.allowed_types}`;
        }
        return;
      case 'file_or_input':
        if (!userMessage.hasMedia && userMessage.body.toLowerCase() !== 'listo'){
          return 'Debes enviar una foto o escribir "listo"';
        }
        if (userMessage.hasMedia) {
        const fileMedia = await userMessage.downloadMedia();
        if (!validator.allowed_types!.includes(fileMedia.mimetype)){
          return `El archivo debe ser de alguno de los siguientes tipos: ${validator.allowed_types}`;
          }
        }
        return;
      case 'password':
        const password = userMessage.body;
        if (!password){
          return 'Debes ingresar una contraseña';
        }

        if (password.length < validator.min_length!){
          return `La contraseña debe tener al menos ${validator.min_length} caracteres`;
        }

        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

        if (!regexPassword.test(password)){
          return 'La contraseña debe tener al menos una letra mayuscula, una letra minuscula y un numero';
        }

        return;

      case 'location':
        if (!userMessage.location){
          return 'Debes enviar una ubicación';
        }
        return;
      
      case 'category':
        const selectedCategory = userMessage.body.trim();
        const validationError = validateCategory(selectedCategory);
        if (validationError) {
          return validationError;
        }
        return;

      default:
        return 'Tipo de dato no soportado';
    }
  }


export default validateMessageInput;