class WhatsappServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WhatsappServiceError';
  }
}

export default WhatsappServiceError;