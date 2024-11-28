export const validCategories: string[] = [
    "Construcción",
    "Mantenimiento de vehículos",
    "Arte y diseño",
    "Salud y bienestar",
    "Educación",
    "Servicios de transporte",
    "Servicios del hogar",
    "Servicios tecnológicos",
    "Servicios administrativos",
    "Servicios legales",
    "Servicios estéticos",
  ];
  
  export const validateCategory = (categoryInput: string): string | undefined => {
    const selectedIndex = parseInt(categoryInput.trim(), 10);
  
    if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > validCategories.length) {
      return `Por favor, selecciona un número válido entre 1 y ${validCategories.length}`;
    }
  
    return undefined;
  };
  